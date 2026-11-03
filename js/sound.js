// Effetti sonori e musica da file (cartella suoni/). Sono suoni registrati e regalati a tutti
// con licenza CC0 (si possono usare anche in un gioco da vendere, senza citare nessuno):
// effetti di Kenney (kenney.nl), musica "Minstrel Dance" di RandomMind (opengameart.org).
(function (root) {
  'use strict';
  let ctx = null, on = true, master = null, musicBus = null;

  // nome del suono nel gioco = file suoni/<nome>.mp3
  const NOMI = ['tap', 'play', 'spell', 'no', 'tower', 'win', 'lose', 'chest', 'msg', 'tick', 'ultimo',
    'emo_felice', 'emo_ride', 'emo_arrabbiato', 'emo_ok', 'emo_spavento', 'emo_dorme', 'emo_piange', 'emo_stelle'];
  // volume di ogni suono (1 = pieno): i clic piccoli più bassi, così non danno fastidio
  const VOLUME = { tap: 0.5, tick: 0.5, msg: 0.6, no: 0.6 };
  const buffer = {};   // suoni già pronti da suonare
  let caricati = false;

  function audio() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      // un compressore in fondo: tanti suoni insieme restano puliti, senza gracchiare
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 4;
      comp.connect(ctx.destination);
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
      musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(comp);
    }
    if (ctx.state === 'suspended') ctx.resume();
    if (!caricati) { caricati = true; carica(); }
    return ctx;
  }

  // Scarica e prepara un file (la prima volta; poi lo tiene il service worker anche senza internet)
  function prepara(nome) {
    return fetch('suoni/' + nome + '.mp3')
      .then((r) => r.arrayBuffer())
      // il vecchio Safari vuole la versione con le funzioni di ritorno
      .then((dati) => new Promise((ok, no) => ctx.decodeAudioData(dati, ok, no)))
      .then((b) => { buffer[nome] = b; })
      .catch(() => { /* senza quel suono si gioca lo stesso */ });
  }
  function carica() {
    for (const n of NOMI) prepara(n);
    prepara('musica').then(() => { if (musicOn) avviaMusica(); });
  }

  function suona(nome) {
    const a = audio(), b = buffer[nome];
    if (!a || !b) return;
    const s = a.createBufferSource(), g = a.createGain();
    s.buffer = b;
    g.gain.value = VOLUME[nome] || 1;
    s.connect(g); g.connect(master);
    s.start();
  }

  // ---------------------------------------------------------------- musica di sottofondo
  // Il brano gira all'infinito; entra ed esce piano quando si accende o si spegne.
  let musicOn = false, musicSrc = null;
  function avviaMusica() {
    if (musicSrc || !buffer.musica || !ctx) return;
    musicSrc = ctx.createBufferSource();
    musicSrc.buffer = buffer.musica;
    musicSrc.loop = true;
    musicSrc.connect(musicBus);
    musicSrc.start();
  }
  function setMusic(v) {
    musicOn = !!v;
    const a = musicOn ? audio() : ctx;
    if (!a) return;
    musicBus.gain.setTargetAtTime(musicOn ? 0.35 : 0, a.currentTime, musicOn ? 0.8 : 0.2);
    if (musicOn) avviaMusica();
  }
  // con l'app in secondo piano tutto tace
  if (root.document) root.document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (root.document.hidden) ctx.suspend(); else ctx.resume();
  });

  root.Sound = {
    play(name) { try { if (on) suona(name); } catch (e) { /* audio non disponibile */ } },
    setOn(v) { on = v; },
    music(v) { try { setMusic(v); } catch (e) { /* audio non disponibile */ } },
    unlock() { audio(); },
  };
})(typeof self !== 'undefined' ? self : this);
