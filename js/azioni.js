// Le regole del server: quali azioni economiche si possono fare sul profilo.
// Sono funzioni "pure": niente rete, niente orologio, niente Math.random.
// Il tempo (ctx.now) e il caso (ctx.rnd) arrivano sempre da fuori.
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const D = isNode ? require('./cards.js') : root.GameData;
  const Profile = isNode ? require('./profile.js') : root.Profile;
  const Engine = isNode ? require('./engine.js') : root.Engine;
  const SetupBattaglia = isNode ? require('./setup-battaglia.js') : root.SetupBattaglia;
  const Rigioco = isNode ? require('./rigioco.js') : root.Rigioco;
  const Avvisi = isNode ? require('./avvisi.js') : root.Avvisi;

  // Cosa decide solo il server, e cosa invece può cambiare il telefono
  const CAMPI_SERVER = ['trophies', 'best', 'gold', 'gems', 'wins', 'losses', 'draws', 'giftDay', 'shopDay', 'shopBought',
    'cards', 'chests', 'chestIndex', 'arenaStats', 'roadClaimed', 'tour', 'tourDay', 'lastRequest', 'credited', 'shopSeed', 'missioni'];
  const CAMPI_TELEFONO = ['name', 'deck', 'friends', 'chats', 'clan', 'sound', 'seen'];

  const rifiuta = () => { throw new Error('non_permesso'); };
  const nonValido = () => { throw new Error('dati_non_validi'); };
  const copia = (x) => JSON.parse(JSON.stringify(x));
  const semplice = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  const testo = (v, n) => String(v == null ? '' : v).slice(0, n);
  const intero = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v)) || 0));
  const slotValido = (p, s) => Number.isInteger(s) && s >= 0 && s < p.chests.length;

  // ---- Pulizia dei dati che arrivano dal telefono ----
  function pulisciNome(v, vecchio) {
    if (typeof v !== 'string') nonValido();
    const n = v.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim().slice(0, 16);
    return n || vecchio;
  }

  function pulisciMazzo(v, p) {
    if (!Array.isArray(v) || v.length !== 8) nonValido();
    if (new Set(v).size !== 8) nonValido();
    for (const k of v) {
      if (typeof k !== 'string' || !Object.prototype.hasOwnProperty.call(p.cards, k)) nonValido();
    }
    return v.slice();
  }

  // Un amico: solo testi e numeri brevi (il clan dell'amico è un piccolo riassunto)
  function pulisciAmico(f) {
    if (!semplice(f) || typeof f.id !== 'string' || !f.id) nonValido();
    const out = {};
    for (const k of Object.keys(f).slice(0, 20)) {
      const x = f[k];
      if (k.length > 20) continue;
      if (typeof x === 'string') out[k] = x.slice(0, 60);
      else if (typeof x === 'number' && isFinite(x)) out[k] = x;
      else if (k === 'clan' && x === null) out[k] = null;
      else if (k === 'clan' && semplice(x)) out[k] = { id: testo(x.id, 24), name: testo(x.name, 24), badge: testo(x.badge, 8) };
    }
    return out;
  }
  function pulisciAmici(v) {
    if (!Array.isArray(v) || v.length > 100) nonValido();
    return v.map(pulisciAmico);
  }

  function pulisciMessaggio(m) {
    if (!semplice(m)) nonValido();
    const out = {};
    for (const k of Object.keys(m).slice(0, 12)) {
      const x = m[k];
      if (k.length > 20) continue;
      if (typeof x === 'string') out[k] = x.slice(0, 200);
      else if (typeof x === 'number' && isFinite(x)) out[k] = x;
    }
    return out;
  }
  function pulisciChat(v) {
    if (!semplice(v)) nonValido();
    const chiavi = Object.keys(v);
    if (chiavi.length > 100) nonValido();
    const tmp = Object.create(null);
    for (const k of chiavi) {
      if (k === '__proto__') continue;
      if (k.length > 24) nonValido();
      if (!Array.isArray(v[k]) || v[k].length > 100) nonValido();
      tmp[k] = v[k].map(pulisciMessaggio);
    }
    return Object.assign({}, tmp);
  }

  function pulisciSeen(v) {
    if (!semplice(v)) nonValido();
    const chiavi = Object.keys(v);
    if (chiavi.length > 200) nonValido();
    const out = {};
    for (const k of chiavi) {
      const x = v[k];
      if (typeof x === 'boolean' || (typeof x === 'number' && isFinite(x))) out[k.slice(0, 40)] = x;
    }
    return out;
  }

  // Controlla un campo del telefono e restituisce il valore pulito (lancia 'dati_non_validi' se non va)
  function pulisciCampo(p, k, v) {
    if (k === 'name') return pulisciNome(v, p.name);
    if (k === 'deck') return pulisciMazzo(v, p);
    if (k === 'friends') return pulisciAmici(v);
    if (k === 'chats') return pulisciChat(v);
    if (k === 'clan') return v == null ? null : Profile.cleanClan(v);
    if (k === 'sound') { if (typeof v !== 'boolean') nonValido(); return v; }
    if (k === 'seen') return pulisciSeen(v);
    return nonValido();
  }

  // Campo per campo: quelli che non vanno bene si saltano (resta il valore del server)
  // e si elencano in "rifiutati", così un mazzo sbagliato non blocca amici, clan e chat.
  function aggiorna(p, campi) {
    if (!semplice(campi)) nonValido();
    const rifiutati = [];
    // Gli altri campi (monete, gemme, coppe...) si ignorano senza fare rumore
    for (const k of CAMPI_TELEFONO) {
      if (!Object.prototype.hasOwnProperty.call(campi, k)) continue;
      try { p[k] = pulisciCampo(p, k, campi[k]); } catch (e) { rifiutati.push(k); }
    }
    return { rifiutati };
  }

  // Una chiave di carta vera e posseduta (mai "__proto__", "constructor"...)
  const propria = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  const cartaPosseduta = (p, k) => propria(p.cards, k) && propria(D.BY_KEY, k);

  // Il torneo è attivo se c'è e non è finito
  const torneoAttivo = (p) => !!p.tour && !p.tour.done;

  // Quanto dura al massimo una battaglia (secondi): tempo normale + supplementari
  // (i valori standard li decide il motore, non il setup)
  function durataMassima(setup) {
    const s = Engine.createMatch(setup.match);
    return s.duration + s.overtime;
  }

  // Ricompensa in monete per chi dona una carta (le leggendarie non si chiedono)
  const PREMIO_DONAZIONE = { comune: 5, rara: 25, epica: 100 };

  // ---- Le azioni: ognuna lavora sulla copia e dice cosa è successo ----
  const AZIONI = {
    profilo: () => ({}),
    baule_sblocca: (p, r, c) => {
      if (!slotValido(p, r.slot) || !Profile.startUnlock(p, r.slot, c.now)) rifiuta();
      return { unlockAt: p.chests[r.slot].unlockAt };
    },
    baule_apri: (p, r, c) => {
      if (!slotValido(p, r.slot)) rifiuta();
      return Profile.openChest(p, r.slot, c.now, c.rnd) || rifiuta();
    },
    baule_salta: (p, r, c) => {
      if (!slotValido(p, r.slot)) rifiuta();
      return Profile.skipChest(p, r.slot, c.now, c.rnd) || rifiuta();
    },
    regalo_apri: (p, r, c) => Profile.openGift(p, c.now, c.rnd) || rifiuta(),
    negozio_compra: (p, r, c) => {
      if (!propria(D.BY_KEY, r.key) || !Profile.buyOffer(p, r.key, c.now)) rifiuta();
      return { key: r.key };
    },
    gemme_compra: (p, r, c) => {
      if (typeof r.id !== 'string' || !D.GEM_SHOP.some((x) => x.id === r.id)) nonValido();
      return Profile.buyGemItem(p, r.id, c.rnd) || rifiuta();
    },
    potenzia: (p, r) => {
      if (!cartaPosseduta(p, r.key)) nonValido();
      if (!Profile.upgrade(p, r.key)) rifiuta();
      return { key: r.key, level: p.cards[r.key].level };
    },
    cammino_ritira: (p, r, c) => {
      if (!Number.isInteger(r.arena) || r.arena < 0 || r.arena >= D.ARENAS.length) rifiuta();
      return Profile.claimRoad(p, r.arena, r.t, c.rnd) || rifiuta();
    },
    torneo_inizia: (p, r, c) => {
      if (!Profile.tourStart(p, c.now)) rifiuta();
      return { tour: p.tour };
    },
    torneo_ritira: (p, r, c) => {
      if (!p.tour) rifiuta();
      return Profile.tourClaim(p, Profile.arena(p), c.rnd) || rifiuta();
    },
    aggiorna: (p, r) => aggiorna(p, r.campi),
    missione_ritira: (p, r, c) => {
      if (typeof r.id !== 'string' || !Profile.MISSIONI.some((m) => m.id === r.id)) nonValido();
      return Profile.ritiraMissione(p, c.now, r.id) || rifiuta();
    },
    baule_corona: (p, r, c) => Profile.apriBauleCorona(p, c.now, c.rnd) || rifiuta(),

    // Avvisi sul telefono: il profilo non cambia, si controlla solo l'iscrizione.
    // La scrive poi la funzione del server nella tabella avvisi_iscrizioni.
    avvisi_iscrivi: (p, r) => ({ iscrizione: Avvisi.pulisciIscrizione(r.iscrizione) }),
    avvisi_togli: (p, r) => ({ endpoint: Avvisi.pulisciEndpoint(r.endpoint) }),

    // Inizia una battaglia: il server prepara il setup (avversario, arena, semi) e lo salva
    battaglia_inizia: (p, r, c) => {
      if (r.mode !== 'ladder' && r.mode !== 'tour') nonValido();
      if (r.mode === 'tour' && !torneoAttivo(p)) rifiuta();
      const level = SetupBattaglia.livello(p, r.mode);
      return { setup: SetupBattaglia.prepara(p, r.mode, level, c.rnd, c.now) };
    },

    // Finisce una battaglia: il server rigioca le mosse. Conta SOLO il risultato del rigioco.
    // ctx.battaglia = { setup, inizio (ms), chiusa }
    battaglia_fine: (p, r, c) => {
      const b = c.battaglia;
      if (!semplice(b) || !semplice(b.setup)) nonValido();
      if (b.chiusa) rifiuta();
      if (b.setup.mode !== 'ladder' && b.setup.mode !== 'tour') nonValido();
      if (!Number.isFinite(b.inizio)) nonValido();
      const rg = Rigioco.esegui(b.setup, r.mosse);
      if (!rg.ok) nonValido();
      // Una partita vera dura quanto dice il rigioco: troppo in fretta = imbroglio
      if (c.now - b.inizio < (rg.secondi - 10) * 1000 * 0.9) rifiuta();
      let esito;
      if (b.setup.mode === 'tour') {
        if (!torneoAttivo(p)) rifiuta();
        esito = Profile.tourResult(p, rg.winner);
      } else esito = Profile.applyResult(p, rg.winner, rg.crowns[0]);
      // missioni del giorno: contano le carte giocate davvero (le mosse che il rigioco ha accettato)
      Profile.segnaMissioni(p, c.now, rg.winner === 0, rg.crowns[0], r.mosse.length);
      return { winner: rg.winner, crowns: rg.crowns, esito, passi: rg.passi };
    },

    // Chiede carte al clan (il server crea la riga della richiesta e ne mette l'id)
    clan_richiesta: (p, r, c) => {
      if (!propria(D.BY_KEY, r.card)) nonValido();
      if (Profile.requestMax(r.card) <= 0 || !Profile.canRequest(p, c.now)) rifiuta();
      p.lastRequest = c.now;
      return { max: Profile.requestMax(r.card) };
    },

    // Dona una carta a un compagno di clan: ctx.utente = chi dona,
    // ctx.richiesta = { carta, max, donate, proprietario }
    clan_dona: (p, r, c) => {
      const q = c.richiesta;
      if (typeof c.utente !== 'string' || !c.utente || !semplice(q)) nonValido();
      if (typeof q.proprietario !== 'string' || !Number.isFinite(q.max) || !Number.isFinite(q.donate)) nonValido();
      if (q.proprietario === c.utente || q.donate >= q.max) rifiuta();
      if (!cartaPosseduta(p, q.carta) || !(p.cards[q.carta].count > 0)) rifiuta();
      const premio = PREMIO_DONAZIONE[D.BY_KEY[q.carta].rarity];
      if (!premio) rifiuta();
      p.cards[q.carta].count--;
      p.gold += premio;
      return { ricompensa: premio };
    },
  };

  // Esegue un'azione su una COPIA del profilo: se qualcosa va storto non resta niente a metà
  function esegui(p, req, ctx) {
    if (!semplice(req) || typeof req.azione !== 'string' || !Object.prototype.hasOwnProperty.call(AZIONI, req.azione)) {
      throw new Error('azione_sconosciuta');
    }
    if (!semplice(ctx) || typeof ctx.rnd !== 'function' || !Number.isFinite(ctx.now)) nonValido();
    const copiaP = copia(p);
    const out = AZIONI[req.azione](copiaP, req, ctx);
    return { p: copiaP, out };
  }

  // Una battaglia aperta "fatta bene": id, ora d'inizio, modalità e impostazioni che il motore capisce.
  // Restituisce la durata massima in secondi, oppure null se la voce è rotta.
  function durataSeBenFatta(b) {
    try {
      if (!semplice(b) || typeof b.id !== 'string' || !semplice(b.setup) || !semplice(b.setup.match)) return null;
      if (!Number.isFinite(b.inizio)) return null;
      if (b.setup.mode !== 'ladder' && b.setup.mode !== 'tour') return null;
      const d = durataMassima(b.setup);
      return Number.isFinite(d) ? d : null;
    } catch (e) { return null; }
  }

  // Le voci rotte tra le battaglie aperte: sono le UNICHE che si chiudono senza effetto sul profilo.
  // (Tutte le altre, di qualunque età, passano da "abbandonate": così aspettare non salva da una sconfitta.)
  function malformate(battaglieAperte) {
    if (!Array.isArray(battaglieAperte)) return [];
    return battaglieAperte
      .filter((b) => semplice(b) && typeof b.id === 'string' && durataSeBenFatta(b) === null)
      .map((b) => b.id);
  }

  // Battaglie rimaste aperte troppo a lungo: contano come sconfitte.
  // battaglieAperte = [{ id, setup, inizio (ms) }]. Modifica p (lo stesso profilo che poi
  // si salva) e restituisce solo gli id da chiudere. Le voci rotte si saltano, mai errori.
  function abbandonate(p, battaglieAperte, now) {
    const chiuse = [];
    if (!Array.isArray(battaglieAperte) || !Number.isFinite(now)) return chiuse;
    for (const b of battaglieAperte) {
      try {
        const durata = durataSeBenFatta(b);
        if (durata === null) continue;
        if (now - b.inizio <= (durata + 120) * 1000) continue;
        if (b.setup.mode === 'tour') { if (torneoAttivo(p)) Profile.tourResult(p, 1); }
        else Profile.applyResult(p, 1, 0);
        chiuse.push(b.id);
      } catch (e) { /* voce rotta: si salta */ }
    }
    return chiuse;
  }

  // Aggiunge le carte donate (una volta sola per donazione). Restituisce quante ne ha aggiunte.
  function accredita(p, donazioniNuove) {
    if (!Array.isArray(donazioniNuove)) return 0;
    let n = 0;
    for (const d of donazioniNuove) {
      if (!semplice(d) || typeof d.id !== 'string' || !d.id || d.id.length > 40) continue;
      if (!propria(D.BY_KEY, d.carta) || p.credited.includes(d.id)) continue;
      p.credited.push(d.id);
      Profile.addCards(p, { [d.carta]: 1 });
      n++;
    }
    if (p.credited.length > 500) p.credited.splice(0, p.credited.length - 500);
    return n;
  }

  // Passaggio una tantum dal telefono al server. Si parte da un profilo nuovo e si copiano
  // SOLO i campi noti, uno per uno, pulendoli: niente di quello che arriva si prende com'è.
  const GIORNO = /^\d{4}-\d{2}-\d{2}$/;
  const ID_VALIDO = /^[A-HJ-NP-Z2-9]{6}$/;
  const lista = (v, max, filtro) => (Array.isArray(v) ? v.filter(filtro).slice(0, max) : []);
  const giorno = (v) => (typeof v === 'string' && GIORNO.test(v) ? v : '');

  function importa(dati, ctx) {
    ctx = ctx || {};
    const src = semplice(dati) ? dati : {};
    const ha = (k) => propria(src, k);
    const p = Profile.fresh();

    // Il codice: quello registrato sul server, o quello del telefono se ha la forma giusta
    if (typeof ctx.id === 'string') p.id = ctx.id;
    else if (ha('id') && ID_VALIDO.test(src.id)) p.id = src.id;
    else if (typeof ctx.rnd === 'function') {
      const lettere = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let id = '';
      for (let i = 0; i < 6; i++) id += lettere[Math.floor(ctx.rnd() * lettere.length)];
      p.id = id;
    }
    // Il seme del negozio lo sceglie il server (così le offerte non dipendono dal codice amico)
    completa(p, ctx.rnd);

    // Numeri con i tetti
    p.gems = ha('gems') ? intero(src.gems, 2000) : p.gems;
    p.gold = ha('gold') ? intero(src.gold, 100000) : p.gold;
    p.trophies = intero(src.trophies, 4000);
    p.best = Math.max(intero(src.best, 4000), p.trophies);
    for (const k of ['wins', 'losses', 'draws', 'chestIndex', 'lastRequest']) p[k] = intero(src[k], 1e14);

    // Carte: solo quelle vere, con livello e copie nei limiti
    if (semplice(src.cards)) {
      p.cards = {};
      for (const k of Object.keys(src.cards)) {
        if (!propria(D.BY_KEY, k) || !semplice(src.cards[k])) continue;
        p.cards[k] = { level: Math.max(1, intero(src.cards[k].level, D.MAX_LEVEL)), count: intero(src.cards[k].count, 1e6) };
      }
    }
    Profile.unlockArenaCards(p);

    // Bauli: sempre 4 posti, ognuno vuoto o ben formato
    const bauli = Array.isArray(src.chests) ? src.chests : [];
    p.chests = [0, 1, 2, 3].map((i) => {
      const c = bauli[i];
      if (!semplice(c) || !propria(D.CHESTS, c.type)) return null;
      const arena = Number.isInteger(c.arena) && c.arena >= 0 && c.arena < D.ARENAS.length ? c.arena : 0;
      // Il timer resta solo se il baule era in apertura, e mai oltre la durata vera del baule
      // (da adesso a adesso + durata). Senza l'ora del server il baule torna chiuso.
      let unlockAt = null;
      if (typeof c.unlockAt === 'number' && isFinite(c.unlockAt) && Number.isFinite(ctx.now)) {
        unlockAt = Math.max(ctx.now, Math.min(ctx.now + D.CHESTS[c.type].time * 1000, c.unlockAt));
      }
      return { type: c.type, arena, unlockAt };
    });

    // Torneo
    const t = src.tour;
    p.tour = semplice(t)
      ? { wins: intero(t.wins, Profile.TOUR_MAX_WINS), losses: intero(t.losses, Profile.TOUR_MAX_LOSSES), done: t.done === true }
      : null;

    p.roadClaimed = Array.from(new Set(lista(src.roadClaimed, 500, (x) => Number.isInteger(x) && x >= 0 && x <= 1e6)));
    p.shopBought = lista(src.shopBought, 20, (x) => typeof x === 'string' && x.length <= 40);
    p.credited = lista(src.credited, 500, (x) => typeof x === 'string' && x.length <= 40);
    p.giftDay = giorno(src.giftDay); p.shopDay = giorno(src.shopDay); p.tourDay = giorno(src.tourDay);
    p.arenaStats = {};
    if (semplice(src.arenaStats)) {
      for (const k of Object.keys(src.arenaStats)) {
        const i = Number(k), a = src.arenaStats[k];
        if (!Number.isInteger(i) || i < 0 || i >= D.ARENAS.length || !semplice(a)) continue;
        p.arenaStats[i] = { w: intero(a.w, 1e9), l: intero(a.l, 1e9), d: intero(a.d, 1e9), chests: intero(a.chests, 1e9) };
      }
    }

    // Campi del telefono: stessi controlli di "aggiorna"; se non vanno bene resta il valore di partenza
    const prova = (k, fn) => { if (ha(k)) { try { p[k] = fn(src[k]); } catch (e) { /* dato brutto: si ignora */ } } };
    prova('name', (v) => pulisciNome(v, p.name));
    prova('deck', (v) => pulisciMazzo(v, p));
    prova('friends', pulisciAmici);
    prova('chats', pulisciChat);
    prova('clan', (v) => (v == null ? null : Profile.cleanClan(v)));
    prova('sound', (v) => { if (typeof v !== 'boolean') nonValido(); return v; });
    prova('seen', pulisciSeen);

    p.server = true;
    return p;
  }

  // Aggiunge a un profilo del server i campi nati dopo (oggi solo il seme del negozio).
  // Restituisce true se ha cambiato qualcosa.
  function completa(p, rnd) {
    if (!semplice(p) || typeof rnd !== 'function') return false;
    if (Number.isInteger(p.shopSeed) && p.shopSeed >= 0) return false;
    p.shopSeed = Math.floor(rnd() * 4294967296);
    return true;
  }

  // ---- Passaggio dall'ospite a un account vero (vedi la funzione SQL guerra_adotta) ----
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // Il salvataggio di un ospite si può "adottare" solo se il token è davvero di un utente
  // anonimo e non è la stessa persona che chiede. Restituisce l'id dell'ospite oppure null.
  function ospiteAdottabile(utenteOspite, nuovo) {
    if (!semplice(utenteOspite) || utenteOspite.is_anonymous !== true) return null;
    if (typeof utenteOspite.id !== 'string' || !UUID.test(utenteOspite.id) || utenteOspite.id === nuovo) return null;
    return utenteOspite.id;
  }

  // Fino a questa data (16/11/2026, mezzanotte UTC) si accettano anche i progressi rimasti solo
  // sul telefono (versione vecchia senza accesso), sempre con i tetti di "importa".
  const SCADENZA_LOCALE = Date.UTC(2026, 10, 16, 0, 0, 0);
  // Cosa importare la prima volta: la riga vecchia del database, se c'è; altrimenti il profilo
  // mandato dal telefono (solo prima della scadenza); altrimenti niente (profilo nuovo).
  function daImportare(riga, locale, now) {
    if (semplice(riga)) return riga;
    if (semplice(locale) && Number.isFinite(now) && now < SCADENZA_LOCALE) return locale;
    return {};
  }

  const api = {
    CAMPI_SERVER, CAMPI_TELEFONO, SCADENZA_LOCALE, esegui, importa, completa, abbandonate, malformate, accredita,
    ospiteAdottabile, daImportare,
  };
  if (isNode) module.exports = api;
  else root.Azioni = api;
})(typeof self !== 'undefined' ? self : this);
