// Il collegamento con il server del gioco (la funzione "guerra" di Supabase).
// Bauli, acquisti, potenziamenti, battaglie e donazioni li decide il server: il telefono
// manda una richiesta e riceve il profilo aggiornato. Qui c'è solo il "telefono" della richiesta;
// le regole vere stanno in azioni.js (che gira sul server).
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const D = isNode ? require('./cards.js') : root.GameData;

  // Cosa decide solo il server, e cosa invece può cambiare il telefono.
  // Sono la copia degli elenchi di azioni.js: un test controlla che restino uguali.
  const CAMPI_SERVER = ['trophies', 'best', 'gold', 'gems', 'wins', 'losses', 'draws', 'giftDay', 'shopDay', 'shopBought',
    'cards', 'chests', 'chestIndex', 'arenaStats', 'roadClaimed', 'tour', 'tourDay', 'lastRequest', 'credited', 'shopSeed', 'missioni'];
  const CAMPI_TELEFONO = ['name', 'deck', 'friends', 'chats', 'clan', 'sound', 'seen'];

  // Errori che il server può dare (tutto il resto diventa 'errore_server')
  const ERRORI_NOTI = ['non_permesso', 'dati_non_validi', 'azione_sconosciuta', 'riprova', 'non_collegato'];
  const ATTESA_MASSIMA = 20000;   // dopo 20 secondi senza risposta si considera "offline"

  const copia = (x) => JSON.parse(JSON.stringify(x));
  const propria = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));

  // Copia nel profilo del telefono SOLO i campi che decide il server (nome e mazzo restano come sono)
  function unisci(locale, server) {
    if (!server || typeof server !== 'object') return locale;
    for (const k of CAMPI_SERVER) if (propria(server, k)) locale[k] = copia(server[k]);
    // da ora in poi questo profilo è "passato al server": non serve più mandarlo da importare
    if (server.server === true) locale.server = true;
    return locale;
  }

  // ---- Rete di sicurezza: i progressi del telefono non si buttano mai senza una copia ----
  const CHIAVE_COPIA = 'profilo-ospite-backup';
  // Il profilo ha qualcosa da perdere? (coppe, oppure carte o monete/gemme diverse da quelle di partenza)
  function haProgressi(p) {
    if (!p || typeof p !== 'object') return false;
    if ((p.trophies || 0) > 0 || (p.best || 0) > 0) return true;
    if (p.gold !== 100 || p.gems !== 50) return true;
    const carte = p.cards && typeof p.cards === 'object' ? p.cards : {};
    const chiavi = Object.keys(carte);
    // all'inizio: solo le carte dell'arena 0, livello 1, nessuna copia
    if (D && chiavi.length !== D.CARDS.filter((c) => c.arena === 0).length) return true;
    return chiavi.some((k) => !carte[k] || carte[k].level !== 1 || carte[k].count !== 0);
  }
  // Prima di sostituire il profilo del telefono con uno del server: se il telefono ha progressi e quello
  // del server è "fresco" (senza progressi), si tiene una copia in localStorage. Una copia con più coppe
  // non viene mai sostituita da una più povera. Restituisce true se ha salvato la copia.
  function copiaDiSicurezza(locale, server, storage) {
    if (!storage || !haProgressi(locale) || haProgressi(server)) return false;
    try {
      const vecchia = JSON.parse(storage.getItem(CHIAVE_COPIA) || 'null');
      if (vecchia && (vecchia.trophies || 0) >= (locale.trophies || 0)) return false;
      storage.setItem(CHIAVE_COPIA, JSON.stringify(Object.assign({}, locale, { salvataIl: new Date().toISOString() })));
      return true;
    } catch (e) { return false; }   // spazio pieno o modalità privata
  }

  // Quante donazioni del clan il server ha appena aggiunto (lo dice lui in out.accreditate)
  function accreditate(r) {
    const n = r && r.out && r.out.accreditate;
    return Number.isInteger(n) && n > 0 ? n : 0;
  }

  // Una sola richiesta al server. Restituisce { ok: true, dati } oppure { codice }.
  // "chiave": cosa deve esserci nella risposta (il profilo, oppure la classifica)
  async function unaVolta(sb, body, chiave) {
    let esito;
    try {
      const attesa = new Promise((ok, no) => setTimeout(() => no(new Error('offline')), ATTESA_MASSIMA));
      esito = await Promise.race([sb.functions.invoke('guerra', { body }), attesa]);
    } catch (e) { return { codice: 'offline' }; }
    const { data, error } = esito;
    if (!error) return data && data[chiave] ? { ok: true, dati: data } : { codice: 'errore_server' };
    // Gli errori HTTP (400, 401, 409, 500) hanno il corpo con il motivo; gli altri sono errori di rete
    if (error.context && typeof error.context.json === 'function') {
      // 401: la rete c'è, ma l'accesso è scaduto o non vale più (non è "senza internet")
      if (error.context.status === 401) return { codice: 'non_collegato' };
      let corpo = null;
      try { corpo = await error.context.json(); } catch (e) { /* corpo illeggibile */ }
      const motivo = corpo && corpo.errore;
      return { codice: ERRORI_NOTI.includes(motivo) ? motivo : 'errore_server' };
    }
    if (error.name === 'FunctionsRelayError') return { codice: 'errore_server' };
    return { codice: 'offline' };
  }

  async function invia(azione, dati, clientProva) {
    // clientProva: un finto client, solo per i test
    const sb = clientProva || (root.Cloud && root.Cloud.client && root.Cloud.client());
    if (!sb) throw new Error('offline');
    if (root.navigator && root.navigator.onLine === false) throw new Error('offline');
    let sessione = null;
    try { const r = await sb.auth.getSession(); sessione = r && r.data && r.data.session; } catch (e) { /* niente accesso */ }
    if (!sessione) throw new Error('offline');
    const body = Object.assign({}, dati, { azione });
    const chiave = azione === 'classifica' ? 'classifica' : 'profilo';
    let riprovato = false, ricollegato = false;
    for (;;) {
      const r = await unaVolta(sb, body, chiave);
      if (r.ok) return r.dati;
      // 409: un'altra richiesta è arrivata prima di noi, si riprova una volta
      if (r.codice === 'riprova' && !riprovato) { riprovato = true; await pausa(300); continue; }
      // 401: accesso scaduto. Chi usa il gioco (app.js) ci dà "ricollega": si rientra e si ripete una volta
      if (r.codice === 'non_collegato' && !ricollegato && typeof api.ricollega === 'function') {
        ricollegato = true;
        let ok = false;
        try { ok = await api.ricollega(); } catch (e) { ok = false; }
        if (ok) continue;
      }
      throw new Error(r.codice);
    }
  }

  // Le richieste vanno una alla volta, nell'ordine in cui sono state fatte
  let coda = Promise.resolve();
  // Server.chiedi('baule_apri', { slot: 0 }) -> { profilo, out }
  // Lancia Error('offline') senza rete o senza accesso, Error(codice) se il server rifiuta.
  function chiedi(azione, dati, clientProva) {
    const lavoro = coda.then(() => invia(azione, dati, clientProva));
    coda = lavoro.catch(() => {});
    return lavoro;
  }

  // ---- Classifica del mondo: si chiede al server al massimo una volta al minuto ----
  const CLASSIFICA_MS = 60000;
  let ultimaClassifica = null;   // { quando, dati } dell'ultima risposta
  // Restituisce { top: [{ pos, name, trophies, arena, clan, tu }], io } oppure lancia un errore (es. "offline")
  async function classifica(clientProva, adesso) {
    const ora = adesso == null ? Date.now() : adesso;
    if (ultimaClassifica && ora - ultimaClassifica.quando < CLASSIFICA_MS) return ultimaClassifica.dati;
    const r = await chiedi('classifica', {}, clientProva);
    ultimaClassifica = { quando: ora, dati: r.classifica };
    return r.classifica;
  }
  // Dopo un cambio di account la classifica salvata non è più nostra
  function dimenticaClassifica() { ultimaClassifica = null; }

  // ---- Le cose del telefono (nome, mazzo, amici, chat, clan...) mandate con "aggiorna" ----
  // Il server accetta richieste di al massimo 64 KB: le chat si tengono corte e si manda solo ciò che è cambiato.
  const MAX_MESSAGGI = 50;        // ultimi messaggi tenuti per ogni amico e per il clan
  const MAX_CHAT_BYTE = 30000;    // tetto per tutte le chat degli amici insieme
  const grandezza = (x) => JSON.stringify(x).length;

  // Accorcia le chat del profilo (anche quelle salvate sul telefono). Restituisce il profilo.
  function accorcia(p) {
    if (p.chats && typeof p.chats === 'object') {
      const tutti = [];
      for (const id of Object.keys(p.chats)) {
        if (!Array.isArray(p.chats[id])) continue;
        if (p.chats[id].length > MAX_MESSAGGI) p.chats[id] = p.chats[id].slice(-MAX_MESSAGGI);
        for (const m of p.chats[id]) tutti.push({ id, m, peso: grandezza(m) });
      }
      // se sono ancora troppe, si buttano i messaggi più vecchi di tutte le chat
      let totale = tutti.reduce((s, x) => s + x.peso, 0);
      if (totale > MAX_CHAT_BYTE) {
        tutti.sort((a, b) => (a.m.at || 0) - (b.m.at || 0));
        for (const x of tutti) {
          if (totale <= MAX_CHAT_BYTE) break;
          p.chats[x.id] = p.chats[x.id].filter((y) => y !== x.m);
          totale -= x.peso;
        }
      }
    }
    if (p.clan && Array.isArray(p.clan.chat) && p.clan.chat.length > MAX_MESSAGGI) p.clan.chat = p.clan.chat.slice(-MAX_MESSAGGI);
    return p;
  }

  // Quali campi del telefono sono cambiati dall'ultimo invio riuscito?
  // `inviati` = { campo: testo JSON mandato l'ultima volta }. Restituisce { campi, testi }.
  function campiCambiati(p, inviati) {
    const campi = {}, testi = {};
    for (const k of CAMPI_TELEFONO) {
      const t = JSON.stringify(p[k]);
      if (inviati && inviati[k] === t) continue;
      campi[k] = p[k];
      testi[k] = t;
    }
    return { campi, testi };
  }

  const api = {
    chiedi, classifica, dimenticaClassifica, unisci, accorcia, campiCambiati, haProgressi, copiaDiSicurezza, accreditate,
    MAX_CORPO: 64 * 1024, CAMPI_SERVER, CAMPI_TELEFONO, CHIAVE_COPIA,
    // ricollega: funzione async (la mette app.js) che prova a rientrare dopo un 401; true se ci è riuscita
    ricollega: null,
  };
  if (isNode) module.exports = api; else root.Server = api;
})(typeof self !== 'undefined' ? self : this);
