/* ---------- helper formatting ---------- */
const fmtEuro = n => (isFinite(n) ? n.toLocaleString('it-IT', {minimumFractionDigits:2, maximumFractionDigits:2}) : 'N/A');
const fmtPct = n => (isFinite(n) ? n.toFixed(2) + '%' : 'N/A');

/* ---------- IRR solver (Newton + fallback) ---------- */
function irr(values, guess = 0.1) {
  const maxIter = 1000, tol = 1e-7;
  let rate = guess;
  function npv(r) { return values.reduce((s, v, i) => s + v / Math.pow(1 + r, i), 0); }
  function dnpv(r) { return values.reduce((s, v, i) => s - i * v / Math.pow(1 + r, i + 1), 0); }
  for (let i = 0; i < maxIter; i++) {
    const f = npv(rate);
    const df = dnpv(rate);
    if (Math.abs(f) < tol) return rate;
    if (df === 0) break;
    const newRate = rate - f / df;
    if (!isFinite(newRate)) break;
    rate = newRate;
  }
  // fallback binary scan
  let low = -0.9999, high = 1.0;
  let flowLow = values.reduce((s, v, i) => s + v / Math.pow(1 + low, i), 0);
  for (let j = 0; j < 200; j++) {
    const mid = (low + high) / 2;
    const fmid = values.reduce((s, v, i) => s + v / Math.pow(1 + mid, i), 0);
    if (Math.abs(fmid) < tol) return mid;
    if (flowLow * fmid <= 0) { high = mid; } else { low = mid; flowLow = fmid; }
  }
  return NaN;
}

