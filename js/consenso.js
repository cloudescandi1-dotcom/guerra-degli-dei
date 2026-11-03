// Scelta sulla memoria del dispositivo (Accetta / Rifiuta).
// Le cose strettamente necessarie al gioco (profilo, salvataggio, accesso online) restano sempre
// nel dispositivo e non passano da qui. Quelle in piu' (statistiche, rivedi battaglia, musica)
// stanno solo in memoria finche' non si accetta; la scelta stessa viene sempre ricordata.
(function (root) {
  'use strict';
  const CHIAVE = 'guerra-consenso';
  const mem = {};

  function scelta() {
    try { return localStorage.getItem(CHIAVE); } catch (e) { return null; }
  }
  const ok = () => scelta() === 'si';

  const Archivio = {
    ok,
    get(k) {
      if (!ok()) return k in mem ? mem[k] : null;
      try { return localStorage.getItem(k); } catch (e) { return null; }
    },
    set(k, v) {
      if (!ok()) { mem[k] = String(v); return; }
      try { localStorage.setItem(k, v); } catch (e) { /* memoria piena: pazienza */ }
    },
    mostra() { document.getElementById('consenso').hidden = false; },
  };

  function scegli(si) {
    try {
      if (si) {
        localStorage.setItem(CHIAVE, 'si');
        for (const k in mem) localStorage.setItem(k, mem[k]);
      } else {
        // si tolgono solo le cose non necessarie: il profilo e il salvataggio del gioco restano
        for (const k in mem) localStorage.removeItem(k);
        for (const k of ['guerra-statistiche', 'guerra-repliche', 'guerra-musica']) localStorage.removeItem(k);
        localStorage.setItem(CHIAVE, 'no');
      }
    } catch (e) { /* memoria non disponibile */ }
    if (si) { for (const k in mem) delete mem[k]; }
    document.getElementById('consenso').hidden = true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('c-accetta').onclick = () => scegli(true);
    document.getElementById('c-rifiuta').onclick = () => scegli(false);
    if (scelta() == null) Archivio.mostra();
  });

  root.Archivio = Archivio;
})(window);
