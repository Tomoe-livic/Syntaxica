// Syntaxica — logica dell'app. I dati stanno in data/*.js.
const dati = [...DATI_HTML, ...DATI_CSS, ...DATI_JS, ...AGGIUNTE.nuove];
const ha = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
dati.forEach((v) => {
  if (ha(AGGIUNTE.ritocchi, v.nome)) Object.assign(v, AGGIUNTE.ritocchi[v.nome]);
  if (ha(AGGIUNTE.valori, v.nome)) v.valori = AGGIUNTE.valori[v.nome];
});

function normalizza(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cerca(query, lista) {
  const q = normalizza(query.trim());
  if (!q) return lista;
  return lista.filter((voce) => {
    const inNome = normalizza(voce.nome).includes(q);
    const inDescrizione = normalizza(voce.descrizione).includes(q);
    const inSinonimi = voce.sinonimi.some((s) => normalizza(s).includes(q));
    const inValori = (voce.valori || []).some(([n, d]) => normalizza(n).includes(q) || normalizza(d).includes(q));
    return inNome || inDescrizione || inSinonimi || inValori;
  });
}

let categoriaAttiva = null;
let modalitaCronologia = false;

function elencoFiltrato() {
  let base = modalitaPreferiti ? dati.filter((v) => preferito(v.nome)) : dati;
  if (categoriaAttiva) base = base.filter((v) => v.categoria === categoriaAttiva);
  return cerca(input.value, base);
}

// ---------------- Cronologia (per-dispositivo, via localStorage) ----------------
const CHIAVE_CRONOLOGIA = "sintassiwada_cronologia";

function caricaCronologia() {
  try {
    const salvata = localStorage.getItem(CHIAVE_CRONOLOGIA);
    return salvata ? JSON.parse(salvata) : [];
  } catch (e) {
    return [];
  }
}

function salvaCronologia(lista) {
  try {
    localStorage.setItem(CHIAVE_CRONOLOGIA, JSON.stringify(lista));
  } catch (e) { /* storage non disponibile: proseguiamo senza persistenza */ }
}

function aggiungiACronologia(nome) {
  let lista = caricaCronologia().filter((n) => n !== nome);
  lista.unshift(nome);
  lista = lista.slice(0, 10);
  salvaCronologia(lista);
  renderCronologia();
}

function renderCronologia() {
  const lista = caricaCronologia();
  const wrap = document.getElementById("cronologia-wrap");
  if (lista.length === 0) {
    wrap.innerHTML = "";
    return;
  }
  wrap.innerHTML = `
    <div class="cronologia-top">
      <button class="cronologia-titolo" id="cronologia-titolo-btn">Cronologia</button>
      <button class="cronologia-clear" id="cronologia-clear-btn">cancella</button>
    </div>
    <div class="cronologia-lista">
      ${lista.map((n) => `<button class="chip" data-nome="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join("")}
    </div>
  `;
  document.getElementById("cronologia-clear-btn").addEventListener("click", () => {
    salvaCronologia([]);
    renderCronologia();
  });
  document.getElementById("cronologia-titolo-btn").addEventListener("click", () => {
    categoriaAttiva = null;
    catBtns.forEach((b) => b.classList.remove("attivo"));
    input.value = "";
    if (modalitaCronologia) {
      modalitaCronologia = false;
      mostraRisultati(elencoFiltrato());
    } else {
      modalitaCronologia = true;
      const voci = lista.map((n) => trovaPerNome(n)).filter(Boolean);
      mostraRisultati(voci);
    }
  });
  wrap.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      modalitaCronologia = false;
      categoriaAttiva = null;
      catBtns.forEach((b) => b.classList.remove("attivo"));
      input.value = chip.dataset.nome;
      mostraRisultati(elencoFiltrato());
    });
  });
}

function trovaPerNome(nome) {
  return dati.find((v) => v.nome === nome);
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function valoriHtml(voce) {
  if (!voce.valori || !voce.valori.length) return "";
  const q = normalizza(document.getElementById("search").value.trim());
  const riga = ([n, d]) => `<div${q.length > 1 && normalizza(n).includes(q) ? ' class="evid"' : ""}><dt>${escapeHtml(n)}</dt><dd>${escapeHtml(d)}</dd></div>`;
  return `<dl class="valori">${voce.valori.map(riga).join("")}</dl>`;
}

function cardHtml(voce, { principale = false, compatta = false } = {}) {
  const mostraDemo = !compatta && voce.demo;
  const etichettaBtn = voce.demo === "console" ? "▶ Esegui" : "👁 Anteprima";
  return `
    <div class="card${principale ? " focus-principale" : ""}" data-nome="${escapeHtml(voce.nome)}">
      <div class="card-top">
        <span class="nome">${escapeHtml(voce.nome)}</span>
        <span class="card-dx"><span class="badge">${escapeHtml(voce.categoria)}</span><button class="star${preferito(voce.nome) ? " on" : ""}" type="button" data-nome="${escapeHtml(voce.nome)}" aria-pressed="${preferito(voce.nome)}" aria-label="Preferito: ${escapeHtml(voce.nome)}">${preferito(voce.nome) ? "★" : "☆"}</button></span>
      </div>
      <p class="descrizione">${escapeHtml(voce.descrizione)}</p>
      ${compatta ? "" : valoriHtml(voce)}
      ${!compatta && voce.snippet ? `<pre><code>${escapeHtml(voce.snippet)}</code></pre>` : ""}
      ${mostraDemo ? `<button class="demo-btn" type="button">${etichettaBtn}</button><div class="demo-panel"></div>` : ""}
      ${compatta ? "" : usataInHtml(voce)}
    </div>
  `;
}

const REPO_ISSUE = "https://github.com/Tomoe-livic/Syntaxica/issues/new";
function urlSegnalazione(q) {
  const t = q.slice(0, 80);
  const titolo = "Voce mancante: " + t;
  const testo = "Ho cercato «" + t + "» in Syntaxica e non l'ho trovata.\n\nCosa stavo cercando di capire? (facoltativo)\n";
  return REPO_ISSUE + "?title=" + encodeURIComponent(titolo) + "&body=" + encodeURIComponent(testo);
}
function nessunRisultato() {
  const q = document.getElementById("search").value.trim();
  if (!q) return `<p class="empty">Nessun risultato in questa categoria.</p>`;
  return `<div class="nessuno"><p class="nessuno-titolo">Nessun risultato per «${escapeHtml(q)}»</p>
    <p>Questa voce non c'è (ancora): Syntaxica è una guida scelta, non un'enciclopedia. Prova con un altro termine, oppure cercala su MDN.</p>
    <a class="brief-azione mdn" href="https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(q)}" target="_blank" rel="noopener noreferrer">Cerca «${escapeHtml(q)}» su MDN ↗</a>
    <p class="nessuno-segnala">Vuoi che la aggiunga? <a class="mdn" href="${urlSegnalazione(q)}" target="_blank" rel="noopener noreferrer">Segnala la voce mancante su GitHub ↗</a><br><small>Serve un account GitHub gratuito.</small></p></div>`;
}

let mostraTutte = false;
function inHome() { return !document.getElementById("search").value.trim() && !categoriaAttiva && !modalitaPreferiti && !mostraTutte; }
function homeHtml() {
  const n = (c) => dati.filter((v) => v.categoria === c).length;
  const info = [["HTML", "html", "Struttura e contenuti della pagina"], ["CSS", "css", "Aspetto, colori e layout"], ["JS", "js", "Comportamento e logica"]];
  const inizio = ["let", "function", "querySelector()", "addEventListener()", "Flexbox (display: flex)", "div"].filter((x) => trovaPerNome(x));
  return `<p class="home-titolo">Esplora per linguaggio</p>` +
    info.map(([c, k, d]) => `<button class="tile ${k}" type="button" data-home-cat="${c}"><b>${c} · ${n(c)} voci</b><span>${d}</span></button>`).join("") +
    `<p class="home-titolo">Per iniziare</p><div class="home-chips">${inizio.map((x) => `<button class="chip" type="button" data-home-voce="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join("")}</div>` +
    `<button class="brief-azione home-tutte" type="button" data-home-tutte="1">Mostra tutte le ${dati.length} voci</button>` +
    `<p class="nota-scopo">Syntaxica è una guida scelta per chi impara, non un'enciclopedia: copre il programma del corso e gli approfondimenti più comuni. Per tutto il resto c'è <a href="https://developer.mozilla.org/" target="_blank" rel="noopener noreferrer">MDN Web Docs ↗</a>.</p>`;
}
function mostraRisultati(risultati) {
  const container = document.getElementById("results");
  const count = document.getElementById("count");
  if (inHome()) { count.textContent = ""; container.innerHTML = homeHtml(); return; }
  count.textContent = risultati.length
    ? `${risultati.length} risultat${risultati.length === 1 ? "o" : "i"}`
    : "";

  if (risultati.length === 0) {
    container.innerHTML = modalitaPreferiti && !preferiti.length
      ? `<p class="empty">Nessun preferito ancora. Tocca la ☆ su una voce per aggiungerla.</p>`
      : nessunRisultato();
    return;
  }

  container.innerHTML = risultati.map((voce) => cardHtml(voce)).join("");
}

function mostraCombinazione(nomeVoce) {
  const voce = trovaPerNome(nomeVoce);
  if (!voce) return;

  aggiungiACronologia(voce.nome);

  const container = document.getElementById("results");
  const count = document.getElementById("count");
  count.textContent = "";

  const correlate = (voce.correlati || [])
    .map((n) => trovaPerNome(n))
    .filter(Boolean);

  const correlateHtml = correlate.length
    ? `<p class="correlati-titolo">Si usa spesso insieme a:</p>` + correlate.map((c) => cardHtml(c, { compatta: true })).join("")
    : `<p class="correlati-titolo">Nessuna combinazione segnalata per ora.</p>`;

  container.innerHTML = `
    <button class="back-link" id="back-btn">← Torna alla ricerca</button>
    ${cardHtml(voce, { principale: true })}
    ${correlateHtml}
  `;

  document.getElementById("back-btn").addEventListener("click", () => {
    modalitaCronologia = false;
    input.value = "";
    mostraRisultati(elencoFiltrato());
  });
}

// ---------------- Esecuzione sandbox (console) e anteprima visiva ----------------
const STILE_DEMO_BASE = `<style>
  *{box-sizing:border-box;}
  body{margin:0;font-family:-apple-system,sans-serif;background:#11131a;color:#e6e8f0;padding:16px;}
  input,select,textarea,button{background:#1a1d29;color:#e6e8f0;border:1px solid #2b2f42;border-radius:6px;padding:6px 8px;font-family:inherit;}
  label{display:block;margin:8px 0 4px;font-size:0.85rem;}
  table{border-collapse:collapse;width:100%;}
  th,td{border:1px solid #2b2f42;padding:6px 10px;text-align:left;}
  fieldset{border:1px solid #2b2f42;border-radius:8px;}
  legend{padding:0 6px;color:#8b90a8;font-size:0.8rem;}
</style>`;

function eseguiConsole(codice, panel, fixture) {
  panel.innerHTML = `<div class="console-hint">In esecuzione…</div>`;

  const iframe = document.createElement("iframe");
  iframe.sandbox = "allow-scripts";
  iframe.style.display = "none";
  iframe.srcdoc = `${fixture || ""}<script>
    function invia(tipo, args) {
      let testo;
      try {
        testo = args.map(a => (typeof a === "object" && a !== null) ? JSON.stringify(a) : String(a)).join(" ");
      } catch (e) { testo = String(args); }
      parent.postMessage({ sintassiwadaDemo: true, tipo: tipo, testo: testo }, "*");
    }
    console.log = function(...a) { invia("log", a); };
    console.error = function(...a) { invia("error", a); };
    window.onerror = function(msg) { invia("error", [String(msg)]); return true; };
    try {
      ${codice}
    } catch (e) {
      invia("error", [e.message]);
    }
  <\/script>`;

  let primaRiga = true;
  function onMessage(e) {
    if (e.source !== iframe.contentWindow || !e.data || !e.data.sintassiwadaDemo) return;
    if (primaRiga) { panel.innerHTML = ""; primaRiga = false; }
    const linea = document.createElement("div");
    linea.className = "console-line" + (e.data.tipo === "error" ? " console-error" : "");
    linea.textContent = (e.data.tipo === "error" ? "✕ " : "› ") + e.data.testo;
    panel.appendChild(linea);
  }
  window.addEventListener("message", onMessage);
  document.body.appendChild(iframe);

  setTimeout(() => {
    if (primaRiga) panel.innerHTML = `<div class="console-hint">(nessun output)</div>`;
    window.removeEventListener("message", onMessage);
    iframe.remove();
  }, 2000);
}

function mostraAnteprima(html, panel) {
  const iframe = document.createElement("iframe");
  iframe.sandbox = "";
  iframe.className = "anteprima-frame";
  iframe.srcdoc = STILE_DEMO_BASE + html;
  panel.innerHTML = "";
  panel.appendChild(iframe);
}

function toggleDemo(btn) {
  const card = btn.closest(".card");
  const panel = card.querySelector(".demo-panel");
  const voce = trovaPerNome(card.dataset.nome);
  if (!voce) return;

  const aperto = panel.classList.contains("aperto");
  if (aperto) {
    panel.classList.remove("aperto");
    panel.innerHTML = "";
    btn.textContent = voce.demo === "console" ? "▶ Esegui" : "👁 Anteprima";
    return;
  }

  panel.classList.add("aperto");
  btn.textContent = "✕ Chiudi";

  if (voce.demo === "console") {
    eseguiConsole(voce.snippet, panel, voce.domFixture);
  } else if (voce.demo === "anteprima") {
    mostraAnteprima(voce.demoHtml || voce.snippet, panel);
  }
}

const input = document.getElementById("search");
const results = document.getElementById("results");
const catBtns = document.querySelectorAll(".cat-btn");

input.addEventListener("input", () => {
  chiudiViste();
  modalitaCronologia = false;
  mostraRisultati(elencoFiltrato());
});

results.addEventListener("click", (e) => {
  const usata = e.target.closest(".usata-btn");
  if (usata) {
    apriProgetto(usata.dataset.id, usata.dataset.voce);
    return;
  }
  const stella = e.target.closest(".star");
  if (stella) {
    togglePreferito(stella.dataset.nome);
    return;
  }
  const demoBtn = e.target.closest(".demo-btn");
  if (demoBtn) {
    toggleDemo(demoBtn);
    return;
  }
  const card = e.target.closest(".card");
  if (!card || card.classList.contains("focus-principale")) return;
  modalitaCronologia = false;
  mostraCombinazione(card.dataset.nome);
});

catBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    chiudiViste();
    modalitaCronologia = false;
    const cat = btn.dataset.cat;
    categoriaAttiva = categoriaAttiva === cat ? null : cat;
    catBtns.forEach((b) => b.classList.toggle("attivo", b.dataset.cat === categoriaAttiva));
    mostraRisultati(elencoFiltrato());
  });
});

