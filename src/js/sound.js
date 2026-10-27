// Effetti sonori creati al momento (niente file audio da scaricare).
(function (root) {
  'use strict';
  let ctx = null, on = true;

  function audio() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // Una nota: frequenza, durata, tipo d'onda, volume, ritardo
  function tone(freq, dur, type, vol, delay, slide) {
    const a = on && audio();
    if (!a) return;
    const t = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  const sounds = {
    tap: () => tone(660, 0.06, 'triangle', 0.08),
    play: () => { tone(330, 0.12, 'triangle', 0.15); tone(495, 0.12, 'triangle', 0.12, 0.06); },
    spell: () => tone(900, 0.35, 'sawtooth', 0.08, 0, 200),
    no: () => tone(160, 0.15, 'square', 0.08),
    tower: () => { tone(120, 0.6, 'sawtooth', 0.2, 0, 40); tone(80, 0.8, 'sine', 0.25, 0.05, 30); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.15, i * 0.12)),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.35, 'sine', 0.15, i * 0.18)),
    chest: () => [440, 554, 659, 880, 1109].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, i * 0.07)),
    msg: () => { tone(880, 0.08, 'sine', 0.1); tone(1320, 0.1, 'sine', 0.08, 0.08); },
    tick: () => tone(1000, 0.05, 'square', 0.05),
  };

  root.Sound = {
    play(name) { try { sounds[name] && sounds[name](); } catch (e) { /* audio non disponibile */ } },
    setOn(v) { on = v; },
    unlock() { audio(); },
  };
})(typeof self !== 'undefined' ? self : this);