/* ---------- main analysis ---------- */
function analisiAffitto(){
  console.log('analisiAffitto invoked');
  const get = id => parseFloat(document.getElementById(id).value) || 0;
  const nome = document.getElementById('nome').value || '—';
  const localita = document.getElementById('localita').value || '—';

  const superficie_mq = get('superficie_mq');
  const camere = get('camere');
  const bagni = get('bagni');
  const posti_letto = get('posti_letto');

  const prezzo_acquisto = get('prezzo_acquisto');
  const costo_ristrutturazione = get('costo_ristrutturazione');
  const investimento_totale = prezzo_acquisto + costo_ristrutturazione;

  const adr = get('adr');
  const occupazione_pct = get('occupazione');
  const occupazione = Math.min(Math.max(occupazione_pct / 100, 0), 1);
  const costi_gestione_mensili = get('costi_gestione_mensili');
  const costi_annui = costi_gestione_mensili * 12;

  // Ricavi e utili
  const ricavo_lordo_annuo = adr * 365 * occupazione;
  const utile_operativo = ricavo_lordo_annuo - costi_annui; // EBITDA

  // Redditività
  const roi = investimento_totale > 0 ? (utile_operativo / investimento_totale) * 100 : NaN;
  const capitale_proprio = get('capitale_proprio') || (investimento_totale - get('importo_mutuo')) || 0;
  const roe = capitale_proprio > 0 ? (utile_operativo / capitale_proprio) * 100 : NaN;

  // Finanza
  const importo_mutuo = get('importo_mutuo');
  const tasso_interesse = get('tasso_interesse') / 100; // annuale
  const durata_mutuo = Math.max(1, get('durata_mutuo'));
  const rate_month = tasso_interesse / 12;
  const n_months = durata_mutuo * 12;
  let rata_mutuo = 0;
  if (importo_mutuo > 0 && rate_month > 0) {
    rata_mutuo = importo_mutuo * rate_month / (1 - Math.pow(1 + rate_month, -n_months));
  } else if (importo_mutuo > 0) {
    rata_mutuo = importo_mutuo / n_months;
  }
  const dscr = (rata_mutuo > 0) ? (utile_operativo / (rata_mutuo * 12)) : NaN;
  const leverage = capitale_proprio > 0 ? (investimento_totale / capitale_proprio) : NaN;

  // IRR (10 anni)
  const years = 10;
  const cashflows = [-investimento_totale];
  for (let i = 0; i < years; i++) cashflows.push(utile_operativo);
  const irr_val = irr(cashflows);
  const irr_pct = isFinite(irr_val) ? irr_val * 100 : NaN;

  // Break-even
  const break_even_occupazione = (adr * 365) > 0 ? (costi_annui / (adr * 365)) : NaN;
  const break_even_giorni = isFinite(break_even_occupazione) ? Math.ceil(break_even_occupazione * 365) : NaN;

  // Scenari
  function calcScenario(name, deltaAdr, deltaOcc){
    const adr_mod = adr * (1 + deltaAdr);
    const occ_mod = Math.min(1, Math.max(0, occupazione * (1 + deltaOcc)));
    const ric = adr_mod * 365 * occ_mod;
    const ebitda = ric - costi_annui;
    const roi_s = investimento_totale > 0 ? (ebitda / investimento_totale) * 100 : NaN;
    const cfs = [-investimento_totale];
    for (let i=0;i<years;i++) cfs.push(ebitda);
    const irr_s = irr(cfs);
    return { nome: name, adr: adr_mod, occupazione: occ_mod, ricavo: ric, ebitda: ebitda, roi: roi_s, irr: isFinite(irr_s)? irr_s*100: NaN };
  }
  const scenari = [
    calcScenario('Ottimistico', 0.10, 0.10),
    calcScenario('Realistico', 0.00, 0.00),
    calcScenario('Pessimistico', -0.10, -0.15)
  ];

  // Output object
  const out = {
    nome, localita,
    analisi: {
      ricavo_lordo: ricavo_lordo_annuo,
      costi_annui: costi_annui,
      ebitda: utile_operativo,
      roi: roi,
      roe: roe,
      irr: irr_pct,
      break_even_occupazione: break_even_occupazione
    },
    finanza: {
      rata_mutuo: rata_mutuo,
      dscr: dscr,
      leverage: leverage
    },
    scenari: scenari,
    note: ''
  };

  // Render results
  const el = document.getElementById('risultati');
  el.innerHTML = `
    <strong>🏠 Struttura:</strong> ${nome} (${localita})<br>
    <strong>💶 Ricavo lordo annuo:</strong> €${fmtEuro(ricavo_lordo_annuo)}<br>
    <strong>💰 Costi annui:</strong> €${fmtEuro(costi_annui)}<br>
    <strong>📈 EBITDA (utile operativo):</strong> €${fmtEuro(utile_operativo)}<br>
    <strong>📊 ROI:</strong> ${fmtPct(roi)} &nbsp; | &nbsp; <strong>ROE:</strong> ${fmtPct(roe)}<br>
    <strong>💵 Rata mutuo (mensile):</strong> €${fmtEuro(rata_mutuo)} &nbsp; | &nbsp; <strong>DSCR:</strong> ${isFinite(dscr)? dscr.toFixed(2): 'N/A'}<br>
    <strong>🔧 Leverage:</strong> ${isFinite(leverage)? leverage.toFixed(2)+'x':'N/A'}<br>
    <strong>📈 IRR (${years} anni):</strong> ${fmtPct(irr_pct)}<br>
    <strong>⚖️ Break-even occupazione:</strong> ${isFinite(break_even_occupazione)? (break_even_occupazione*100).toFixed(1)+'%':''} (${isFinite(break_even_giorni)? break_even_giorni+' giorni/anno':''})
    <hr>
    <strong>📊 Scenari sintetici:</strong><br>
    ${scenari.map(s=>`<div style="margin-top:6px"><em>${s.nome}</em> — ROI: ${fmtPct(s.roi)} | IRR: ${fmtPct(s.irr)}</div>`).join('')}
  `;

  // store json
  window.__lastAnalysis = out;
  document.getElementById('jsonOut').textContent = JSON.stringify(out, null, 2);
  document.getElementById('jsonArea').style.display = 'none';
}

/* ---------- attach listeners safely ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnCalc');
  const btnJ = document.getElementById('btnJSON');
  const btnC = document.getElementById('btnCopy');
  btn.addEventListener('click', analisiAffitto);
  btnJ.addEventListener('click', () => {
    if(!window.__lastAnalysis) analisiAffitto();
    document.getElementById('jsonOut').textContent = JSON.stringify(window.__lastAnalysis, null, 2);
    document.getElementById('jsonArea').style.display = 'block';
  });
  btnC.addEventListener('click', () => {
    if(!window.__lastAnalysis) analisiAffitto();
    const txt = JSON.stringify(window.__lastAnalysis, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(()=> alert('JSON copiato negli appunti'), ()=> alert('Copia non supportata'));
    } else {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); alert('JSON copiato'); } catch(e){ alert('Copia non supportata'); }
      ta.remove();
    }
  });
});