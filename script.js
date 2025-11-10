function analisiAffitto(){
    const get=v=>parseFloat(document.getElementById(v).value)||0;
    const nome=document.getElementById("nome").value;
    const localita=document.getElementById("localita").value;
    const mq=get("mq"), camere=get("camere"), bagni=get("bagni"), posti_letto=get("posti_letto");
    const prezzo_acquisto=get("prezzo_acquisto"), costo_ristr=get("costo_ristrutturazione");
    const adr=get("adr"), occup=(get("occupazione")/100), costi_mensili=get("costi_mensili");

    const ricavo = adr * 365 * occup;
    const costi_annui = costi_mensili * 12;
    const utile = ricavo - costi_annui;
    const investimento = prezzo_acquisto + costo_ristr;
    const roi = investimento ? (utile / investimento) * 100 : 0;
    const pay = utile ? investimento / utile : null;

    let valut = "Redditività bassa";
    if(roi > 15) valut = "Alta redditività";
    else if(roi > 8) valut = "Redditività media";

    // Formattazione italiana dei numeri
    const formatEuro = n => n.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    const formatPercent = n => n.toFixed(2) + "%";

    document.getElementById("risultati").innerHTML = `
        <h2>Risultati</h2>
        <p><strong>🏠 Struttura:</strong> ${nome} (${localita})</p>
        <p><strong>📏 Dati:</strong> ${mq} mq | Camere: ${camere} | Bagni: ${bagni} | Posti letto: ${posti_letto}</p>
        <p><strong>💶 Ricavo annuo:</strong> €${formatEuro(ricavo)}</p>
        <p><strong>💰 Costi annui:</strong> €${formatEuro(costi_annui)}</p>
        <p><strong>📈 Utile netto:</strong> €${formatEuro(utile)}</p>
        <p><strong>📊 ROI:</strong> ${formatPercent(roi)}</p>
        <p><strong>⏳ Payback:</strong> ${pay ? formatEuro(pay) + ' anni' : 'N/A'}</p>
        <h3>${valut}</h3>`;
}