// ---------------- Preferiti (per-dispositivo via localStorage) ----------------
const CHIAVE_PREF = "sintassiwada_preferiti";
function caricaPref() {
  try {
    const s = localStorage.getItem(CHIAVE_PREF);
    const v = s ? JSON.parse(s) : [];
    return Array.isArray(v) ? v : [];
  } catch (e) { return []; }
}
let preferiti = caricaPref();
let modalitaPreferiti = false;
function preferito(nome) { return preferiti.includes(nome); }
function togglePreferito(nome) {
  preferiti = preferito(nome) ? preferiti.filter((n) => n !== nome) : [...preferiti, nome];
  try { localStorage.setItem(CHIAVE_PREF, JSON.stringify(preferiti)); } catch (e) {}
  document.querySelectorAll(".star").forEach((s) => {
    if (s.dataset.nome !== nome) return;
    s.classList.toggle("on", preferito(nome));
    s.textContent = preferito(nome) ? "★" : "☆";
    s.setAttribute("aria-pressed", preferito(nome));
  });
  if (modalitaPreferiti && !briefAperto && !document.querySelector(".focus-principale")) mostraRisultati(elencoFiltrato());
  if (briefAperto) renderBrief();
}
document.getElementById("pref-btn").addEventListener("click", () => {
  chiudiViste();
  modalitaPreferiti = !modalitaPreferiti;
  modalitaCronologia = false;
  document.getElementById("pref-btn").classList.toggle("attivo", modalitaPreferiti);
  document.getElementById("hint").hidden = modalitaPreferiti;
  mostraRisultati(elencoFiltrato());
  window.scrollTo(0, 0);
});

