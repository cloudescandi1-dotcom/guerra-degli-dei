// Service worker: salva i file del gioco nel dispositivo, così funziona anche offline.
// Se aggiungi o rinomini file, aggiorna l'elenco e aumenta il numero di versione.
const CACHE = 'guerra-dei-v18';

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
  'js/cards.js',
  'js/engine.js',
  'js/bot.js',
  'js/profile.js',
  'js/sprites.js',
  'js/render.js',
  'js/sound.js',
  'js/peerjs.min.js',
  'js/social.js',
  'js/app.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
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
  // Prima la rete (così vedi sempre l'ultima versione) e aggiorna la copia salvata;
  // se sei offline usa la copia salvata.
  e.respondWith(
    fetch(e.request)
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
