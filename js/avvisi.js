// Gli avvisi sul telefono (notifiche "push"): QUANDO avvisare il giocatore e come controllare
// l'iscrizione che manda il telefono. Gira sul server (funzione "guerra"), con le stesse regole
// dei bauli di profile.js. Funzioni "pure": l'ora (now) arriva sempre da fuori.
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const D = isNode ? require('./cards.js') : root.GameData;
  const Profile = isNode ? require('./profile.js') : root.Profile;

  const MAX_ISCRIZIONI = 5;           // telefoni/browser iscritti al massimo per ogni giocatore
  const MAX_ENDPOINT = 1000;          // lunghezza massima dell'indirizzo del servizio push
  const FINESTRA = 10 * 60 * 1000;    // un avviso appena scaduto (10 minuti) si manda ancora
  const BAULE_MINIMO = 60;            // i bauli più corti di 1 minuto non si avvisano (sei ancora lì)
  const TITOLO = 'Guerra degli Dèi';

  const nonValido = () => { throw new Error('dati_non_validi'); };
  const semplice = (x) => !!x && typeof x === 'object' && !Array.isArray(x);

  // Solo i servizi push veri (Google, Mozilla, Apple, Microsoft): il server manda dati a questo
  // indirizzo, quindi non deve poter essere un sito qualsiasi scelto da chi imbroglia.
  const SERVIZI = ['fcm.googleapis.com', 'android.googleapis.com', 'updates.push.services.mozilla.com',
    'push.services.mozilla.com', 'web.push.apple.com', 'notify.windows.com'];
  function servizioAmmesso(host) {
    return SERVIZI.some((s) => host === s || host.endsWith('.' + s));
  }

  // L'indirizzo del servizio push: https, servizio conosciuto, non troppo lungo
  function pulisciEndpoint(v) {
    if (typeof v !== 'string' || v.length < 20 || v.length > MAX_ENDPOINT) nonValido();
    let u;
    try { u = new URL(v); } catch (e) { return nonValido(); }
    if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) nonValido();
    if (!servizioAmmesso(u.hostname.toLowerCase())) nonValido();
    return v;
  }

  // Le chiavi del telefono sono in "base64url" e hanno una lunghezza fissa:
  // p256dh = 65 byte (87 caratteri), auth = 16 byte (22 caratteri). Si toglie l'eventuale "=" finale.
  function chiave(v, caratteri) {
    if (typeof v !== 'string') nonValido();
    const s = v.replace(/=+$/, '');
    if (s.length !== caratteri || !/^[A-Za-z0-9_-]+$/.test(s)) nonValido();
    return s;
  }

  // L'iscrizione come la dà il browser (subscription.toJSON()): { endpoint, keys: { p256dh, auth } }.
  // Restituisce solo i 3 campi che servono, puliti; lancia 'dati_non_validi' se qualcosa non va.
  function pulisciIscrizione(v) {
    if (!semplice(v) || !semplice(v.keys)) nonValido();
    const p256dh = chiave(v.keys.p256dh, 87);
    // una chiave pubblica P-256 "non compressa" comincia sempre con il byte 4 (in base64url: "B")
    if (p256dh[0] !== 'B') nonValido();
    return { endpoint: pulisciEndpoint(v.endpoint), p256dh, auth: chiave(v.keys.auth, 22) };
  }

  // La prossima mezzanotte di Roma dopo "now". msToRomeMidnight conta 24 ore al giorno:
  // nei due giorni del cambio dell'ora sbaglia di un'ora, e qui la si corregge.
  function prossimaMezzanotte(now) {
    const oggi = Profile.romeDay(now);
    let t = now + Profile.msToRomeMidnight(now);
    if (Profile.romeDay(t) === oggi) t += 3600 * 1000;                     // un'ora troppo presto
    else if (Profile.romeDay(t - 3600 * 1000) !== oggi) t -= 3600 * 1000;  // un'ora troppo tardi
    return t;
  }

  // Tutti gli avvisi da programmare per questo profilo: [{ chiave, quando (ms), titolo, testo }].
  // La chiave è unica per ogni avviso: così lo stesso avviso non parte mai due volte.
  function momenti(p, now) {
    const lista = [];
    if (!semplice(p) || !Number.isFinite(now)) return lista;
    // 1) I bauli in apertura (e quelli appena pronti, se l'avviso non è ancora partito)
    const bauli = Array.isArray(p.chests) ? p.chests : [];
    bauli.forEach((c, slot) => {
      if (!semplice(c) || !Object.prototype.hasOwnProperty.call(D.CHESTS, c.type)) return;
      if (typeof c.unlockAt !== 'number' || !Number.isFinite(c.unlockAt)) return;
      if (D.CHESTS[c.type].time < BAULE_MINIMO || c.unlockAt < now - FINESTRA) return;
      const nome = D.CHESTS[c.type].name;
      lista.push({ chiave: 'baule-' + slot + '-' + c.unlockAt, quando: c.unlockAt, titolo: TITOLO,
        testo: nome + ' è pronto: vieni ad aprirlo!' });
    });
    // 2) Il baule del giorno: se l'hai già preso oggi, si avvisa alla prossima mezzanotte di Roma.
    // Se la mezzanotte è appena passata (10 minuti) e l'avevi preso ieri, l'avviso vale ancora.
    let mezzanotte = null;
    if (p.giftDay === Profile.romeDay(now)) mezzanotte = prossimaMezzanotte(now);
    else if (p.giftDay === Profile.romeDay(now - FINESTRA)) mezzanotte = prossimaMezzanotte(now - FINESTRA);
    if (mezzanotte != null) {
      lista.push({ chiave: 'dono-' + Profile.romeDay(mezzanotte), quando: mezzanotte, titolo: TITOLO,
        testo: 'Il baule del giorno ti aspetta: è gratis!' });
    }
    return lista;
  }

  const api = { MAX_ISCRIZIONI, MAX_ENDPOINT, FINESTRA, BAULE_MINIMO, pulisciEndpoint, pulisciIscrizione, prossimaMezzanotte, momenti };
  if (isNode) module.exports = api;
  else root.Avvisi = api;
})(typeof self !== 'undefined' ? self : this);