// ---------------- Zoom dei campi di testo (allarga la textarea con transizione) ----------------
const zoomAttivi = new Set();
function zClass(id, extra) { return "zoomable" + (extra ? " " + extra : "") + (zoomAttivi.has(id) ? " esteso" : ""); }
function zoomRiga(etichetta, idCampo, conLabel) {
  const on = zoomAttivi.has(idCampo);
  return `<div class="zoom-riga">${conLabel ? `<label class="brief-label" for="${idCampo}">${etichetta}</label>` : `<span class="brief-label">${etichetta}</span>`}<button type="button" class="zoom-btn" data-az="zoom" data-t="${idCampo}" aria-pressed="${on}" aria-label="${on ? "Riduci" : "Ingrandisci"} il campo ${etichetta}">${on ? "⤡ Riduci" : "⤢ Ingrandisci"}</button></div>`;
}
function toggleZoom(btn) {
  const id = btn.dataset.t, campo = document.getElementById(id);
  if (!campo) return;
  const on = !zoomAttivi.has(id);
  if (on) zoomAttivi.add(id); else zoomAttivi.delete(id);
  campo.classList.toggle("esteso", on);
  btn.setAttribute("aria-pressed", on);
  btn.textContent = on ? "⤡ Riduci" : "⤢ Ingrandisci";
  btn.setAttribute("aria-label", (on ? "Riduci" : "Ingrandisci") + " il campo");
}

