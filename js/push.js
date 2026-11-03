// Avvisi sul telefono anche a gioco chiuso ("il tuo baule è pronto"), con il Web Push.
// Qui c'è solo la parte del telefono: chiedere il permesso e iscriversi al servizio push del browser.
// QUANDO avvisare lo decide il server (avvisi.js), che manda le notifiche; le mostra sw.js.
(function (root) {
  'use strict';

  // La chiave PUBBLICA VAPID: la stampa "node tools/vapid.js" (vedi docs/avvisi.md).
  // Finché è vuota gli avvisi sono spenti e in Impostazioni l'interruttore non compare.
  const VAPID_PUBBLICA = 'BPbJu1zAHJwAAqrrrTdYgxwb3B8BCHYFLjZ1z4SKm_Xz2pRuG_P1Zy7f3HEpdL_9xyFHQGA85GA_xtmXyGymqvA';

  const nav = root.navigator || {};
  // Il browser sa fare il Web Push? (su iPhone e iPad solo dall'app installata sulla schermata Home, iOS 16.4+)
  const supportato = () => !!VAPID_PUBBLICA && 'serviceWorker' in nav && 'PushManager' in root && 'Notification' in root;
  const appleMobile = () => /iPad|iPhone|iPod/.test(nav.userAgent || '') || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  const installata = () => (root.matchMedia && root.matchMedia('(display-mode: standalone)').matches) || nav.standalone === true;
  // Su iPhone/iPad, dal browser normale: va prima messo il gioco sulla schermata Home
  const serveInstallare = () => !!VAPID_PUBBLICA && appleMobile() && !installata() && !supportato();
  const disponibile = () => !!VAPID_PUBBLICA;

  // La chiave in base64url diventa byte (così la vuole pushManager.subscribe)
  function byteDa(s) {
    const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
    return Uint8Array.from(b, (c) => c.charCodeAt(0));
  }
  const stessiByte = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]);

  async function iscrizione() {
    if (!supportato()) return null;
    const reg = await nav.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  }

  // Gli avvisi sono accesi su questo telefono? (permesso dato e iscrizione presente)
  async function acceso() {
    if (!supportato() || Notification.permission !== 'granted') return false;
    try { return !!(await iscrizione()); } catch (e) { return false; }
  }

  // Chiede il permesso e si iscrive. Va chiamata DENTRO un tocco del giocatore (Safari lo vuole).
  // Restituisce l'iscrizione da mandare al server ({ endpoint, keys }), oppure lancia un errore:
  // 'negato' (permesso rifiutato), 'annullato' (finestra chiusa), 'non_supportato'.
  async function accendi() {
    if (!supportato()) throw new Error('non_supportato');
    const permesso = await Notification.requestPermission();
    if (permesso !== 'granted') throw new Error(permesso === 'denied' ? 'negato' : 'annullato');
    const reg = await nav.serviceWorker.ready;
    const chiave = byteDa(VAPID_PUBBLICA);
    let sub = await reg.pushManager.getSubscription();
    // Iscrizione vecchia fatta con un'altra chiave: si toglie e si rifà
    if (sub && sub.options && sub.options.applicationServerKey && !stessiByte(new Uint8Array(sub.options.applicationServerKey), chiave)) {
      await sub.unsubscribe();
      sub = null;
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiave });
    return sub.toJSON();
  }

  // Toglie l'iscrizione da questo telefono. Restituisce l'endpoint da dire al server (o null).
  async function spegni() {
    const sub = await iscrizione();
    if (!sub) return null;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    return endpoint;
  }

  root.Push = { disponibile, supportato, serveInstallare, acceso, accendi, spegni, iscrizione };
})(typeof self !== 'undefined' ? self : this);
