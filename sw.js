// Service worker: salva i file del gioco nel dispositivo, cosÃ¬ funziona anche offline.
// Se aggiungi o rinomini file, aggiorna l'elenco e aumenta il numero di versione.
const CACHE = 'guerra-dei-v75';

const FILES = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'fonts/fonts.css',
  'fonts/lilita-one-latin-1.woff2',
  'fonts/lilita-one-latin-ext-0.woff2',
  'fonts/nunito-latin-3.woff2',
  'fonts/nunito-latin-ext-2.woff2',
  'js/anti-frame.js',
  'js/consenso.js',
  'js/cards.js',
  'js/engine.js',
  'js/bot.js',
  'js/profile.js',
  'js/setup-battaglia.js',
  'js/rigioco.js',
  'js/sprites-chibi.js',
  'js/arene-art.js',
  'js/sprites.js',
  'js/render.js',
  'js/sound.js',
  'js/social.js',
  'js/captcha.js',
  'js/supabase.js',
  'js/cloud.js',
  'js/server.js',
  'js/push.js',
  'js/app.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  // suoni CC0 (Kenney, RandomMind)
  'suoni/chest.mp3',
  'suoni/emo_arrabbiato.mp3',
  'suoni/emo_dorme.mp3',
  'suoni/emo_felice.mp3',
  'suoni/emo_ok.mp3',
  'suoni/emo_piange.mp3',
  'suoni/emo_ride.mp3',
  'suoni/emo_spavento.mp3',
  'suoni/emo_stelle.mp3',
  'suoni/lose.mp3',
  'suoni/msg.mp3',
  'suoni/musica.mp3',
  'suoni/no.mp3',
  'suoni/play.mp3',
  'suoni/spell.mp3',
  'suoni/tap.mp3',
  'suoni/tick.mp3',
  'suoni/tower.mp3',
  'suoni/ultimo.mp3',
  'suoni/win.mp3',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  // Cancella le versioni vecchie
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  // Prima la rete (cosÃ¬ vedi sempre l'ultima versione) e aggiorna la copia salvata;
  // se sei offline usa la copia salvata.
  e.respondWith(
    // "no-cache": chiede sempre al sito se il file Ã¨ cambiato, invece di usare la copia del browser
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

// ---- Avvisi sul telefono (Web Push): arrivano anche a gioco chiuso ----
// Il server (funzione "avvisi") manda { titolo, testo, chiave }, cifrato solo per questo telefono.
self.addEventListener('push', (e) => {
  let dati = {};
  try { dati = e.data ? e.data.json() : {}; } catch (err) { /* messaggio illeggibile: testo di riserva */ }
  const titolo = typeof dati.titolo === 'string' ? dati.titolo.slice(0, 80) : 'Guerra degli Dèi';
  const testo = typeof dati.testo === 'string' ? dati.testo.slice(0, 200) : 'Un baule è pronto!';
  e.waitUntil(self.registration.showNotification(titolo, {
    body: testo,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    lang: 'it',
    // stessa chiave = l'avviso nuovo prende il posto di quello vecchio (niente doppioni)
    tag: typeof dati.chiave === 'string' ? dati.chiave.slice(0, 60) : 'guerra-avvisi',
  }));
});

// Tocco sulla notifica: apre il gioco (o torna alla scheda già aperta)
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const indirizzo = new URL('./', self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((finestre) => {
      for (const f of finestre) if (f.url.startsWith(indirizzo) && 'focus' in f) return f.focus();
      return self.clients.openWindow(indirizzo);
    })
  );
});