// ---------------- Brief (appunti di progetto, per-dispositivo via localStorage) ----------------
const CHIAVE_BRIEF = "sintassiwada_brief";
function caricaBrief() {
  try {
    const s = localStorage.getItem(CHIAVE_BRIEF);
    const v = s ? JSON.parse(s) : [];
    return Array.isArray(v) ? v : [];
  } catch (e) { return []; }
}
function salvaBrief() {
  try { localStorage.setItem(CHIAVE_BRIEF, JSON.stringify(briefs)); } catch (e) {}
}
let briefs = caricaBrief();
let briefAttivo = null;
let briefAperto = false;
let confermaElimina = false;
const briefView = document.getElementById("brief-view");
function briefCorrente() { return briefs.find((x) => x.id === briefAttivo); }

function vistaBrief(on) {
  if (on && progettiAperto) vistaProgetti(false);
  briefAperto = on;
  ["cronologia-wrap", "hint", "count", "results"].forEach((id) => { document.getElementById(id).hidden = on || (id === "hint" && modalitaPreferiti); });
  briefView.hidden = !on;
  document.getElementById("brief-btn").classList.toggle("attivo", on);
  if (on) renderBrief();
}

function renderBrief() {
  const b = briefCorrente();
  if (!b) {
    briefView.innerHTML = `<div class="brief-top"><h2>Brief</h2><button class="brief-azione" data-az="nuovo">+ Nuovo brief</button></div>` +
      (briefs.length
        ? briefs.map((x) => `<div class="brief-card" data-az="apri" data-id="${x.id}"><b>${escapeHtml(x.titolo || "Senza titolo")}</b><span>${x.todo.filter((t) => t.fatto).length}/${x.todo.length} cose fatte · ${x.elementi.length} elementi</span></div>`).join("")
        : `<p class="hint">Qui appunti obiettivo, cose da fare ed elementi della libreria che ti servono per un progetto.</p>`);
    return;
  }
  briefView.innerHTML = `
    <div class="brief-top"><button class="brief-azione" data-az="indietro">← Tutti i brief</button>
      <button class="brief-azione brief-elimina" data-az="elimina">${confermaElimina ? "Sicuro? Elimina" : "Elimina"}</button></div>
    <input class="brief-input" id="b-titolo" placeholder="Titolo del progetto" value="${escapeHtml(b.titolo)}">
    <label class="brief-label" for="b-obiettivo">Obiettivo</label>
    <textarea class="brief-input" id="b-obiettivo" rows="3" placeholder="Cosa vuoi ottenere?">${escapeHtml(b.obiettivo)}</textarea>
    <span class="brief-label">Cose da fare</span>
    ${b.todo.map((t, i) => `<div class="todo${t.fatto ? " fatto" : ""}"><input type="checkbox" data-az="spunta" data-i="${i}" ${t.fatto ? "checked" : ""} aria-label="Fatto"><span>${escapeHtml(t.testo)}</span><button class="x-btn" data-az="togli-todo" data-i="${i}" aria-label="Rimuovi">×</button></div>`).join("")}
    <div class="brief-riga"><input class="brief-input" id="b-nuovo-todo" placeholder="Aggiungi una cosa da fare"><button class="brief-azione" data-az="aggiungi-todo">Aggiungi</button></div>
    <span class="brief-label">Elementi da studiare</span>
    <div class="brief-chips">${b.elementi.map((n, i) => `<span class="chip-wrap"><button class="chip" data-az="apri-elemento" data-nome="${escapeHtml(n)}">${escapeHtml(n)}</button><button class="x-btn" data-az="togli-elemento" data-i="${i}" aria-label="Rimuovi ${escapeHtml(n)}">×</button></span>`).join("") || `<span class="hint">Nessuno ancora.</span>`}</div>
    <span class="brief-label">Dai preferiti</span>
    <div class="brief-chips">${preferiti.filter((n) => trovaPerNome(n) && !b.elementi.includes(n)).map((n) => `<button class="chip" data-az="aggiungi-elemento" data-nome="${escapeHtml(n)}">+ ${escapeHtml(n)}</button>`).join("") || `<span class="hint">${preferiti.length ? "Hai già aggiunto tutti i preferiti." : "Nessun preferito: tocca la ☆ su una voce."}</span>`}</div>
    <input class="brief-input" id="b-cerca" placeholder="Cerca un elemento da aggiungere…" autocomplete="off">
    <div id="b-suggerimenti"></div>`;
}

briefView.addEventListener("click", (e) => {
  const el = e.target.closest("[data-az]");
  if (!el) return;
  const az = el.dataset.az;
  const b = briefCorrente();
  const i = Number(el.dataset.i);
  let rifocalizza = false;
  if (az === "nuovo") {
    const nb = { id: String(Date.now()), titolo: "", obiettivo: "", todo: [], elementi: [] };
    briefs.unshift(nb); briefAttivo = nb.id;
  } else if (az === "apri") { briefAttivo = el.dataset.id; confermaElimina = false; renderBrief(); return; }
  else if (az === "indietro") { briefAttivo = null; confermaElimina = false; renderBrief(); return; }
  else if (az === "apri-elemento") { vistaBrief(false); modalitaCronologia = false; mostraCombinazione(el.dataset.nome); return; }
  else if (!b) return;
  else if (az === "elimina") {
    if (!confermaElimina) { confermaElimina = true; renderBrief(); return; }
    briefs = briefs.filter((x) => x !== b); briefAttivo = null; confermaElimina = false;
  }
  else if (az === "spunta") b.todo[i].fatto = el.checked;
  else if (az === "togli-todo") b.todo.splice(i, 1);
  else if (az === "aggiungi-todo") {
    const t = document.getElementById("b-nuovo-todo").value.trim();
    if (!t) return;
    b.todo.push({ testo: t, fatto: false }); rifocalizza = true;
  }
  else if (az === "togli-elemento") b.elementi.splice(i, 1);
  else if (az === "aggiungi-elemento") { if (!b.elementi.includes(el.dataset.nome)) b.elementi.push(el.dataset.nome); }
  salvaBrief(); renderBrief();
  if (rifocalizza) document.getElementById("b-nuovo-todo").focus();
});

briefView.addEventListener("input", (e) => {
  const b = briefCorrente();
  if (!b) return;
  if (e.target.id === "b-titolo") { b.titolo = e.target.value; salvaBrief(); }
  else if (e.target.id === "b-obiettivo") { b.obiettivo = e.target.value; salvaBrief(); }
  else if (e.target.id === "b-cerca") {
    const q = e.target.value.trim();
    document.getElementById("b-suggerimenti").innerHTML = q
      ? cerca(q, dati).slice(0, 6).map((v) => `<button class="brief-sugg" data-az="aggiungi-elemento" data-nome="${escapeHtml(v.nome)}"><b>${escapeHtml(v.nome)}</b><span>${v.categoria}</span></button>`).join("")
      : "";
  }
});

briefView.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "b-nuovo-todo") {
    e.preventDefault();
    briefView.querySelector('[data-az="aggiungi-todo"]').click();
  }
});
document.getElementById("brief-btn").addEventListener("click", () => vistaBrief(!briefAperto));


// ---------------- Progetti (archivio di progetti d'esempio, per-dispositivo) ----------------
const CHIAVE_PROG = "syntaxica_progetti";
let progetti = (() => {
  try { const v = JSON.parse(localStorage.getItem(CHIAVE_PROG) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; }
})();
let tabProg = "miei", esempioAttivo = null;
let progettiAperto = false, progettoAttivo = null, anteprimaAperta = false, confermaEliminaProg = false, msgProg = "";
const progView = document.getElementById("progetti-view");
function salvaProgetti() {
  try { localStorage.setItem(CHIAVE_PROG, JSON.stringify(progetti)); msgProg = ""; }
  catch (e) { msgProg = "Spazio pieno: l'ultima modifica non è stata salvata. Elimina un progetto o accorcia il codice."; }
}
function progCorrente() { return progetti.find((x) => x.id === progettoAttivo); }
function chiudiViste() {
  if (briefAperto) vistaBrief(false);
  if (progettiAperto) vistaProgetti(false);
}
function vistaProgetti(on) {
  if (on && briefAperto) vistaBrief(false);
  progettiAperto = on;
  ["cronologia-wrap", "hint", "count", "results"].forEach((id) => { document.getElementById(id).hidden = on || (id === "hint" && modalitaPreferiti); });
  progView.hidden = !on;
  document.getElementById("prog-btn").classList.toggle("attivo", on);
  if (on) renderProgetti();
}
function usataInHtml(voce) {
  const usi = [...ESEMPI.map((e) => ({ ...e, titolo: e.titolo + " (esempio)" })), ...progetti].filter((p) => p.voci.includes(voce.nome));
  return usi.length
    ? `<div class="usata-in">Usata in: ${usi.map((p) => `<button class="usata-btn" type="button" data-id="${p.id}" data-voce="${escapeHtml(voce.nome)}">${escapeHtml(p.titolo || "Senza titolo")}</button>`).join("")}</div>`
    : "";
}
function costruisciDoc(p) {
  let h = (p.html || "")
    .replace(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi, (m) => (/href=["']?https?:/i.test(m) ? m : ""))
    .replace(/<script[^>]*\ssrc=["'](?!https?:)[^"']*["'][^>]*>\s*<\/script>/gi, "");
  const css = p.css ? "<style>" + p.css + "</style>" : "";
  const js = p.js ? "<script>" + p.js.replace(/<\/script/gi, "<\\/script") + "<\/script>" : "";
  Object.entries(p.risorse || {}).forEach(([nome, uri]) => { h = h.split(nome).join(uri); });
  if (!h.trim()) h = "<body></body>";
  h = /<\/head>/i.test(h) ? h.replace(/<\/head>/i, () => css + "</head>") : css + h;
  h = /<\/body>/i.test(h) ? h.replace(/<\/body>/i, () => js + "</body>") : h + js;
  const shim = "<script>(function(){function S(){var d={};return{getItem:function(k){return k in d?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}['localStorage','sessionStorage'].forEach(function(n){try{Object.defineProperty(window,n,{value:S(),configurable:true})}catch(e){}});try{Object.defineProperty(navigator,'serviceWorker',{value:{register:function(){return Promise.resolve()}},configurable:true})}catch(e){}})()<\/script>";
  const m = h.match(/<head[^>]*>/i) || h.match(/<html[^>]*>/i);
  return m ? h.replace(m[0], () => m[0] + shim) : shim + h;
}
function esempioCorrente() { return ESEMPI.find((x) => x.id === esempioAttivo); }
function copiaEsempio() {
  const e = esempioCorrente();
  if (!e) return;
  const np = { id: String(Date.now()), titolo: e.titolo + " (copia)", note: e.descrizione, link: "", html: e.html, css: e.css, js: e.js, risorse: e.risorse || {}, voci: [...e.voci] };
  progetti.unshift(np); salvaProgetti();
  esempioAttivo = null; tabProg = "miei"; progettoAttivo = np.id; anteprimaAperta = false;
  renderProgetti();
}
function renderEsempio(e, msg) {
  const cod = (et, v, id) => v ? zoomRiga(et, id, true) + `<div class="codice-wrap"><pre class="brief-input prog-code ${zClass(id)}" id="${id}" tabindex="0">${escapeHtml(v)}</pre></div>` : "";
  progView.innerHTML = `
    <div class="brief-top"><button class="brief-azione" data-az="indietro-esempi">← Esempi</button><button class="brief-azione" data-az="copia-esempio">Copia nei miei progetti</button></div>${msg}
    <h2>${escapeHtml(e.titolo)}</h2>
    <p class="esempio-autore">Esempio di ${escapeHtml(e.autore)}</p>
    <p class="esempio-desc">${escapeHtml(e.descrizione)}</p>
    <button class="brief-azione" data-az="anteprima">${anteprimaAperta ? "✕ Chiudi anteprima" : "▶ Anteprima"}</button>
    ${anteprimaAperta ? `<iframe id="p-frame" class="prog-frame" sandbox="allow-scripts allow-modals allow-forms" title="Anteprima: ${escapeHtml(e.titolo)}"></iframe>` : ""}
    <span class="brief-label">Voci usate</span>
    <div class="brief-chips">${e.voci.map((n) => `<button class="chip" data-az="apri-elemento" data-nome="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join("")}</div>
    ${cod("HTML", e.html, "e-html")}${cod("CSS", e.css, "e-css")}${cod("JavaScript", e.js, "e-js")}`;
  if (anteprimaAperta) document.getElementById("p-frame").srcdoc = costruisciDoc(e);
}
function renderProgetti() {
  const msg = msgProg ? `<p class="msg-prog">${escapeHtml(msgProg)}</p>` : "";
  const ex = esempioCorrente();
  if (ex) { renderEsempio(ex, msg); return; }
  const p = progCorrente();
  const tabs = `<div class="tabs-prog"><button class="tab-prog${tabProg === "miei" ? " attivo" : ""}" data-az="tab" data-tab="miei">I miei</button><button class="tab-prog${tabProg === "esempi" ? " attivo" : ""}" data-az="tab" data-tab="esempi">Esempi</button></div>`;
  if (!p && tabProg === "esempi") {
    progView.innerHTML = `<div class="brief-top"><h2>Progetti</h2></div>${tabs}${msg}` +
      ESEMPI.map((x) => `<div class="brief-card" data-az="apri-esempio" data-id="${x.id}"><b>${escapeHtml(x.titolo)}</b><span>${escapeHtml(x.descrizione)}</span><span>di ${escapeHtml(x.autore)}</span></div>`).join("");
    return;
  }
  if (!p) {
    progView.innerHTML = `<div class="brief-top"><h2>Progetti</h2><button class="brief-azione" data-az="nuovo">+ Nuovo progetto</button></div>${tabs}${msg}` +
      (progetti.length
        ? progetti.map((x) => {
            const info = [x.html || x.css || x.js ? "Codice" : "", x.link ? "Link" : "", x.voci.length ? x.voci.length + " voci" : ""].filter(Boolean).join(" · ");
            return `<div class="brief-card" data-az="apri" data-id="${x.id}"><b>${escapeHtml(x.titolo || "Senza titolo")}</b><span>${info || "Vuoto"}</span></div>`;
          }).join("")
        : `<p class="hint">Qui archivi i progetti d'esempio: aggiungi un link, incolla il codice o carica i file, collega le voci che hai usato e guarda l'anteprima.</p>`);
    return;
  }
  const haCodice = p.html || p.css || p.js;
  const linkOk = /^https?:\/\//i.test(p.link);
  const campo = (id, et, v) => zoomRiga(et, id, true) + `<div class="codice-wrap"><textarea class="brief-input prog-code ${zClass(id)}" id="${id}" rows="5" placeholder="${et}" spellcheck="false" autocapitalize="off" wrap="off">${escapeHtml(v)}</textarea></div>`;
  progView.innerHTML = `
    <div class="brief-top"><button class="brief-azione" data-az="indietro">← Tutti i progetti</button>
      <button class="brief-azione brief-elimina" data-az="elimina">${confermaEliminaProg ? "Sicuro? Elimina" : "Elimina"}</button></div>${msg}
    <input class="brief-input" id="p-titolo" placeholder="Titolo del progetto" value="${escapeHtml(p.titolo)}">
    <span class="brief-label">Link</span>
    <div class="brief-riga"><input class="brief-input" id="p-link" type="url" inputmode="url" placeholder="https://…" value="${escapeHtml(p.link)}">${linkOk ? `<a class="brief-azione" href="${escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer">Apri ↗</a>` : ""}</div>
    ${zoomRiga("Note", "p-note", true)}
    <textarea class="brief-input ${zClass("p-note", "corta")}" id="p-note" rows="3" placeholder="Cosa fa, cosa hai imparato…">${escapeHtml(p.note)}</textarea>
    <span class="brief-label">Codice</span>
    <label class="brief-azione prog-file">Carica file (.html .css .js)<input type="file" id="p-file" multiple accept=".html,.htm,.css,.js,.txt" hidden></label>
    ${campo("p-html", "HTML", p.html)}${campo("p-css", "CSS", p.css)}${campo("p-js", "JavaScript", p.js)}
    <button class="brief-azione" data-az="anteprima">${anteprimaAperta && haCodice ? "✕ Chiudi anteprima" : "▶ Anteprima"}</button>
    ${anteprimaAperta && haCodice ? `<iframe id="p-frame" class="prog-frame" sandbox="allow-scripts allow-modals allow-forms" title="Anteprima del progetto"></iframe>` : ""}
    <span class="brief-label">Voci usate</span>
    <div class="brief-chips">${p.voci.map((n, i) => `<span class="chip-wrap"><button class="chip" data-az="apri-elemento" data-nome="${escapeHtml(n)}">${escapeHtml(n)}</button><button class="x-btn" data-az="togli-elemento" data-i="${i}" aria-label="Rimuovi ${escapeHtml(n)}">×</button></span>`).join("") || `<span class="hint">Nessuna ancora.</span>`}</div>
    <input class="brief-input" id="p-cerca" placeholder="Cerca una voce da collegare…" autocomplete="off">
    <div id="p-sugg"></div>`;
  if (anteprimaAperta && haCodice) document.getElementById("p-frame").srcdoc = costruisciDoc(p);
}
function apriProgetto(id, voce) {
  const oggetto = id.startsWith("ex-") ? ESEMPI.find((x) => x.id === id) : progetti.find((x) => x.id === id);
  if (voce && oggetto) setTimeout(() => evidenziaRiga(oggetto, voce), 80);
  if (id.startsWith("ex-")) { esempioAttivo = id; tabProg = "esempi"; progettoAttivo = null; anteprimaAperta = false; vistaProgetti(true); renderProgetti(); return; }
  esempioAttivo = null; tabProg = "miei";
  progettoAttivo = id; anteprimaAperta = false; confermaEliminaProg = false;
  vistaProgetti(true); renderProgetti();
}
progView.addEventListener("click", (e) => {
  const el = e.target.closest("[data-az]");
  if (!el) return;
  const az = el.dataset.az, p = progCorrente(), i = Number(el.dataset.i);
  if (az === "zoom") { toggleZoom(el); return; }
  if (az === "nuovo") {
    const np = { id: String(Date.now()), titolo: "", note: "", link: "", html: "", css: "", js: "", voci: [] };
    progetti.unshift(np); progettoAttivo = np.id; anteprimaAperta = false;
  } else if (az === "apri") { apriProgetto(el.dataset.id); return; }
  else if (az === "indietro") { progettoAttivo = null; anteprimaAperta = false; confermaEliminaProg = false; msgProg = ""; renderProgetti(); return; }
  else if (az === "apri-elemento") { chiudiViste(); modalitaCronologia = false; mostraCombinazione(el.dataset.nome); return; }
  else if (az === "tab") { tabProg = el.dataset.tab; renderProgetti(); return; }
  else if (az === "apri-esempio") { apriProgetto(el.dataset.id); return; }
  else if (az === "indietro-esempi") { esempioAttivo = null; anteprimaAperta = false; renderProgetti(); return; }
  else if (az === "copia-esempio") { copiaEsempio(); return; }
  else if (az === "anteprima" && esempioCorrente()) { anteprimaAperta = !anteprimaAperta; renderProgetti(); return; }
  else if (!p) return;
  else if (az === "anteprima") {
    if (!(p.html || p.css || p.js)) { msgProg = "Aggiungi prima del codice (incollato o da file) per vedere l'anteprima."; renderProgetti(); return; }
    msgProg = ""; anteprimaAperta = !anteprimaAperta; renderProgetti(); return;
  }
  else if (az === "elimina") {
    if (!confermaEliminaProg) { confermaEliminaProg = true; renderProgetti(); return; }
    progetti = progetti.filter((x) => x !== p); progettoAttivo = null; confermaEliminaProg = false;
  }
  else if (az === "togli-elemento") p.voci.splice(i, 1);
  else if (az === "aggiungi-elemento") { if (!p.voci.includes(el.dataset.nome)) p.voci.push(el.dataset.nome); }
  salvaProgetti(); renderProgetti();
});
progView.addEventListener("input", (e) => {
  const p = progCorrente();
  if (!p) return;
  const mappa = { "p-titolo": "titolo", "p-note": "note", "p-link": "link", "p-html": "html", "p-css": "css", "p-js": "js" };
  if (mappa[e.target.id]) { p[mappa[e.target.id]] = e.target.value; salvaProgetti(); }
  else if (e.target.id === "p-cerca") {
    const q = e.target.value.trim();
    document.getElementById("p-sugg").innerHTML = q
      ? cerca(q, dati).slice(0, 6).map((v) => `<button class="brief-sugg" data-az="aggiungi-elemento" data-nome="${escapeHtml(v.nome)}"><b>${escapeHtml(v.nome)}</b><span>${v.categoria}</span></button>`).join("")
      : "";
  }
});
progView.addEventListener("change", async (e) => {
  const p = progCorrente();
  if (!p) return;
  if (e.target.id === "p-link") { renderProgetti(); return; }
  if (e.target.id !== "p-file") return;
  const nuovi = { html: [], css: [], js: [] };
  const scartati = [];
  for (const f of e.target.files) {
    const est = (f.name.split(".").pop() || "").toLowerCase();
    const tipo = est === "css" ? "css" : est === "js" ? "js" : est === "html" || est === "htm" ? "html" : null;
    if (!tipo || f.size > 400000) { scartati.push(f.name); continue; }
    nuovi[tipo].push(await f.text());
  }
  ["html", "css", "js"].forEach((t) => { if (nuovi[t].length) p[t] = nuovi[t].join("\n\n"); });
  salvaProgetti();
  if (scartati.length) msgProg = "File non caricati (formato non valido o oltre 400 KB): " + scartati.join(", ");
  renderProgetti();
});
document.getElementById("prog-btn").addEventListener("click", () => {
  if (progettiAperto) { vistaProgetti(false); return; }
  vistaProgetti(true);
});

// ---------------- Evidenzia la riga di codice quando si arriva da "Usata in" ----------------
const RICERCA = {
  "querySelector()": "querySelector\\(", "querySelectorAll()": "querySelectorAll\\(", "addEventListener()": "addEventListener\\(", "setInterval()": "setInterval\\(", "clearInterval()": "clearInterval\\(",
  "Template literals (backtick)": "`", "padStart()": "padStart\\(", "Math.floor()": "Math\\.floor\\(", "Math.random()": "Math\\.random\\(", "Operatore resto (%)": "\\s%\\s",
  "hidden attribute": "\\bhidden\\b", "disabled / readonly": "\\b(disabled|readonly)\\b", "overflow-x / overflow-y": "overflow-(x|y)", "forEach()": "forEach\\(", "reduce()": "reduce\\(",
  "classList.add() / remove()": "classList\\.(add|remove)", "appendChild()": "appendChild\\(", "Array.from()": "Array\\.from\\(", "Number()": "Number\\(", "dataset": "dataset",
  "if / else if / else": "\\bif\\s*\\(", "Flexbox (display: flex)": "display:\\s*flex", "Variabili CSS": "--[a-z]", "Media query": "@media", "Posizionamento fisso e sticky": "position:\\s*(fixed|sticky)",
  "Service Worker": "serviceWorker", "Arrow function (=>)": "=>", "JSON.stringify()": "JSON\\.stringify", "JSON.parse()": "JSON\\.parse", "preventDefault()": "preventDefault\\(",
  "filter()": "\\.filter\\(", "every() / some()": "\\.(every|some)\\(", "includes() (stringa)": "\\.includes\\(", "toLowerCase()": "toLowerCase\\(", "Event delegation": "lista\\.addEventListener",
  "for": "\\bfor\\s*\\(", "form": "<form", "input element": "<input", "fieldset": "<fieldset", "legend": "<legend", "required attribute": "\\brequired\\b", "placeholder": "placeholder=",
  "min / max / minlength / maxlength": "(min|max)length", "Tipi di input (type)": "type=\"", "SVG": "<svg", "vh / vw": "\\dv[hw]", "div": "<div", "linear-gradient()": "linear-gradient"
};
function regexPerVoce(nome) {
  if (RICERCA[nome]) return new RegExp(RICERCA[nome]);
  const base = nome.split(/\s*\/\s*/)[0].replace(/\s*\(.*\)\s*$/, "").replace(/\(\)$/, "");
  if (base.length < 2) return null;
  const esc = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(/^\w+$/.test(base) ? "\\b" + esc + "\\b" : esc);
}
function trovaRiga(p, nome) {
  const re = regexPerVoce(nome);
  if (!re) return null;
  const cat = (trovaPerNome(nome) || {}).categoria;
  const ordine = { JS: ["js", "css", "html"], CSS: ["css", "html", "js"], HTML: ["html", "css", "js"] }[cat] || ["js", "css", "html"];
  for (const campo of ordine) {
    const i = (p[campo] || "").split("\n").findIndex((r) => re.test(r));
    if (i >= 0) return { campo, riga: i };
  }
  return null;
}
function evidenziaRiga(p, nome) {
  const chip = [...progView.querySelectorAll("[data-az='apri-elemento']")].find((c) => c.dataset.nome === nome);
  if (chip) { chip.classList.add("lampeggia"); setTimeout(() => chip.classList.remove("lampeggia"), 2300); }
  const t = trovaRiga(p, nome);
  if (!t) return;
  const ta = document.getElementById((esempioAttivo ? "e-" : "p-") + t.campo);
  if (!ta) return;
  const cs = getComputedStyle(ta);
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
  const y = parseFloat(cs.paddingTop) + t.riga * lh;
  ta.scrollTop = Math.max(0, y - ta.clientHeight / 2 + lh);
  const barra = document.createElement("div");
  barra.className = "riga-evid";
  barra.style.top = parseFloat(cs.borderTopWidth) + y - ta.scrollTop + "px";
  barra.style.height = lh + "px";
  ta.parentElement.appendChild(barra);
  ta.parentElement.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => barra.remove(), 2300);
}

// ---------------- Nuova veste: barra in basso, header che si nasconde, home ----------------
document.getElementById("tab-cerca").addEventListener("click", () => {
  const giaQui = !briefAperto && !progettiAperto && !modalitaPreferiti;
  chiudiViste();
  if (modalitaPreferiti) { modalitaPreferiti = false; document.getElementById("pref-btn").classList.remove("attivo"); }
  modalitaCronologia = false; mostraTutte = false;
  if (giaQui) {
    document.getElementById("search").value = "";
    categoriaAttiva = null;
    document.querySelectorAll(".cat-btn").forEach((c) => c.classList.remove("attivo"));
  }
  mostraRisultati(elencoFiltrato());
  window.scrollTo({ top: 0, behavior: "smooth" });
});
document.getElementById("results").addEventListener("click", (e) => {
  const cat = e.target.closest("[data-home-cat]");
  if (cat) { document.querySelector(`.cat-btn[data-cat="${cat.dataset.homeCat}"]`).click(); return; }
  const voce = e.target.closest("[data-home-voce]");
  if (voce) { modalitaCronologia = false; mostraCombinazione(voce.dataset.homeVoce); return; }
  if (e.target.closest("[data-home-tutte]")) { mostraTutte = true; mostraRisultati(elencoFiltrato()); }
});
["brief-btn", "prog-btn"].forEach((id) => document.getElementById(id).addEventListener("click", () => {
  if (modalitaPreferiti) { modalitaPreferiti = false; document.getElementById("pref-btn").classList.remove("attivo"); }
  window.scrollTo(0, 0);
}));
const ultimoStato = { y: 0 };
window.addEventListener("scroll", () => {
  const y = window.scrollY, h = document.querySelector("header");
  if (y > ultimoStato.y && y > 120) h.classList.add("nascosto");
  else if (y < ultimoStato.y - 4) h.classList.remove("nascosto");
  ultimoStato.y = y;
}, { passive: true });
function aggiornaSezione() { document.body.classList.toggle("in-sezione", !briefView.hidden || !progView.hidden); }
[briefView, progView].forEach((v) => new MutationObserver(aggiornaSezione).observe(v, { attributes: true, attributeFilter: ["hidden"] }));
function aggiornaHint() {
  const nascondi = document.getElementById("search").value.trim() || categoriaAttiva || document.querySelector(".focus-principale") || document.querySelector("#results .tile");
  document.getElementById("hint").classList.toggle("nascosto", !!nascondi);
}
new MutationObserver(aggiornaHint).observe(document.getElementById("results"), { childList: true });

renderCronologia();
mostraRisultati(elencoFiltrato());
aggiornaHint();
