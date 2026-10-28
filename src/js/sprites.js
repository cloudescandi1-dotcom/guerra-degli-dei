// Disegni dei personaggi, dei templi e degli incantesimi, in SVG (immagini fatte di forme).
// Stile "modellino 3D": colori degli affreschi, sfumature di luce e ombra, metallo lucido,
// e un filtro di luce che dà volume a tutta la figura.
// Ogni disegno sta nel riquadro (-5,-8)-(105,100) con i piedi in basso (y ≈ 95).
// I pezzi della squadra usano il gradiente "tm" e i colori T.c / T.d / T.l / T.x (blu o rosso).
(function (root) {
  'use strict';
  const O = '#24160c';
  const S = (w) => `stroke="${O}" stroke-width="${w || 2.2}" stroke-linejoin="round" stroke-linecap="round"`;
  const TEAMS = [
    { c: '#3f7fe0', d: '#22509f', l: '#a6c8ff', x: '#163a78' },
    { c: '#e0453a', d: '#9e231b', l: '#ffb3a8', x: '#6e140e' },
  ];
  const VIEW = '-5 -8 110 108';
  const FOOT = (95 + 8) / 108;   // dove stanno i piedi, in proporzione all'altezza dell'immagine

  // Gradienti comuni a tutti i disegni
  const defs = (T) => `<defs>
  <linearGradient id="br" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe29a"/><stop offset=".45" stop-color="#e2a83f"/><stop offset="1" stop-color="#8f5a17"/></linearGradient>
  <linearGradient id="brv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#a86a1c"/></linearGradient>
  <linearGradient id="tm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.l}"/><stop offset=".35" stop-color="${T.c}"/><stop offset="1" stop-color="${T.x}"/></linearGradient>
  <linearGradient id="tmv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.l}"/><stop offset=".4" stop-color="${T.c}"/><stop offset="1" stop-color="${T.x}"/></linearGradient>
  <radialGradient id="sk" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffe0c2"/><stop offset=".6" stop-color="#f0b98c"/><stop offset="1" stop-color="#c98a5c"/></radialGradient>
  <linearGradient id="skl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f7cba2"/><stop offset="1" stop-color="#c98a5c"/></linearGradient>
  <linearGradient id="wd" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5228"/><stop offset=".5" stop-color="#c0814a"/><stop offset="1" stop-color="#6e3f1c"/></linearGradient>
  <linearGradient id="wdv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c88a52"/><stop offset="1" stop-color="#7a4520"/></linearGradient>
  <linearGradient id="st" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#cdd5df"/><stop offset="1" stop-color="#7d8896"/></linearGradient>
  <radialGradient id="fur" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#b07444"/><stop offset=".7" stop-color="#7f4b28"/><stop offset="1" stop-color="#5a3218"/></radialGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".5" stop-color="#f2c24a"/><stop offset="1" stop-color="#b8841c"/></linearGradient>
  <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6b0"/><stop offset=".5" stop-color="#ffd21a"/><stop offset="1" stop-color="#ffd21a" stop-opacity="0"/></radialGradient>
  <linearGradient id="mb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9cfbd"/><stop offset=".3" stop-color="#fffdf8"/><stop offset=".7" stop-color="#efe7d6"/><stop offset="1" stop-color="#bfb39a"/></linearGradient>
  <linearGradient id="mbv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf8"/><stop offset="1" stop-color="#cfc3a8"/></linearGradient>
  <radialGradient id="bone" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#fffbef"/><stop offset=".7" stop-color="#e9dfc6"/><stop offset="1" stop-color="#b9aa88"/></radialGradient>
  <radialGradient id="grn" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#9fdc84"/><stop offset=".6" stop-color="#4f9a3f"/><stop offset="1" stop-color="#2d6424"/></radialGradient>
  <radialGradient id="drk" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#6a5e68"/><stop offset=".7" stop-color="#3e3540"/><stop offset="1" stop-color="#231c25"/></radialGradient>
  <radialGradient id="wht" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#eeeaf2"/><stop offset="1" stop-color="#b9b2c8"/></radialGradient>
  <radialGradient id="pur" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#b98be6"/><stop offset=".7" stop-color="#7140a8"/><stop offset="1" stop-color="#3f1f66"/></radialGradient>
  <radialGradient id="terra" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#f0a46a"/><stop offset=".7" stop-color="#cf6d38"/><stop offset="1" stop-color="#8e4220"/></radialGradient>
  <filter id="vol" x="-15%" y="-15%" width="130%" height="130%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="b"/>
    <feSpecularLighting in="b" surfaceScale="3.5" specularConstant=".7" specularExponent="16" lighting-color="#ffffff" result="s"><fePointLight x="10" y="-30" z="70"/></feSpecularLighting>
    <feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>
    <feOffset in="SourceAlpha" dx="-2.5" dy="-3" result="o"/>
    <feComposite in="SourceAlpha" in2="o" operator="out" result="edge"/>
    <feGaussianBlur in="edge" stdDeviation="1.6" result="eb"/>
    <feFlood flood-color="#1a0d05" flood-opacity=".38"/>
    <feComposite in2="eb" operator="in" result="shade"/>
    <feComposite in="SourceGraphic" in2="s2" operator="arithmetic" k2="1" k3=".42" result="lit"/>
    <feMerge><feMergeNode in="lit"/><feMergeNode in="shade"/></feMerge>
  </filter>
</defs>`;

  // ---------- pezzi riutilizzabili ----------
  // Arto: tubo con contorno (tratto scuro largo + tratto colorato sopra)
  const limb = (d, fill, w) => `<path d="${d}" fill="none" stroke="${O}" stroke-width="${(w || 5.5) + 2.6}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${w || 5.5}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const hand = (x, y, fill) => `<circle cx="${x}" cy="${y}" r="4.2" fill="${fill || 'url(#sk)'}" ${S(1.8)}/>`;
  function eyes(x, y, iris, gap) {
    gap = gap || 5;
    return `<ellipse cx="${x - gap}" cy="${y}" rx="2.3" ry="2.8" fill="#fff" ${S(1)}/><ellipse cx="${x + gap}" cy="${y}" rx="2.3" ry="2.8" fill="#fff" ${S(1)}/>` +
      `<circle cx="${x - gap + 0.6}" cy="${y + 0.4}" r="1.5" fill="${iris || '#3b6fb0'}"/><circle cx="${x + gap + 0.6}" cy="${y + 0.4}" r="1.5" fill="${iris || '#3b6fb0'}"/>` +
      `<circle cx="${x - gap + 0.8}" cy="${y + 0.6}" r=".7" fill="${O}"/><circle cx="${x + gap + 0.8}" cy="${y + 0.6}" r=".7" fill="${O}"/>` +
      `<circle cx="${x - gap + 0.1}" cy="${y - 0.6}" r=".5" fill="#fff"/><circle cx="${x + gap + 0.1}" cy="${y - 0.6}" r=".5" fill="#fff"/>`;
  }
  const brows = (x, y, gap, angry) => angry
    ? `<path d="M${x - gap - 3.5} ${y - 1} L${x - gap + 3} ${y + 1} M${x + gap + 3.5} ${y - 1} L${x + gap - 3} ${y + 1}" stroke="${O}" stroke-width="1.9" stroke-linecap="round"/>`
    : `<path d="M${x - gap - 3} ${y} Q${x - gap} ${y - 1.6} ${x - gap + 3} ${y} M${x + gap - 3} ${y} Q${x + gap} ${y - 1.6} ${x + gap + 3} ${y}" fill="none" stroke="${O}" stroke-width="1.5" stroke-linecap="round"/>`;
  const cheeks = (x, y, gap) => `<ellipse cx="${x - gap}" cy="${y}" rx="2.4" ry="1.4" fill="#ef7f6e" opacity=".45"/><ellipse cx="${x + gap}" cy="${y}" rx="2.4" ry="1.4" fill="#ef7f6e" opacity=".45"/>`;
  // Testa con faccia; mood: 'ok' | 'angry' | 'grin'
  function head(x, y, r, o) {
    o = o || {};
    const fill = o.skin || 'url(#sk)';
    let m = `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${S()}/>` +
      `<path d="M${x - r * 0.6} ${y - r * 0.55} Q${x - r * 0.2} ${y - r * 0.85} ${x + r * 0.15} ${y - r * 0.8}" fill="none" stroke="#fff" stroke-width="1.6" opacity=".45" stroke-linecap="round"/>` +
      eyes(x, y + 1, o.iris) + brows(x, y - 2.6, 5, o.mood === 'angry') + cheeks(x, y + 5.5, 7.5);
    if (o.mood === 'grin') m += `<path d="M${x - 3.5} ${y + 7} Q${x} ${y + 10} ${x + 3.5} ${y + 7} Z" fill="#7a2a20" ${S(1.2)}/><path d="M${x - 2.6} ${y + 7.4} H${x + 2.6}" stroke="#fff" stroke-width="1"/>`;
    else if (o.mood === 'angry') m += `<path d="M${x - 3} ${y + 8.5} Q${x} ${y + 7} ${x + 3} ${y + 8.5}" fill="none" stroke="${O}" stroke-width="1.4" stroke-linecap="round"/>`;
    else m += `<path d="M${x - 2.6} ${y + 7.2} Q${x} ${y + 9} ${x + 2.6} ${y + 7.2}" fill="none" stroke="${O}" stroke-width="1.3" stroke-linecap="round"/>`;
    return m;
  }
  // Greca su una striscia orizzontale
  function meander(x, y, w, color, h) {
    h = h || 3;
    let d = `M${x} ${y + h}`;
    for (let i = x; i < x + w - 3; i += 3) d += ` h1.5 v-${h} h1.5 v${h}`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width=".9"/>`;
  }
  const sandals = (x1, x2, y) => `<path d="M${x1 - 5} ${y} H${x1 + 5} M${x2 - 5} ${y} H${x2 + 5}" stroke="#5a3418" stroke-width="3.6" stroke-linecap="round"/>`;
  const legs = (x1, x2, y1, y2, fill) => `<path d="M${x1 - 3.8} ${y1} L${x1 - 3.4} ${y2} L${x1 + 3.6} ${y2} L${x1 + 3.8} ${y1} Z M${x2 - 3.8} ${y1} L${x2 - 3.6} ${y2} L${x2 + 3.4} ${y2} L${x2 + 3.8} ${y1} Z" fill="${fill || 'url(#skl)'}" ${S()}/>`;
  function roundShield(x, y, r, emblem) {
    let rivets = '';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; rivets += `<circle cx="${(x + Math.cos(a) * r * 0.885).toFixed(1)}" cy="${(y + Math.sin(a) * r * 0.885).toFixed(1)}" r=".9" fill="#fff3c4"/>`; }
    const em = emblem === 'tridente'
      ? `<path d="M${x} ${y + r * 0.5} V${y - r * 0.45} M${x - r * 0.32} ${y - r * 0.4} V${y - r * 0.1} Q${x} ${y + r * 0.1} ${x + r * 0.32} ${y - r * 0.1} V${y - r * 0.4}" fill="none" stroke="#fdf6e3" stroke-width="3" stroke-linecap="round"/>`
      : `<path d="M${x - r * 0.37} ${y + r * 0.42} L${x} ${y - r * 0.47} L${x + r * 0.37} ${y + r * 0.42}" fill="none" stroke="#fdf6e3" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    return `<circle cx="${x + 2}" cy="${y + 2}" r="${r}" fill="#000" opacity=".2"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#br)" ${S()}/>` +
      `<circle cx="${x}" cy="${y}" r="${r * 0.76}" fill="url(#tm)" ${S(1.6)}/>` + rivets + em +
      `<path d="M${x - r * 0.74} ${y - r * 0.37} Q${x - r * 0.53} ${y - r * 0.79} ${x - r * 0.1} ${y - r * 0.9}" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>`;
  }
  const spear = (x, y1, y2) =>
    `<path d="M${x} ${y1 + 19} L${x} ${y2}" stroke="#a0683a" stroke-width="3.6" stroke-linecap="round"/><path d="M${x} ${y1 + 19} L${x} ${y2}" stroke="${O}" stroke-width=".8" opacity=".5"/>` +
    `<path d="M${x} ${y1} Q${x + 5} ${y1 + 10} ${x + 3} ${y1 + 18} L${x} ${y1 + 21} L${x - 3} ${y1 + 18} Q${x - 5} ${y1 + 10} ${x} ${y1} Z" fill="url(#st)" ${S(1.8)}/>` +
    `<path d="M${x} ${y1 + 3} V${y1 + 17}" stroke="#fff" stroke-width="1" opacity=".8"/>` +
    `<rect x="${x - 2.5}" y="${y1 + 18}" width="5" height="4" rx="1" fill="url(#br)" ${S(1.2)}/>`;
  function crest(x, y, w) {
    return `<path d="M${x - w} ${y + 10} Q${x - w + 2} ${y - 10} ${x} ${y - 9} Q${x + w - 2} ${y - 10} ${x + w} ${y + 10} Q${x + w - 6} ${y} ${x} ${y} Q${x - w + 6} ${y} ${x - w} ${y + 10} Z" fill="url(#tm)" ${S()}/>` +
      `<path d="M${x - w + 5} ${y + 5} Q${x - 10} ${y - 5} ${x} ${y - 5} M${x - w + 10} ${y + 6} Q${x - 6} ${y - 2} ${x + 2} ${y - 3} M${x - 2} ${y - 2} Q${x + 8} ${y - 4} ${x + w - 8} ${y + 3}" fill="none" stroke="#fff" stroke-width="1.2" opacity=".55"/>`;
  }

  // ---------- personaggi ----------
  const D = {};

  D.oplita = (T) =>
    `<path d="M33 50 Q24 72 28 92 L44 88 L50 60 L56 88 L72 92 Q76 72 67 50 Z" fill="url(#tm)" ${S()}/>` +
    `<path d="M32 70 Q30 82 32 90 M68 70 Q70 82 68 90" fill="none" stroke="${T.x}" stroke-width="1.6" opacity=".7"/>` +
    spear(80, 2, 96) +
    legs(44, 56, 74, 91) +
    `<path d="M40.5 78 Q44 76 47.5 78 L47.5 89 Q44 91 40.5 89 Z M52.5 78 Q56 76 59.5 78 L59.5 89 Q56 91 52.5 89 Z" fill="url(#br)" ${S(1.6)}/>` +
    `<path d="M42.5 80 V87 M54.5 80 V87" stroke="#fff3c4" stroke-width="1.2" opacity=".8"/>` + sandals(44, 56, 93) +
    `<path d="M36 66 H64 L65 78 H35 Z" fill="#f3ead6" ${S(1.6)}/>` +
    [37, 41.5, 46, 50.5, 55, 59.5].map((x) => `<rect x="${x}" y="66" width="4" height="11" rx="1" fill="url(#tmv)" ${S(1)}/>`).join('') +
    `<path d="M35 48 Q50 43 65 48 L66 67 Q50 71 34 67 Z" fill="url(#br)" ${S()}/>` +
    `<path d="M42 53 Q46 57 50 54 Q54 57 58 53" fill="none" stroke="#8f5a17" stroke-width="1.6"/><path d="M50 56 V66 M45 61 H55 M45.5 65 H54.5" stroke="#8f5a17" stroke-width="1.3"/>` +
    `<path d="M38 50 Q40 49 42 50 L41 62" fill="none" stroke="#fff3c4" stroke-width="1.6" opacity=".9"/>` +
    `<path d="M33 47 Q36 43 42 45 L41 52 Q36 52 33 47 Z M67 47 Q64 43 58 45 L59 52 Q64 52 67 47 Z" fill="url(#tm)" ${S(1.6)}/>` +
    limb('M65 50 Q74 54 79 60', '#f0b98c') + hand(80, 61) +
    head(50, 33, 14) + `<path d="M41 40 Q50 47 59 40 Q56 45 50 46 Q44 45 41 40 Z" fill="#6b3f22" ${S(1.2)}/>` +
    `<path d="M35 33 Q34 14 50 13 Q66 14 65 33 L65 44 Q62 47 58 45 L58 33 Q58 29 54 29 L46 29 Q42 29 42 33 L42 45 Q38 47 35 44 Z" fill="url(#br)" ${S()}/>` +
    `<path d="M48.3 29 V38 Q50 40 51.7 38 V29 Z" fill="url(#brv)" ${S(1.2)}/>` +
    `<path d="M37 26 Q50 19 63 26" fill="none" stroke="#8f5a17" stroke-width="1.4"/><path d="M38 22 Q42 16 48 15" fill="none" stroke="#fff6cf" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>` +
    `<path d="M44 13 L44 9 L56 9 L56 13 Z" fill="url(#br)" ${S(1.4)}/>` + crest(50, 8, 22) +
    roundShield(29, 64, 19);

  D.arcieri = (T) =>
    // faretra con le frecce dietro la schiena
    `<g transform="rotate(20 60 50)"><rect x="56" y="34" width="10" height="30" rx="3" fill="url(#wd)" ${S()}/>` +
    `<path d="M58 34 l-2 -9 M61 34 l0 -10 M64 34 l2 -9" stroke="#8a5228" stroke-width="1.6"/>` +
    `<path d="M54 24 l4 -3 l1 5 Z M59 22 l3 -4 l2 5 Z M64 24 l4 -2 l-1 5 Z" fill="url(#tm)" ${S(1)}/>` +
    `<path d="M57 44 H65 M57 54 H65" stroke="#e9b949" stroke-width="2"/></g>` +
    legs(44, 56, 74, 91) +
    `<path d="M41 80 H47 V88 H41 Z M53 80 H59 V88 H53 Z" fill="#8a5a34" ${S(1.4)}/>` + sandals(44, 56, 93) +
    `<path d="M35 64 H65 L68 79 Q50 83 32 79 Z" fill="url(#tmv)" ${S()}/>` + meander(34, 74, 33, '#fdf6e3') +
    `<path d="M36 46 Q50 41 64 46 L65 66 Q50 69 35 66 Z" fill="#f4eedf" ${S()}/>` +
    `<path d="M36 52 H64 M36 58 H64" stroke="${T.c}" stroke-width="2.4"/><path d="M50 46 V66" stroke="#d9cfb8" stroke-width="1.2"/>` +
    `<path d="M36 46 L64 64" stroke="#7a4520" stroke-width="3"/>` +
    // arco teso
    `<path d="M74 28 Q84 34 82 46 Q86 58 82 68 Q84 78 74 84" fill="none" stroke="${O}" stroke-width="5.6" stroke-linecap="round"/>` +
    `<path d="M74 28 Q84 34 82 46 Q86 58 82 68 Q84 78 74 84" fill="none" stroke="#a0683a" stroke-width="3.4" stroke-linecap="round"/>` +
    `<path d="M74 28 L60 56 L74 84" fill="none" stroke="#f3f0e8" stroke-width="1"/>` +
    `<path d="M58 56 H90" stroke="#7a4520" stroke-width="1.8"/><path d="M90 53 L96 56 L90 59 Z" fill="url(#st)" ${S(1.2)}/><path d="M56 53 l4 3 l-4 3" fill="url(#tm)" ${S(1)}/>` +
    limb('M64 50 Q72 50 82 56', '#f0b98c') + hand(83, 56) + limb('M38 50 Q46 56 58 56', '#f0b98c') + hand(59, 56) +
    head(50, 32, 14) +
    `<path d="M35 32 Q32 14 50 13 Q68 14 65 32 Q62 22 50 22 Q38 22 35 32 Z" fill="#4a2c18" ${S()}/>` +
    `<g fill="#4a2c18" ${S(1.4)}><circle cx="37" cy="22" r="4"/><circle cx="44" cy="17" r="4.4"/><circle cx="52" cy="16" r="4.4"/><circle cx="60" cy="19" r="4"/><circle cx="64" cy="26" r="3.4"/></g>` +
    `<path d="M35 26 Q50 20 65 26" fill="none" stroke="${T.c}" stroke-width="3.6" stroke-linecap="round"/>` +
    `<path d="M65 26 Q70 30 68 36" fill="none" stroke="${T.c}" stroke-width="2.4" stroke-linecap="round"/>`;

  D.frombolieri = (T) =>
    legs(44, 56, 74, 91) + sandals(44, 56, 93) +
    `<path d="M36 52 Q50 47 64 52 L67 80 Q50 84 33 80 Z" fill="url(#tmv)" ${S()}/>` + meander(34, 75, 32, '#fdf6e3') +
    `<path d="M38 52 L44 66 L50 56 L56 66 L62 52" fill="none" stroke="#8a5a34" stroke-width="5" stroke-linejoin="round"/>` +
    `<path d="M38 52 L44 66 L50 56 L56 66 L62 52" fill="none" stroke="#b07a4a" stroke-width="3" stroke-linejoin="round"/>` +
    `<ellipse cx="38" cy="72" rx="5" ry="6" fill="#a87448" ${S(1.6)}/><path d="M35 68 Q38 65 41 68" fill="none" stroke="#5a3418" stroke-width="1.4"/>` +
    // fionda che gira, con le linee del movimento
    `<path d="M66 50 Q80 30 86 14" fill="none" stroke="#7a4520" stroke-width="1.8"/><path d="M66 50 Q90 40 86 14" fill="none" stroke="#7a4520" stroke-width="1.8"/>` +
    `<path d="M74 10 Q88 2 96 14 M78 6 Q90 0 98 8" fill="none" stroke="#fff" stroke-width="1.6" opacity=".7" stroke-linecap="round"/>` +
    `<circle cx="86" cy="13" r="5" fill="#9a958c" ${S(1.6)}/><circle cx="84.5" cy="11.5" r="1.6" fill="#d8d4cc"/>` +
    limb('M62 54 Q66 50 67 47', '#f0b98c') + hand(67, 47) + limb('M38 54 Q32 60 32 66', '#f0b98c') + hand(32, 67) +
    head(50, 34, 14, { mood: 'grin' }) +
    `<g fill="#3d2414" ${S(1.4)}><circle cx="37" cy="27" r="5"/><circle cx="43" cy="21" r="5.2"/><circle cx="50" cy="19" r="5.2"/><circle cx="57" cy="21" r="5.2"/><circle cx="63" cy="27" r="5"/></g>` +
    `<path d="M37 30 Q50 25 63 30" fill="none" stroke="${T.c}" stroke-width="3.2" stroke-linecap="round"/>`;

  D.arpie = (T) => {
    const wing = (sgn) => {
      const x = (v) => 50 + sgn * v;
      return `<path d="M${x(6)} 50 Q${x(30)} 22 ${x(50)} 30 Q${x(42)} 36 ${x(48)} 42 Q${x(38)} 44 ${x(44)} 52 Q${x(32)} 52 ${x(36)} 60 Q${x(22)} 58 ${x(8)} 64 Z" fill="url(#tm)" ${S()}/>` +
        `<path d="M${x(14)} 48 Q${x(30)} 34 ${x(44)} 34 M${x(14)} 54 Q${x(28)} 46 ${x(40)} 46 M${x(12)} 60 Q${x(24)} 54 ${x(34)} 56" fill="none" stroke="${T.x}" stroke-width="1.4"/>` +
        `<path d="M${x(18)} 42 Q${x(30)} 30 ${x(40)} 30" fill="none" stroke="#fff" stroke-width="1.4" opacity=".6"/>`;
    };
    return wing(-1) + wing(1) +
      `<path d="M42 76 l-3 9 M46 78 l-1 9 M54 78 l1 9 M58 76 l3 9" stroke="${O}" stroke-width="4.4" stroke-linecap="round"/>` +
      `<path d="M42 76 l-3 9 M46 78 l-1 9 M54 78 l1 9 M58 76 l3 9" stroke="#e9b949" stroke-width="2.6" stroke-linecap="round"/>` +
      `<ellipse cx="50" cy="62" rx="13" ry="17" fill="url(#fur)" ${S()}/>` +
      `<path d="M42 56 q4 4 8 0 q4 4 8 0 M42 63 q4 4 8 0 q4 4 8 0 M44 70 q3 4 6 0 q3 4 6 0" fill="none" stroke="#d9a070" stroke-width="1.3"/>` +
      `<path d="M32 36 Q30 12 50 12 Q70 12 68 36 Q74 50 64 54 Q66 40 60 34 L40 34 Q34 40 36 54 Q26 50 32 36 Z" fill="#3b2232" ${S()}/>` +
      `<path d="M36 22 Q42 14 50 14" fill="none" stroke="#7a5a6a" stroke-width="1.6"/>` +
      `<path d="M34 34 L28 28 L36 31 Z M66 34 L72 28 L64 31 Z" fill="url(#sk)" ${S(1.2)}/>` +
      head(50, 36, 13, { mood: 'angry', iris: '#c0392b' }) +
      `<path d="M47 44 l1.5 2.5 l1.5 -2.5 M50 44 l1.5 2.5 l1.5 -2.5" fill="#fff" ${S(.8)}/>`;
  };

  D.scheletri = (T) =>
    `<path d="M45 74 V92 M55 74 V92" stroke="${O}" stroke-width="6.6" stroke-linecap="round"/><path d="M45 74 V92 M55 74 V92" stroke="#efe6cf" stroke-width="4" stroke-linecap="round"/>` +
    `<circle cx="45" cy="83" r="2.4" fill="#efe6cf" ${S(1.2)}/><circle cx="55" cy="83" r="2.4" fill="#efe6cf" ${S(1.2)}/>` +
    `<path d="M40 70 Q50 66 60 70 L58 76 Q50 73 42 76 Z" fill="url(#bone)" ${S(1.6)}/>` +
    `<path d="M50 50 V72" stroke="${O}" stroke-width="5.4"/><path d="M50 50 V72" stroke="#efe6cf" stroke-width="3"/>` +
    [52, 57, 62].map((y) => `<path d="M40 ${y} Q50 ${y - 3} 60 ${y}" fill="none" stroke="${O}" stroke-width="4.6" stroke-linecap="round"/><path d="M40 ${y} Q50 ${y - 3} 60 ${y}" fill="none" stroke="#efe6cf" stroke-width="2.4" stroke-linecap="round"/>`).join('') +
    // spada scheggiata
    `<path d="M66 70 L84 34 L87 36 L82 44 L84 46 L70 72 Z" fill="url(#st)" ${S(1.6)}/><path d="M62 68 L72 74" stroke="#5a3418" stroke-width="4" stroke-linecap="round"/>` +
    limb('M60 52 Q64 60 66 68', '#efe6cf', 3) + limb('M40 52 Q34 58 32 64', '#efe6cf', 3) +
    `<path d="M34 34 Q32 14 50 13 Q68 14 66 34 Q66 44 59 47 L59 51 L41 51 L41 47 Q34 44 34 34 Z" fill="url(#bone)" ${S()}/>` +
    `<path d="M58 18 L55 24 L58 27" fill="none" stroke="#8f8068" stroke-width="1.2"/>` +
    `<path d="M38 32 Q44 26 48 33 Q46 40 40 38 Q36 36 38 32 Z M62 32 Q56 26 52 33 Q54 40 60 38 Q64 36 62 32 Z" fill="#1a0f0a"/>` +
    `<circle cx="43" cy="34" r="2.2" fill="${T.l}"/><circle cx="57" cy="34" r="2.2" fill="${T.l}"/><circle cx="43" cy="34" r="4" fill="${T.c}" opacity=".35"/><circle cx="57" cy="34" r="4" fill="${T.c}" opacity=".35"/>` +
    `<path d="M49 39 L50 42 L51 39 Z" fill="#1a0f0a"/>` +
    `<path d="M43 47 V51 M46.5 47 V51 M50 47 V51 M53.5 47 V51 M57 47 V51" stroke="${O}" stroke-width="1.2"/>` +
    // elmo arrugginito
    `<path d="M33 26 Q34 10 50 10 Q66 10 67 26 Q60 20 50 20 Q40 20 33 26 Z" fill="#9a7a4a" ${S(1.8)}/><path d="M38 18 Q44 13 50 13" fill="none" stroke="#c8a870" stroke-width="1.4"/>` +
    roundShield(31, 66, 12);

  D.legionari = (T) =>
    legs(44, 56, 76, 91) +
    `<path d="M40 84 H48 M52 84 H60 M40 88 H48 M52 88 H60" stroke="#5a3418" stroke-width="1.4"/>` + sandals(44, 56, 93) +
    `<path d="M36 64 H64 L66 79 Q50 82 34 79 Z" fill="url(#tmv)" ${S()}/>` +
    [38, 43, 48, 53, 58].map((x) => `<rect x="${x}" y="66" width="3.6" height="12" rx="1" fill="#7a4520" ${S(.8)}/><circle cx="${x + 1.8}" cy="76" r=".9" fill="url(#gold)"/>`).join('') +
    // lorica segmentata a bande
    `<path d="M35 46 Q50 41 65 46 L66 66 Q50 69 34 66 Z" fill="url(#st)" ${S()}/>` +
    [51, 56, 61].map((y) => `<path d="M35 ${y} Q50 ${y + 2.5} 65 ${y}" fill="none" stroke="#6d7783" stroke-width="1.6"/>`).join('') +
    `<path d="M36 46 Q50 51 64 46" fill="none" stroke="#6d7783" stroke-width="1.6"/><path d="M38 48 V62" stroke="#fff" stroke-width="1.6" opacity=".7"/>` +
    `<circle cx="42" cy="49" r="1" fill="url(#gold)"/><circle cx="58" cy="49" r="1" fill="url(#gold)"/>` +
    // gladio
    `<path d="M70 64 L84 40 L87 41.5 L74 66 Z" fill="url(#st)" ${S(1.6)}/><path d="M67 62 L75 67" stroke="#e9b949" stroke-width="3" stroke-linecap="round"/><circle cx="68" cy="68" r="2.2" fill="url(#gold)" ${S(1)}/>` +
    limb('M64 50 Q70 58 70 64', '#f0b98c') + hand(70, 65) +
    head(50, 32, 14, { mood: 'angry' }) +
    // elmo (galea) con guanciali e cresta trasversale
    `<path d="M34 32 Q33 14 50 13 Q67 14 66 32 L66 36 L34 36 Z" fill="url(#st)" ${S()}/>` +
    `<path d="M34 34 Q31 42 37 46 L40 44 L39 34 Z M66 34 Q69 42 63 46 L60 44 L61 34 Z" fill="url(#st)" ${S(1.6)}/>` +
    `<path d="M32 34 H68" stroke="${O}" stroke-width="3.6" stroke-linecap="round"/><path d="M32 34 H68" stroke="#e9b949" stroke-width="2" stroke-linecap="round"/>` +
    `<path d="M38 22 Q42 16 48 15" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".9"/>` +
    `<path d="M26 16 Q50 2 74 16 L70 20 Q50 9 30 20 Z" fill="url(#tm)" ${S()}/>` +
    `<path d="M30 15 l3 4 M36 12 l2 5 M43 10 l1 5 M50 9 v5 M57 10 l-1 5 M64 12 l-2 5 M70 15 l-3 4" stroke="${T.x}" stroke-width="1"/>` +
    // scudo (scutum) con le ali e il fulmine dorati
    `<path d="M14 46 Q24 43 34 46 L34 88 Q24 91 14 88 Z" fill="#000" opacity=".2" transform="translate(2 2)"/>` +
    `<path d="M14 46 Q24 43 34 46 L34 88 Q24 91 14 88 Z" fill="url(#tm)" ${S()}/>` +
    `<path d="M16.5 49 Q24 46.5 31.5 49 V85 Q24 87.5 16.5 85 Z" fill="none" stroke="#e9b949" stroke-width="1.6"/>` +
    `<circle cx="24" cy="67" r="5" fill="url(#gold)" ${S(1.4)}/>` +
    `<path d="M18 58 Q21 62 22 64 M30 58 Q27 62 26 64 M18 76 Q21 72 22 70 M30 76 Q27 72 26 70" fill="none" stroke="#e9b949" stroke-width="1.6"/>` +
    `<path d="M24 50 L22 56 L26 56 L24 61 M24 73 L22 78 L26 78 L24 84" fill="none" stroke="#e9b949" stroke-width="1.4"/>` +
    `<path d="M17 50 V72" stroke="#fff" stroke-width="1.6" opacity=".5"/>`;

  D.centauro = (T) =>
    `<path d="M84 58 Q98 62 96 80 Q92 70 86 68" fill="#3d2414" ${S(1.6)}/>` +
    // zampe
    `<path d="M40 72 Q38 82 40 91 M50 74 Q50 82 51 91 M70 74 Q72 82 70 91 M80 70 Q84 80 82 91" fill="none" stroke="${O}" stroke-width="8" stroke-linecap="round"/>` +
    `<path d="M40 72 Q38 82 40 91 M50 74 Q50 82 51 91 M70 74 Q72 82 70 91 M80 70 Q84 80 82 91" fill="none" stroke="#9a5e32" stroke-width="5.4" stroke-linecap="round"/>` +
    `<path d="M36 92 h8 M47 92 h8 M66 92 h8 M78 92 h8" stroke="#2d2420" stroke-width="3.4" stroke-linecap="round"/>` +
    // corpo di cavallo
    `<path d="M36 62 Q38 52 52 54 L76 54 Q88 54 88 64 Q88 76 74 76 L46 76 Q36 74 36 62 Z" fill="url(#fur)" ${S()}/>` +
    `<path d="M44 58 Q60 55 80 58" fill="none" stroke="#d9a070" stroke-width="1.8" opacity=".8"/><path d="M56 66 Q62 70 70 68" fill="none" stroke="#5a3218" stroke-width="1.3"/>` +
    // gualdrappa con la greca
    `<path d="M52 54 L74 54 L72 70 Q62 72 54 70 Z" fill="url(#tm)" ${S(1.6)}/>` + meander(54, 64, 18, '#fdf6e3', 2.6) +
    // busto umano
    `<path d="M30 40 Q40 36 48 40 L50 62 L30 62 Z" fill="url(#skl)" ${S()}/>` +
    `<path d="M34 46 Q39 49 44 46 M39 49 V58" fill="none" stroke="#b07850" stroke-width="1.3"/>` +
    `<path d="M29 41 L49 58" stroke="${O}" stroke-width="6.2" stroke-linecap="round"/><path d="M29 41 L49 58" stroke="${T.c}" stroke-width="4" stroke-linecap="round"/>` +
    // giavellotto
    spear(18, 6, 82) +
    limb('M32 44 Q24 50 19 52', '#f0b98c') + hand(19, 52) +
    head(39, 28, 13) +
    `<path d="M29 32 Q28 44 39 46 Q50 44 49 32 Q45 38 39 38 Q33 38 29 32 Z" fill="#4a2c18" ${S(1.4)}/>` +
    `<path d="M35.5 36.5 Q39 38.5 42.5 36.5" fill="none" stroke="${O}" stroke-width="1.3"/>` +
    `<path d="M27 26 Q26 12 39 12 Q52 12 51 26 Q47 19 39 19 Q31 19 27 26 Z" fill="#4a2c18" ${S()}/>` +
    // corona d'alloro
    `<path d="M27 22 Q39 15 51 22" fill="none" stroke="#3f7a2a" stroke-width="2"/>` +
    [29, 33, 37, 41, 45, 49].map((x, i) => `<ellipse cx="${x}" cy="${20 - Math.sin((i / 5) * Math.PI) * 3}" rx="2.2" ry="1.2" fill="#6fbf4a" ${S(.8)} transform="rotate(${i * 12 - 30} ${x} ${20 - Math.sin((i / 5) * Math.PI) * 3})"/>`).join('');

  D.minotauro = (T) =>
    // ascia bipenne (labrys), ben visibile a destra
    `<path d="M86 30 L86 96" stroke="#a0683a" stroke-width="4.5" stroke-linecap="round"/><path d="M86 30 L86 96" stroke="${O}" stroke-width=".8" opacity=".5"/>` +
    `<path d="M86 34 Q102 26 103 50 Q96 45 86 47 Z" fill="url(#st)" ${S()}/><path d="M86 34 Q70 26 69 50 Q76 45 86 47 Z" fill="url(#st)" ${S()}/>` +
    `<path d="M91 33 Q99 33 100 42 M81 33 Q73 33 72 42" fill="none" stroke="#fff" stroke-width="1.4" opacity=".9"/>` +
    `<path d="M74 44 l3 -3 l3 3 M92 44 l3 -3 l3 3" fill="none" stroke="#5b6672" stroke-width="1"/>` +
    `<rect x="83" y="36" width="6" height="12" rx="2" fill="url(#gold)" ${S(1.4)}/>` +
    `<path d="M36 72 Q32 82 36 90 L46 90 Q48 80 46 72 Z M54 72 Q52 80 54 90 L64 90 Q68 82 64 72 Z" fill="url(#fur)" ${S()}/>` +
    `<path d="M37 78 l3 2 M39 84 l3 2 M57 78 l3 2 M57 84 l3 2" stroke="#4a2810" stroke-width="1.2"/>` +
    `<path d="M34 90 H47 L46 95 H35 Z M53 90 H66 L65 95 H54 Z" fill="#2d2420" ${S(1.6)}/><path d="M40.5 90 V95 M59.5 90 V95" stroke="#555" stroke-width="1"/>` +
    `<path d="M30 62 H70 L74 80 Q50 84 26 80 Z" fill="url(#tm)" ${S()}/><path d="M29 75 H71" stroke="#fdf6e3" stroke-width="3"/>` + meander(30, 73.5, 40, T.x) +
    `<rect x="29" y="59" width="42" height="6" rx="2" fill="url(#gold)" ${S(1.6)}/><circle cx="50" cy="62" r="4" fill="url(#gold)" ${S(1.4)}/><circle cx="50" cy="62" r="1.6" fill="#c0392b"/>` +
    `<path d="M26 40 Q50 30 74 40 L72 61 Q50 65 28 61 Z" fill="url(#fur)" ${S()}/>` +
    `<path d="M34 44 Q42 50 50 46 Q58 50 66 44" fill="none" stroke="#4a2810" stroke-width="1.8"/><path d="M50 48 V60 M43 53 H57 M44 58 H56" stroke="#4a2810" stroke-width="1.4"/>` +
    `<path d="M32 42 Q36 40 40 42" fill="none" stroke="#d9a070" stroke-width="2" opacity=".8"/>` +
    limb('M28 42 Q16 50 18 62', '#8a552e', 9) + limb('M72 42 Q82 46 85 56', '#8a552e', 9) +
    `<rect x="14" y="56" width="9" height="6" rx="2" fill="url(#gold)" ${S(1.4)}/><rect x="79" y="50" width="9" height="6" rx="2" fill="url(#gold)" ${S(1.4)}/>` +
    hand(18, 66, 'url(#fur)') + hand(86, 60, 'url(#fur)') +
    `<path d="M33 20 Q14 22 10 4 Q20 12 32 12 Z M67 20 Q86 22 90 4 Q80 12 68 12 Z" fill="#f3ead6" ${S()}/>` +
    `<path d="M18 15 l2 -3 M23 17 l1 -4 M82 15 l-2 -3 M77 17 l-1 -4" stroke="#b9a98a" stroke-width="1.4"/>` +
    `<path d="M10 4 Q14 8 16 12 M90 4 Q86 8 84 12" fill="none" stroke="#3a2a1a" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="M30 22 Q20 24 22 30 Q28 30 33 26 Z M70 22 Q80 24 78 30 Q72 30 67 26 Z" fill="#7f4b28" ${S(1.6)}/>` +
    `<path d="M33 14 Q50 4 67 14 Q72 28 64 38 L36 38 Q28 28 33 14 Z" fill="url(#fur)" ${S()}/>` +
    `<path d="M40 10 Q46 6 52 7 Q46 12 44 18 Q42 12 40 10 Z" fill="#5a3218"/>` +
    `<path d="M38 21 L46 24 L45 27 L38 25 Z M62 21 L54 24 L55 27 L62 25 Z" fill="#ffd6a0" ${S(1.2)}/>` +
    `<circle cx="42.5" cy="24.8" r="1.6" fill="#d62d20"/><circle cx="57.5" cy="24.8" r="1.6" fill="#d62d20"/>` +
    `<path d="M36 19 L47 22.5 M64 19 L53 22.5" stroke="${O}" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="M38 30 Q50 25 62 30 Q66 40 58 44 Q50 47 42 44 Q34 40 38 30 Z" fill="#e3b48c" ${S()}/>` +
    `<ellipse cx="44.5" cy="36" rx="2.4" ry="3" fill="#3a2010"/><ellipse cx="55.5" cy="36" rx="2.4" ry="3" fill="#3a2010"/>` +
    `<path d="M42 31 Q46 29 50 30" fill="none" stroke="#fff3e3" stroke-width="1.6" opacity=".9"/>` +
    `<circle cx="50" cy="44" r="4.4" fill="none" stroke="#e9b949" stroke-width="2.6"/>` +
    `<path d="M40 38 Q34 40 32 38 M60 38 Q66 40 68 38" fill="none" stroke="#fff" stroke-width="1.4" opacity=".6"/>`;

  D.testuggine = (T) => {
    const scutum = (x, y, w, h) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="url(#tm)" ${S()}/>` +
      `<rect x="${x + 2.5}" y="${y + 2.5}" width="${w - 5}" height="${h - 5}" rx="3" fill="none" stroke="#e9b949" stroke-width="1.5"/>` +
      `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${Math.min(w, h) * 0.16}" fill="url(#gold)" ${S(1.2)}/>` +
      `<path d="M${x + 4} ${y + h * 0.3} Q${x + w / 2} ${y + h * 0.42} ${x + w - 4} ${y + h * 0.3} M${x + 4} ${y + h * 0.7} Q${x + w / 2} ${y + h * 0.58} ${x + w - 4} ${y + h * 0.7}" fill="none" stroke="#e9b949" stroke-width="1.3"/>` +
      `<path d="M${x + 3} ${y + 4} V${y + h - 6}" stroke="#fff" stroke-width="1.4" opacity=".45"/>`;
    return `<path d="M30 84 V93 M40 84 V93 M60 84 V93 M70 84 V93" stroke="${O}" stroke-width="6.4" stroke-linecap="round"/>` +
      `<path d="M30 84 V93 M40 84 V93 M60 84 V93 M70 84 V93" stroke="#f0b98c" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M26 94 h8 M36 94 h8 M56 94 h8 M66 94 h8" stroke="#5a3418" stroke-width="3.4" stroke-linecap="round"/>` +
      // tetto di scudi
      `<path d="M14 30 Q50 12 86 30 L84 44 Q50 30 16 44 Z" fill="url(#tm)" ${S()}/>` +
      `<path d="M30 22 L28 38 M50 17 V33 M70 22 L72 38" stroke="${T.x}" stroke-width="1.6"/>` +
      `<path d="M20 30 Q50 16 80 30" fill="none" stroke="#e9b949" stroke-width="1.6"/><path d="M24 28 Q36 22 46 20" fill="none" stroke="#fff" stroke-width="1.6" opacity=".5"/>` +
      // elmi che spuntano
      `<path d="M32 44 Q32 36 40 36 Q48 36 48 44 Z M52 44 Q52 36 60 36 Q68 36 68 44 Z" fill="url(#st)" ${S(1.6)}/>` +
      eyes(40, 46, '#3b6fb0', 3) + eyes(60, 46, '#3b6fb0', 3) +
      // punte delle spade
      `<path d="M49 52 L50 44 L51 52 Z" fill="url(#st)" ${S(1)}/>` +
      scutum(14, 46, 34, 40) + scutum(52, 46, 34, 40);
  };

  D.gladiatore = (T) =>
    // tridente
    `<path d="M80 18 V96" stroke="#a0683a" stroke-width="3.6" stroke-linecap="round"/>` +
    `<path d="M71 4 V16 Q80 24 89 16 V4 M80 2 V22" fill="none" stroke="${O}" stroke-width="5.4" stroke-linecap="round"/>` +
    `<path d="M71 4 V16 Q80 24 89 16 V4 M80 2 V22" fill="none" stroke="#dfe4ea" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M69 6 L71 1 L73 6 M78 4 L80 -1 L82 4 M87 6 L89 1 L91 6" fill="#dfe4ea" ${S(1)}/>` +
    legs(44, 56, 74, 91) + `<path d="M40.5 78 H47.5 V84 H40.5 Z" fill="url(#br)" ${S(1.2)}/>` + sandals(44, 56, 93) +
    // rete
    `<path d="M10 56 Q20 46 34 54 L32 82 Q18 88 8 78 Z" fill="none" stroke="${O}" stroke-width="2.6"/><path d="M10 56 Q20 46 34 54 L32 82 Q18 88 8 78 Z" fill="none" stroke="#d9c79a" stroke-width="1.4"/>` +
    `<path d="M12 64 L33 62 M10 72 L33 70 M16 52 L14 84 M24 50 L22 86" stroke="#d9c79a" stroke-width="1.2"/><g fill="#a89060"><circle cx="16" cy="63" r="1.2"/><circle cx="24" cy="62" r="1.2"/><circle cx="15" cy="71" r="1.2"/><circle cx="23" cy="70" r="1.2"/></g>` +
    `<path d="M36 64 H64 L66 78 L50 74 L34 78 Z" fill="url(#tmv)" ${S()}/><rect x="35" y="61" width="30" height="5" rx="2" fill="url(#gold)" ${S(1.4)}/>` +
    `<path d="M34 42 Q50 36 66 42 L64 64 H36 Z" fill="url(#skl)" ${S()}/>` +
    `<path d="M41 47 Q45 51 50 48 Q55 51 59 47 M50 50 V62 M44 55 H56 M45 59.5 H55" fill="none" stroke="#b07850" stroke-width="1.4"/>` +
    // spallaccio (galerus) e manica
    `<path d="M24 38 L40 42 L38 52 L22 46 Z" fill="url(#st)" ${S(1.6)}/><path d="M25 40 L39 44" stroke="#fff" stroke-width="1.2" opacity=".7"/>` +
    limb('M64 44 Q74 50 79 58', '#f0b98c', 6) +
    `<path d="M66 46 L72 49 L78 56 L74 60 L68 54 Z" fill="none" stroke="#8a6a4a" stroke-width="1.3"/>` + hand(80, 58) +
    limb('M36 46 Q30 52 30 58', '#f0b98c', 6) + hand(30, 59) +
    head(50, 28, 13, { mood: 'angry' }) +
    `<path d="M37 26 Q36 13 50 13 Q64 13 63 26 Q58 19 50 19 Q42 19 37 26 Z" fill="#2d1a10" ${S()}/>` +
    `<path d="M44 37 Q50 40 56 37" fill="none" stroke="#2d1a10" stroke-width="1.4"/><path d="M60 24 l3 5" stroke="#c0392b" stroke-width="1.4"/>`;

  D.male = (T) =>
    `<path d="M40 52 Q18 26 2 40 Q12 44 8 54 Q20 48 24 60 Q32 52 40 58 Z" fill="url(#drk)" ${S()}/>` +
    `<path d="M60 52 Q82 26 98 40 Q88 44 92 54 Q80 48 76 60 Q68 52 60 58 Z" fill="url(#drk)" ${S()}/>` +
    `<path d="M38 50 L14 40 M36 54 L18 52 M62 50 L86 40 M64 54 L82 52" stroke="#6a5e68" stroke-width="1.2"/>` +
    `<path d="M44 70 Q46 82 40 88 M56 70 Q54 82 60 88" fill="none" stroke="${O}" stroke-width="2.4" stroke-linecap="round"/>` +
    `<path d="M50 74 Q58 86 66 82" fill="none" stroke="#3f1f66" stroke-width="2.4" stroke-linecap="round"/><path d="M66 82 l4 -1 l-2 4 Z" fill="#3f1f66"/>` +
    `<circle cx="50" cy="56" r="18" fill="url(#pur)" ${S()}/>` +
    `<path d="M36 42 L32 26 L44 38 Z M64 42 L68 26 L56 38 Z" fill="url(#tm)" ${S(1.6)}/>` +
    `<path d="M38 50 Q44 46 48 52 Q44 58 38 54 Z M62 50 Q56 46 52 52 Q56 58 62 54 Z" fill="#ffe14d" ${S(1.2)}/>` +
    `<path d="M43 49 V55 M57 49 V55" stroke="${O}" stroke-width="1.6"/>` +
    `<path d="M40 64 Q50 70 60 64" fill="#1a0d22" ${S(1.4)}/><path d="M44 65 l2 3 l2 -3 M52 65 l2 3 l2 -3" fill="#fff" ${S(.6)}/>` +
    `<path d="M40 44 Q46 40 52 41" fill="none" stroke="#d8b8f0" stroke-width="1.6" opacity=".7"/>`;

  D.acheo = (T) =>
    legs(44, 56, 74, 91) + sandals(44, 56, 93) +
    `<path d="M36 50 Q50 45 64 50 L67 79 Q50 83 33 79 Z" fill="url(#tmv)" ${S()}/>` + meander(34, 74, 32, '#fdf6e3') +
    `<path d="M36 50 Q50 45 64 50 L64 64 Q50 67 36 64 Z" fill="#efe6cf" ${S(1.6)}/><path d="M36 56 H64" stroke="#d49a3a" stroke-width="2"/>` +
    `<path d="M70 70 L86 44 L88.6 45.5 L73 72 Z" fill="url(#st)" ${S(1.6)}/><path d="M67 68 L75 73" stroke="#5a3418" stroke-width="3.6" stroke-linecap="round"/>` +
    limb('M64 52 Q70 62 70 68', '#f0b98c') + hand(70, 69) +
    head(50, 33, 14, { mood: 'angry' }) +
    `<path d="M41 40 Q50 47 59 40 Q55 45 50 45 Q45 45 41 40 Z" fill="#7a4a24" ${S(1)}/>` +
    `<path d="M35 32 Q34 15 50 14 Q66 15 65 32 L60 32 Q58 24 50 24 Q42 24 40 32 Z" fill="url(#br)" ${S()}/>` +
    `<path d="M38 24 Q42 18 48 17" fill="none" stroke="#fff6cf" stroke-width="2" stroke-linecap="round" opacity=".9"/>` +
    `<path d="M50 14 Q74 4 80 30 Q72 20 52 20 Z" fill="url(#tm)" ${S()}/><path d="M56 14 Q70 10 76 22" fill="none" stroke="#fff" stroke-width="1.2" opacity=".5"/>` +
    roundShield(31, 64, 15, 'tridente');

  D.ciclope = (T) =>
    `<path d="M34 74 Q32 84 34 92 L44 92 Q46 84 44 74 Z M56 74 Q54 84 56 92 L66 92 Q68 84 66 74 Z" fill="#d6b48a" ${S()}/>` + sandals(39, 61, 94) +
    `<path d="M24 62 H76 L80 82 Q50 88 20 82 Z" fill="url(#fur)" ${S()}/>` +
    `<path d="M24 78 L30 86 L36 79 L42 87 L48 80 L54 87 L60 80 L66 86 L72 79 L78 84" fill="none" stroke="#5a3218" stroke-width="1.6"/>` +
    `<path d="M22 62 H78" stroke="${O}" stroke-width="6.6"/><path d="M22 62 H78" stroke="${T.c}" stroke-width="4.2"/>` +
    `<path d="M16 36 Q50 22 84 36 L78 66 Q50 72 22 66 Z" fill="#e2c19a" ${S()}/>` +
    `<path d="M30 42 Q40 50 50 44 Q60 50 70 42" fill="none" stroke="#b88f63" stroke-width="2"/><path d="M50 48 V62 M40 56 Q50 60 60 56" fill="none" stroke="#b88f63" stroke-width="1.8"/>` +
    `<path d="M22 40 Q28 36 34 38" fill="none" stroke="#fff3e0" stroke-width="2.4" opacity=".7"/>` +
    // clava chiodata
    `<path d="M80 16 Q98 18 92 50 L86 80 L78 78 L84 48 Q86 30 78 24 Z" fill="url(#wd)" ${S()}/>` +
    `<g fill="url(#st)" ${S(1)}><path d="M90 22 l6 -2 l-4 5 Z"/><path d="M93 36 l6 1 l-5 3 Z"/><path d="M80 18 l-2 -6 l5 3 Z"/></g>` +
    `<circle cx="86" cy="30" r="1.8" fill="#5a3218"/><circle cx="84" cy="44" r="1.8" fill="#5a3218"/>` +
    limb('M80 40 Q86 52 84 64', '#e2c19a', 10) + hand(84, 66, '#e2c19a') + limb('M20 40 Q12 52 16 64', '#e2c19a', 10) + hand(16, 66, '#e2c19a') +
    `<circle cx="50" cy="22" r="18" fill="#e2c19a" ${S()}/>` +
    `<path d="M34 34 Q36 46 50 48 Q64 46 66 34 Q60 40 50 40 Q40 40 34 34 Z" fill="#5a3418" ${S(1.4)}/>` +
    `<path d="M30 16 Q30 0 50 0 Q70 0 70 16 Q64 8 58 10 Q54 4 48 8 Q42 4 38 10 Q34 8 30 16 Z" fill="#5a3418" ${S()}/>` +
    `<ellipse cx="50" cy="21" rx="9" ry="8" fill="#fff" ${S()}/><circle cx="51" cy="22" r="5" fill="url(#tm)"/><circle cx="51" cy="22" r="2.4" fill="${O}"/><circle cx="53" cy="20" r="1.3" fill="#fff"/>` +
    `<path d="M38 11 L62 11" stroke="${O}" stroke-width="3.2" stroke-linecap="round"/>` +
    `<path d="M42 35 Q50 31 58 35 Q50 39 42 35 Z" fill="#7a2a20" ${S(1.2)}/><path d="M45 34 v2.4 M55 34 v2.4" stroke="#fff" stroke-width="1.6"/>`;

  D.sirene = (T) =>
    `<path d="M42 60 Q28 76 42 86 Q58 94 72 84 Q80 78 88 86 Q90 74 78 72 Q66 78 58 78 Q48 76 56 60 Z" fill="url(#tm)" ${S()}/>` +
    [[46, 68], [52, 72], [44, 76], [50, 80], [58, 82], [64, 82]].map(([x, y]) => `<path d="M${x - 3} ${y} q3 3 6 0" fill="none" stroke="${T.l}" stroke-width="1.2"/>`).join('') +
    `<path d="M88 86 L98 78 L96 90 L100 96 L88 92 Z" fill="url(#tm)" ${S(1.6)}/><path d="M90 86 L97 82 M90 89 L97 92" stroke="${T.x}" stroke-width="1"/>` +
    `<path d="M40 44 Q50 40 60 44 L58 62 Q50 64 42 62 Z" fill="url(#skl)" ${S()}/>` +
    `<path d="M41 48 Q45.5 43 50 48 Q54.5 43 59 48 Q54.5 52 50 49 Q45.5 52 41 48 Z" fill="url(#gold)" ${S(1.2)}/>` +
    `<path d="M41 61 Q50 64 59 61" fill="none" stroke="#e9b949" stroke-width="2"/><g fill="#fff" ${S(.6)}><circle cx="44" cy="62" r="1.2"/><circle cx="50" cy="63" r="1.2"/><circle cx="56" cy="62" r="1.2"/></g>` +
    `<path d="M28 30 Q26 8 50 10 Q74 8 72 34 Q78 52 66 62 Q68 44 62 36 L38 36 Q32 46 34 62 Q22 50 28 30 Z" fill="#c4562e" ${S()}/>` +
    `<path d="M32 26 Q40 14 50 14 M30 40 Q32 50 34 58 M68 40 Q68 50 66 58" fill="none" stroke="#e8875a" stroke-width="1.6"/>` +
    head(50, 32, 13, { iris: '#2a9d8f' }) +
    `<path d="M36 26 Q50 16 64 26 Q58 22 50 22 Q42 22 36 26 Z" fill="#c4562e" ${S(1.4)}/>` +
    `<circle cx="38" cy="22" r="3" fill="#ffd1dc" ${S(1)}/>` +
    // lira
    `<path d="M62 46 Q58 58 66 66 Q74 58 70 46" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/><path d="M62 46 Q58 58 66 66 Q74 58 70 46" fill="none" stroke="#e9b949" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M61 48 H71" stroke="#e9b949" stroke-width="2.4"/><path d="M64 48 V62 M66 48 V64 M68 48 V62" stroke="#fff" stroke-width=".8"/>` +
    limb('M58 50 Q62 56 66 58', '#f0b98c', 4.6) + hand(66, 58);

  D.satiro = (T) =>
    `<path d="M40 68 Q32 78 40 84 L38 92 M60 68 Q68 78 60 84 L62 92" fill="none" stroke="${O}" stroke-width="11" stroke-linecap="round"/>` +
    `<path d="M40 68 Q32 78 40 84 L38 92 M60 68 Q68 78 60 84 L62 92" fill="none" stroke="#8a5a34" stroke-width="8.4" stroke-linecap="round"/>` +
    `<path d="M35 81 l3 2 M37 75 l3 1 M63 81 l-3 2 M61 75 l-3 1" stroke="#5a3418" stroke-width="1.2"/>` +
    `<path d="M33 92 h9 l-1 3 h-7 Z M58 92 h9 l-1 3 h-7 Z" fill="#2d2420" ${S(1.2)}/>` +
    `<path d="M34 62 Q50 58 66 62 L68 74 Q50 78 32 74 Z" fill="url(#fur)" ${S()}/>` +
    `<path d="M37 44 Q50 40 63 44 L63 64 H37 Z" fill="url(#skl)" ${S()}/>` +
    `<path d="M35 46 L65 62" stroke="${O}" stroke-width="6" stroke-linecap="round"/><path d="M35 46 L65 62" stroke="${T.c}" stroke-width="3.8" stroke-linecap="round"/>` +
    // flauto di Pan
    `<g ${S(1.2)} fill="url(#gold)"><rect x="60" y="40" width="4" height="16" rx="1"/><rect x="64" y="40" width="4" height="13" rx="1"/><rect x="68" y="40" width="4" height="10" rx="1"/><rect x="72" y="40" width="4" height="7" rx="1"/></g>` +
    `<path d="M60 46 H76" stroke="#8a5a1c" stroke-width="1.4"/>` +
    limb('M62 48 Q66 52 64 56', '#f0b98c', 4.6) + hand(63, 55) +
    `<path d="M33 22 Q22 14 26 2 Q30 12 38 16 Z M67 22 Q78 14 74 2 Q70 12 62 16 Z" fill="url(#bone)" ${S()}/>` +
    `<path d="M28 10 l3 1 M29 14 l3 0 M72 10 l-3 1 M71 14 l-3 0" stroke="#a89878" stroke-width="1"/>` +
    `<path d="M37 30 L26 26 L35 36 Z M63 30 L74 26 L65 36 Z" fill="url(#sk)" ${S(1.4)}/>` +
    head(50, 32, 13, { mood: 'grin' }) +
    `<path d="M41 39 Q50 50 59 39 Q55 44 50 44 Q45 44 41 39 Z" fill="#5a3418" ${S(1.2)}/>` +
    `<g fill="#5a3418" ${S(1.2)}><circle cx="39" cy="22" r="4.4"/><circle cx="46" cy="18" r="4.8"/><circle cx="54" cy="18" r="4.8"/><circle cx="61" cy="22" r="4.4"/></g>` +
    // corona d'edera
    [38, 44, 50, 56, 62].map((x, i) => `<path d="M${x} ${20 - (i === 2 ? 3 : i % 2 ? 2 : 0)} l-3 -2 l3 -3 l3 3 Z" fill="#4fa83a" ${S(.8)}/>`).join('');

  D.medusa = (T) => {
    const snake = (d, hx, hy, ang) =>
      `<path d="${d}" fill="none" stroke="${O}" stroke-width="7" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#4f9a3f" stroke-width="5" stroke-linecap="round"/>` +
      `<path d="${d}" fill="none" stroke="#a8d870" stroke-width="1.4" stroke-dasharray="1.5 2.5" stroke-linecap="round"/>` +
      `<g transform="translate(${hx} ${hy}) rotate(${ang})"><ellipse cx="0" cy="0" rx="4.6" ry="3.6" fill="#5fae4c" ${S(1.4)}/>` +
      `<circle cx="1.6" cy="-1.2" r="1" fill="#ffd21a"/><circle cx="1.6" cy="1.2" r="1" fill="#ffd21a"/><path d="M4.6 0 L8 -1.2 M4.6 0 L8 1.2" stroke="#d62d20" stroke-width=".9"/></g>`;
    return `<path d="M36 46 Q50 40 64 46 L74 92 Q50 97 26 92 Z" fill="url(#gold)" ${S()}/>` +
      `<path d="M42 52 Q40 72 36 92 M50 50 V95 M58 52 Q60 72 64 92 M46 60 Q45 78 43 93 M54 60 Q55 78 57 93" fill="none" stroke="#b8841c" stroke-width="1.3"/>` +
      `<path d="M26 88 Q50 93 74 88 L74 92 Q50 97 26 92 Z" fill="url(#tm)" ${S(1.4)}/>` + meander(28, 88, 44, '#fdf6e3', 2) +
      `<path d="M34 48 Q50 64 68 76 L66 82 Q48 70 32 54 Z" fill="url(#tm)" ${S(1.6)}/>` +
      `<circle cx="38" cy="50" r="3" fill="url(#gold)" ${S(1.2)}/><circle cx="62" cy="50" r="3" fill="url(#gold)" ${S(1.2)}/>` +
      limb('M36 50 Q26 58 26 68', '#b9d8a0') + limb('M64 50 Q76 52 80 44', '#b9d8a0') +
      `<path d="M24.5 62 Q28 60 30 63 M73 50 Q75 46 78 48" fill="none" stroke="#e9b949" stroke-width="2.6"/>` +
      `<circle cx="26" cy="70" r="4" fill="#b9d8a0" ${S(1.6)}/><circle cx="81" cy="42" r="4" fill="#b9d8a0" ${S(1.6)}/><circle cx="86" cy="36" r="8" fill="url(#glow)"/>` +
      snake('M40 22 Q30 16 32 6', 32, 5, -100) + snake('M60 22 Q70 16 68 6', 68, 5, -80) +
      snake('M36 30 Q22 30 18 20', 17, 18, -130) + snake('M64 30 Q78 30 82 20', 83, 18, -50) +
      `<circle cx="50" cy="31" r="13.5" fill="#b9d8a0" ${S()}/><path d="M40 24 Q44 20 49 20" fill="none" stroke="#e4f3d6" stroke-width="2" opacity=".9"/>` +
      `<path d="M41.5 30.5 Q45 28 48 30.5 Q45 33.5 41.5 30.5 Z M52 30.5 Q55 28 58.5 30.5 Q55 33.5 52 30.5 Z" fill="#ffd21a" ${S(1.2)}/>` +
      `<path d="M44.8 28.8 V32.2 M55.2 28.8 V32.2" stroke="${O}" stroke-width="1.4"/>` +
      `<path d="M40.5 27 Q44.5 25 48.5 27.5 M59.5 27 Q55.5 25 51.5 27.5" fill="none" stroke="#2d4a24" stroke-width="1.8" stroke-linecap="round"/>` +
      `<path d="M46.5 38.5 Q50 40.5 53.5 38.5" fill="none" stroke="#8a2a3a" stroke-width="1.8" stroke-linecap="round"/>` +
      `<path d="M38 23 Q50 15 62 23 L60 25 Q50 19 40 25 Z" fill="url(#gold)" ${S(1.4)}/><circle cx="50" cy="19.5" r="2.2" fill="#c0392b" ${S(1)}/>` +
      snake('M44 20 Q42 10 48 4', 49, 3, -70) + snake('M56 20 Q60 12 58 2', 58, 1, -95) +
      snake('M38 36 Q28 42 30 50', 30, 51, 100) + snake('M62 36 Q72 42 70 50', 70, 51, 80);
  };

  D.pegaso = (T) => {
    const wing = (dx, dy, sc) =>
      `<g transform="translate(${dx} ${dy}) scale(${sc})"><path d="M0 0 Q-14 -30 -2 -46 Q4 -30 14 -24 Q12 -38 24 -44 Q24 -28 30 -18 Q34 -28 44 -30 Q38 -12 26 2 Z" fill="url(#wht)" ${S()}/>` +
      `<path d="M2 -6 Q-6 -24 0 -40 M10 -6 Q8 -22 16 -32 M18 -4 Q22 -16 30 -22" fill="none" stroke="#b9b2c8" stroke-width="1.6"/></g>`;
    return wing(40, 54, 1) +
      `<path d="M20 62 Q4 64 6 84 Q12 74 22 72" fill="url(#gold)" ${S(1.6)}/>` +
      `<path d="M28 72 Q26 82 28 91 M38 74 V91 M62 74 V91 M72 72 Q76 82 74 91" fill="none" stroke="${O}" stroke-width="8" stroke-linecap="round"/>` +
      `<path d="M28 72 Q26 82 28 91 M38 74 V91 M62 74 V91 M72 72 Q76 82 74 91" fill="none" stroke="#f3eff7" stroke-width="5.4" stroke-linecap="round"/>` +
      `<path d="M24 92 h8 M34 92 h8 M58 92 h8 M70 92 h8" stroke="#e9b949" stroke-width="3.4" stroke-linecap="round"/>` +
      `<path d="M22 64 Q22 52 38 52 L62 52 Q76 52 78 62 Q78 76 64 76 L34 76 Q22 76 22 64 Z" fill="url(#wht)" ${S()}/>` +
      `<path d="M30 56 Q46 52 62 56" fill="none" stroke="#fff" stroke-width="2" opacity=".9"/>` +
      `<path d="M38 52 L62 52 L60 70 Q50 72 40 70 Z" fill="url(#tm)" ${S(1.6)}/>` + meander(40, 64, 20, '#fdf6e3', 2.4) +
      `<path d="M64 60 Q70 42 74 32 L88 36 Q84 50 74 66 Z" fill="url(#wht)" ${S()}/>` +
      `<path d="M74 26 Q90 20 98 34 Q98 42 90 42 L80 40 Z" fill="url(#wht)" ${S()}/>` +
      `<path d="M70 32 Q64 44 62 56 L66 56 Q70 44 76 34 Z" fill="url(#gold)" ${S(1.4)}/>` +
      `<circle cx="86" cy="31" r="2.2" fill="${O}"/><circle cx="86.7" cy="30.3" r=".7" fill="#fff"/><circle cx="96" cy="37" r=".9" fill="${O}"/>` +
      `<path d="M76 24 L74 14 L81 23" fill="url(#wht)" ${S(1.4)}/>` +
      `<path d="M78 40 L88 36 L96 40" fill="none" stroke="#e9b949" stroke-width="1.8"/>` +
      wing(46, 54, 1.08);
  };

  D.cerbero = (T) => {
    const dog = (x, y) =>
      `<path d="M${x - 10} ${y - 5} L${x - 13} ${y - 17} L${x - 4} ${y - 9} Z M${x + 10} ${y - 5} L${x + 13} ${y - 17} L${x + 4} ${y - 9} Z" fill="url(#drk)" ${S(1.4)}/>` +
      `<circle cx="${x}" cy="${y}" r="11" fill="url(#drk)" ${S()}/>` +
      `<path d="M${x - 7} ${y + 4} Q${x} ${y + 16} ${x + 7} ${y + 4} Q${x} ${y + 8} ${x - 7} ${y + 4} Z" fill="#5a5058" ${S(1.4)}/>` +
      `<ellipse cx="${x}" cy="${y + 3.6}" rx="2.6" ry="1.8" fill="${O}"/>` +
      `<path d="M${x - 7} ${y - 3} L${x - 2} ${y - 1} M${x + 7} ${y - 3} L${x + 2} ${y - 1}" stroke="${O}" stroke-width="1.8" stroke-linecap="round"/>` +
      `<circle cx="${x - 4.5}" cy="${y + 0.2}" r="1.9" fill="#ff5a3a"/><circle cx="${x + 4.5}" cy="${y + 0.2}" r="1.9" fill="#ff5a3a"/>` +
      `<path d="M${x - 4} ${y + 8} l1.2 2.4 l1.2 -2.4 M${x + 1.6} ${y + 8} l1.2 2.4 l1.2 -2.4" fill="#fff" ${S(.6)}/>` +
      `<path d="M${x - 6} ${y - 7} Q${x - 2} ${y - 10} ${x + 2} ${y - 9}" fill="none" stroke="#8a7e8a" stroke-width="1.4"/>`;
    return `<path d="M80 62 Q96 58 94 42 Q98 50 92 54" fill="none" stroke="${O}" stroke-width="6" stroke-linecap="round"/><path d="M80 62 Q96 58 94 42" fill="none" stroke="#4f9a3f" stroke-width="3.6" stroke-linecap="round"/>` +
      `<path d="M28 72 V91 M40 74 V91 M62 74 V91 M74 72 V91" stroke="${O}" stroke-width="9.4" stroke-linecap="round"/><path d="M28 72 V91 M40 74 V91 M62 74 V91 M74 72 V91" stroke="#3e3540" stroke-width="6.8" stroke-linecap="round"/>` +
      `<path d="M24 92 h8 M36 92 h8 M58 92 h8 M70 92 h8" stroke="#1a141c" stroke-width="3" stroke-linecap="round"/>` +
      `<ellipse cx="52" cy="66" rx="30" ry="14" fill="url(#drk)" ${S()}/><path d="M32 60 Q52 54 72 60" fill="none" stroke="#7a6e7a" stroke-width="1.6"/>` +
      `<path d="M24 54 Q50 46 78 54" fill="none" stroke="${O}" stroke-width="7.4"/><path d="M24 54 Q50 46 78 54" fill="none" stroke="${T.c}" stroke-width="5"/>` +
      [30, 40, 50, 60, 70].map((x) => `<path d="M${x - 2} ${x === 50 ? 49 : x === 40 || x === 60 ? 50 : 52} l2 -4 l2 4 Z" fill="url(#st)" ${S(.8)}/>`).join('') +
      dog(22, 40) + dog(78, 40) + dog(50, 28);
  };

  D.idra = (T) => {
    const neck = (x, y, s) =>
      `<path d="M${50 + s * 12} 82 Q${x - s * 10} 66 ${x} ${y + 10}" fill="none" stroke="${O}" stroke-width="12.6" stroke-linecap="round"/>` +
      `<path d="M${50 + s * 12} 82 Q${x - s * 10} 66 ${x} ${y + 10}" fill="none" stroke="#4f9a3f" stroke-width="10" stroke-linecap="round"/>` +
      `<path d="M${50 + s * 12 + 2} 82 Q${x - s * 10 + 2} 66 ${x + 2} ${y + 12}" fill="none" stroke="#d6cf86" stroke-width="3" stroke-dasharray="2 2"/>`;
    const headI = (x, y) =>
      `<path d="M${x - 8} ${y - 4} L${x - 6} ${y - 16} L${x - 2} ${y - 7} L${x} ${y - 18} L${x + 2} ${y - 7} L${x + 6} ${y - 16} L${x + 8} ${y - 4} Z" fill="url(#tm)" ${S(1.4)}/>` +
      `<ellipse cx="${x}" cy="${y + 2}" rx="11" ry="9" fill="url(#grn)" ${S()}/>` +
      `<path d="M${x - 8} ${y + 6} Q${x} ${y + 15} ${x + 8} ${y + 6} Q${x} ${y + 9} ${x - 8} ${y + 6} Z" fill="#7a1a14" ${S(1.2)}/>` +
      `<path d="M${x - 6} ${y + 7} l1.2 2.6 l1.2 -2.4 M${x + 3.6} ${y + 7.2} l1.2 2.4 l1.2 -2.6" fill="#fff" ${S(.6)}/>` +
      `<path d="M${x - 7.5} ${y - 1.5} L${x - 2} ${y + 0.5} L${x - 2.6} ${y + 2.6} L${x - 7.5} ${y + 1.4} Z M${x + 7.5} ${y - 1.5} L${x + 2} ${y + 0.5} L${x + 2.6} ${y + 2.6} L${x + 7.5} ${y + 1.4} Z" fill="#ffd21a" ${S(1)}/>` +
      `<path d="M${x - 4.4} ${y - 0.2} V${y + 2.6} M${x + 4.4} ${y - 0.2} V${y + 2.6}" stroke="${O}" stroke-width="1.2"/>` +
      `<path d="M${x - 7} ${y - 4} Q${x - 2} ${y - 7} ${x + 2} ${y - 6}" fill="none" stroke="#c2ee9a" stroke-width="1.4"/>`;
    return `<path d="M12 86 Q28 70 50 80 Q72 90 88 76 Q96 90 72 95 Q40 99 12 93 Z" fill="url(#grn)" ${S()}/>` +
      `<path d="M22 86 Q36 80 50 86 Q64 92 80 84" fill="none" stroke="#d6cf86" stroke-width="3.4"/>` +
      `<path d="M26 84 l2 3 M34 82 l2 3 M42 83 l2 3 M58 88 l2 3 M66 88 l2 3 M74 86 l2 3" stroke="#a89a50" stroke-width="1"/>` +
      neck(22, 32, -1) + neck(78, 32, 1) + neck(50, 18, 0) +
      headI(22, 32) + headI(78, 32) + headI(50, 18);
  };

  D.ercole = (T) =>
    legs(44, 56, 74, 91) + sandals(44, 56, 93) +
    `<path d="M24 46 Q22 70 30 90 L40 86 L38 50 Z" fill="#c98a2e" ${S()}/><path d="M28 56 Q27 70 32 84" fill="none" stroke="#8a5a1c" stroke-width="1.4"/>` +
    `<path d="M36 64 H64 L66 78 L50 74 L34 78 Z" fill="url(#tmv)" ${S()}/><rect x="35" y="61" width="30" height="5" rx="2" fill="url(#gold)" ${S(1.4)}/>` +
    `<path d="M32 42 Q50 35 68 42 L66 64 H34 Z" fill="url(#skl)" ${S()}/>` +
    `<path d="M40 47 Q45 52 50 48 Q55 52 60 47 M50 50 V62 M43 55 H57 M44 59.5 H56" fill="none" stroke="#b07850" stroke-width="1.5"/>` +
    `<path d="M36 44 Q40 42 44 43" fill="none" stroke="#fff3e3" stroke-width="2" opacity=".7"/>` +
    // clava
    `<path d="M74 10 Q92 12 88 40 L82 72 L74 70 L78 40 Q80 24 70 18 Z" fill="url(#wd)" ${S()}/>` +
    `<g fill="#6e3f1c" ${S(.8)}><circle cx="82" cy="20" r="2.6"/><circle cx="84" cy="32" r="2.2"/><circle cx="79" cy="46" r="2"/></g>` +
    `<path d="M76 14 Q82 14 86 20" fill="none" stroke="#e0a86e" stroke-width="1.6"/>` +
    limb('M66 46 Q76 52 79 60', '#f0b98c', 7.5) + hand(79, 62) + limb('M34 46 Q26 54 26 62', '#f0b98c', 7.5) + hand(26, 63) +
    `<path d="M70 46 L76 49 M72 50 L78 53" stroke="#e9b949" stroke-width="2.4"/>` +
    // pelle del leone di Nemea sulla testa
    `<path d="M28 42 Q22 26 32 16 Q40 4 50 6 Q60 4 68 16 Q78 26 72 42 Q72 50 66 50 L66 36 L34 36 L34 50 Q28 50 28 42 Z" fill="#c98a2e" ${S()}/>` +
    `<path d="M30 30 Q28 40 32 46 M70 30 Q72 40 68 46 M34 20 Q30 26 30 32 M66 20 Q70 26 70 32" fill="none" stroke="#8a5a1c" stroke-width="1.6"/>` +
    head(50, 33, 13) +
    `<path d="M38 38 Q38 52 50 54 Q62 52 62 38 Q56 44 50 44 Q44 44 38 38 Z" fill="#5a3418" ${S(1.4)}/>` +
    `<path d="M46 41.5 Q50 43.5 54 41.5" fill="none" stroke="${O}" stroke-width="1.3"/>` +
    `<path d="M34 24 Q50 2 66 24 Q60 16 50 16 Q40 16 34 24 Z" fill="url(#gold)" ${S()}/>` +
    `<path d="M40 16 Q38 10 42 8 M60 16 Q62 10 58 8" fill="none" stroke="#8a5a1c" stroke-width="1.6"/>` +
    `<circle cx="43" cy="16" r="1.8" fill="${O}"/><circle cx="57" cy="16" r="1.8" fill="${O}"/><path d="M47 20 L50 23 L53 20 Z" fill="#5a3418"/>` +
    `<path d="M45 23 l1.4 2.4 M55 23 l-1.4 2.4" stroke="#fff" stroke-width="1.2"/>`;

  // ---------- costruzioni ----------
  D.cavallo = (T) => {
    const wheel = (x) => `<circle cx="${x}" cy="89" r="7" fill="url(#wd)" ${S()}/><circle cx="${x}" cy="89" r="2.2" fill="url(#br)" ${S(1)}/>` +
      `<path d="M${x - 5} 89 H${x + 5} M${x} 84 V94" stroke="#5a3418" stroke-width="1.4"/>`;
    return `<rect x="10" y="78" width="80" height="9" rx="2" fill="url(#wdv)" ${S()}/><path d="M14 82 H86" stroke="#5a3418" stroke-width="1"/>` +
      wheel(22) + wheel(50) + wheel(78) +
      `<path d="M26 62 V78 M38 64 V78 M62 64 V78 M74 62 V78" stroke="${O}" stroke-width="9" stroke-linecap="square"/><path d="M26 62 V78 M38 64 V78 M62 64 V78 M74 62 V78" stroke="#a0683a" stroke-width="6.4" stroke-linecap="square"/>` +
      `<path d="M18 56 Q18 42 36 42 L64 42 Q80 42 82 56 Q82 68 64 68 L36 68 Q18 68 18 56 Z" fill="url(#wdv)" ${S()}/>` +
      `<path d="M20 50 H80 M18 56 H82 M20 62 H80" stroke="#6e3f1c" stroke-width="1.3"/><path d="M34 42 V68 M50 42 V68 M66 42 V68" stroke="#6e3f1c" stroke-width="1"/>` +
      `<g fill="#3a2414"><circle cx="34" cy="47" r=".9"/><circle cx="50" cy="47" r=".9"/><circle cx="66" cy="47" r=".9"/><circle cx="34" cy="65" r=".9"/><circle cx="66" cy="65" r=".9"/></g>` +
      `<rect x="44" y="52" width="12" height="11" fill="#3a2414" ${S(1.4)}/><path d="M50 52 V63" stroke="#6e3f1c" stroke-width="1"/>` +
      `<path d="M66 46 Q70 26 76 16 L90 20 Q86 36 78 52 Z" fill="url(#wdv)" ${S()}/><path d="M72 30 L86 34 M70 40 L82 44" stroke="#6e3f1c" stroke-width="1"/>` +
      `<path d="M76 12 Q92 6 98 20 L96 28 L82 26 Z" fill="url(#wdv)" ${S()}/><circle cx="88" cy="16" r="2.2" fill="${O}"/><path d="M78 10 L77 2 L83 9" fill="url(#wdv)" ${S(1.4)}/>` +
      `<path d="M72 18 Q64 32 62 46" fill="none" stroke="${O}" stroke-width="7" stroke-linecap="round"/><path d="M72 18 Q64 32 62 46" fill="none" stroke="#4a2c18" stroke-width="4.6" stroke-linecap="round"/>` +
      `<path d="M24 42 V14" stroke="#5a3418" stroke-width="2.6"/><path d="M24 14 Q34 12 42 18 Q34 22 24 24 Z" fill="url(#tm)" ${S(1.6)}/>` +
      `<circle cx="24" cy="13" r="2" fill="url(#gold)" ${S(1)}/>`;
  };

  D.balista = (T) =>
    `<circle cx="26" cy="86" r="8" fill="url(#wd)" ${S()}/><circle cx="74" cy="86" r="8" fill="url(#wd)" ${S()}/>` +
    `<circle cx="26" cy="86" r="2.4" fill="url(#br)" ${S(1)}/><circle cx="74" cy="86" r="2.4" fill="url(#br)" ${S(1)}/>` +
    `<path d="M16 78 H84 L76 60 H24 Z" fill="url(#wdv)" ${S()}/><path d="M22 70 H78" stroke="#6e3f1c" stroke-width="1.4"/>` +
    `<path d="M30 60 L40 78 M70 60 L60 78" stroke="#6e3f1c" stroke-width="2"/>` +
    `<rect x="42" y="36" width="16" height="28" fill="url(#wdv)" ${S()}/>` +
    `<rect x="38" y="38" width="6" height="12" rx="2" fill="#c9b48a" ${S(1.2)}/><rect x="56" y="38" width="6" height="12" rx="2" fill="#c9b48a" ${S(1.2)}/>` +
    `<path d="M39 41 H43 M39 44 H43 M39 47 H43 M57 41 H61 M57 44 H61 M57 47 H61" stroke="#8a7650" stroke-width=".8"/>` +
    `<path d="M41 44 Q22 30 6 42 M59 44 Q78 30 94 42" fill="none" stroke="${O}" stroke-width="7.4" stroke-linecap="round"/>` +
    `<path d="M41 44 Q22 30 6 42 M59 44 Q78 30 94 42" fill="none" stroke="#a0683a" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M6 42 L50 54 L94 42" fill="none" stroke="#f3f0e8" stroke-width="1.4"/>` +
    `<path d="M50 56 V12" stroke="#a0683a" stroke-width="4"/><path d="M50 2 L56 14 H44 Z" fill="url(#st)" ${S(1.6)}/><path d="M46 56 l4 -6 l4 6" fill="url(#tm)" ${S(1)}/>` +
    `<path d="M80 60 V30" stroke="#5a3418" stroke-width="2.4"/><path d="M80 30 Q90 28 96 34 Q90 38 80 40 Z" fill="url(#tm)" ${S(1.6)}/>`;

  // ---------- incantesimi (per le carte) ----------
  D.lancia = (T) =>
    `<path d="M80 12 V92" stroke="#a0683a" stroke-width="3.4" stroke-linecap="round"/><path d="M80 0 Q85 9 83 16 L80 19 L77 16 Q75 9 80 0 Z" fill="url(#gold)" ${S(1.6)}/>` +
    `<ellipse cx="46" cy="60" rx="25" ry="30" fill="url(#fur)" ${S()}/>` +
    `<ellipse cx="46" cy="67" rx="16" ry="19" fill="#f3e6c8" ${S(1.6)}/>` +
    [58, 64, 70, 76].map((y) => `<path d="M${36} ${y} q2.5 3 5 0 q2.5 3 5 0 q2.5 3 5 0 q2.5 3 5 0" fill="none" stroke="#c4a070" stroke-width="1.2"/>`).join('') +
    `<path d="M22 54 Q14 66 22 82 Q28 70 28 58 Z M70 54 Q78 66 70 82 Q64 70 64 58 Z" fill="#7f4b28" ${S(1.6)}/>` +
    `<path d="M24 34 L28 18 L38 30 Z M68 34 L64 18 L54 30 Z" fill="url(#fur)" ${S(1.6)}/>` +
    `<circle cx="36" cy="42" r="10.5" fill="#fff" ${S()}/><circle cx="56" cy="42" r="10.5" fill="#fff" ${S()}/>` +
    `<circle cx="36" cy="42" r="6" fill="url(#gold)"/><circle cx="56" cy="42" r="6" fill="url(#gold)"/><circle cx="36" cy="42" r="3" fill="${O}"/><circle cx="56" cy="42" r="3" fill="${O}"/>` +
    `<circle cx="37.5" cy="40.5" r="1.2" fill="#fff"/><circle cx="57.5" cy="40.5" r="1.2" fill="#fff"/>` +
    `<path d="M42 50 L46 57 L50 50 Z" fill="url(#gold)" ${S(1.4)}/>` +
    // elmo di Atena
    `<path d="M24 30 Q46 10 68 30 Q58 24 46 24 Q34 24 24 30 Z" fill="url(#br)" ${S()}/><path d="M30 22 Q46 0 62 22 Q46 12 30 22 Z" fill="url(#tm)" ${S(1.6)}/>` +
    `<path d="M32 88 l-4 6 M40 90 v6 M52 90 v6 M60 88 l4 6" stroke="${O}" stroke-width="4.4" stroke-linecap="round"/><path d="M32 88 l-4 6 M40 90 v6 M52 90 v6 M60 88 l4 6" stroke="#e9b949" stroke-width="2.6" stroke-linecap="round"/>`;

  D.fuoco = () =>
    `<path d="M50 0 Q74 20 66 38 Q82 32 80 52 Q70 46 62 52 L38 52 Q30 46 20 52 Q18 32 34 38 Q26 20 50 0 Z" fill="#ff6a1a" ${S()}/>` +
    `<path d="M50 14 Q64 28 58 44 Q68 40 66 52 L34 52 Q32 40 42 44 Q36 28 50 14 Z" fill="#ffb52e"/>` +
    `<path d="M50 28 Q58 38 54 50 L46 50 Q42 38 50 28 Z" fill="#fff3a0"/>` +
    `<path d="M28 52 H72 Q80 72 66 86 Q50 96 34 86 Q20 72 28 52 Z" fill="url(#terra)" ${S()}/>` +
    `<path d="M27 58 H73" stroke="${O}" stroke-width="2.4"/><path d="M24 66 H76 M24 78 H76" stroke="${O}" stroke-width="2"/>` +
    `<path d="M24 66 h52 v12 h-52 Z" fill="#2b1d14"/>` + meander(26, 69, 48, '#e07a3e', 6) +
    `<path d="M34 58 Q38 56 42 58" fill="none" stroke="#ffd6a8" stroke-width="2" opacity=".8"/>` +
    `<path d="M40 88 L36 96 H64 L60 88" fill="url(#terra)" ${S(1.6)}/>`;

  D.fulmine = () =>
    `<circle cx="50" cy="56" r="40" fill="url(#glow)" opacity=".6"/>` +
    `<path d="M14 26 Q8 12 22 10 Q26 0 40 4 Q50 -4 62 4 Q76 0 80 12 Q94 14 88 28 Q80 34 66 30 Q56 36 44 30 Q30 36 14 26 Z" fill="url(#wht)" ${S()}/>` +
    `<path d="M22 22 Q30 26 40 22 M54 24 Q64 28 76 22" fill="none" stroke="#b9b2c8" stroke-width="1.6"/>` +
    `<path d="M58 28 L32 62 H48 L36 98 L74 48 H55 L68 28 Z" fill="url(#gold)" ${S()}/>` +
    `<path d="M60 32 L44 56 H54" fill="none" stroke="#fff8c8" stroke-width="2.4"/>` +
    `<g stroke="#ffd21a" stroke-width="3" stroke-linecap="round"><path d="M22 56 l-9 4"/><path d="M80 54 l9 4"/><path d="M24 76 l-9 0"/><path d="M78 74 l9 0"/></g>`;

  D.vaso = () =>
    `<path d="M34 8 Q20 -2 14 14 M66 6 Q80 -4 86 10 M50 4 Q46 -4 54 -8" fill="none" stroke="#9b6bd6" stroke-width="5" stroke-linecap="round" opacity=".85"/>` +
    `<circle cx="16" cy="12" r="3" fill="#ffd21a"/><circle cx="84" cy="9" r="3" fill="#ffd21a"/>` +
    `<path d="M38 8 Q50 2 62 8 L60 16 H40 Z" fill="url(#terra)" ${S()}/><path d="M36 6 Q50 -2 64 6" fill="none" ${S()}/>` +
    `<path d="M40 16 H60 L62 24 Q86 36 82 62 Q78 86 62 92 H38 Q22 86 18 62 Q14 36 38 24 Z" fill="url(#terra)" ${S()}/>` +
    `<path d="M24 38 Q10 40 14 56 M76 38 Q90 40 86 56" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/><path d="M24 38 Q10 40 14 56 M76 38 Q90 40 86 56" fill="none" stroke="#cf6d38" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M21 46 H79 M19 72 H81" stroke="${O}" stroke-width="2.4"/>` +
    `<path d="M20 49 h60 v20 h-60 Z" fill="#24160c"/>` +
    `<g fill="#e07a3e"><circle cx="32" cy="55" r="3"/><path d="M29 58 h6 l2 9 h-10 Z"/><circle cx="50" cy="55" r="3"/><path d="M47 58 h6 l3 9 h-12 Z"/><circle cx="68" cy="55" r="3"/><path d="M65 58 h6 l2 9 h-10 Z"/></g>` +
    `<path d="M36 52 L42 66 M56 52 L60 66" stroke="#e07a3e" stroke-width="1.6"/>` +
    meander(22, 76, 56, O, 4) +
    `<path d="M28 30 Q34 26 40 28" fill="none" stroke="#ffd6a8" stroke-width="2.2" opacity=".8"/>`;

  // ---------- bauli ----------
  // body/lid: colori del legno o del metallo; trim: bordi; gem: pietra sul lucchetto
  function chest(o) {
    return `<ellipse cx="50" cy="92" rx="42" ry="6" fill="#000" opacity=".25"/>` +
      `<path d="M12 50 H88 L86 88 Q50 93 14 88 Z" fill="${o.body}" ${S()}/>` +
      (o.planks ? `<path d="M13 62 H87 M13.5 75 H86.5" stroke="${o.dark}" stroke-width="1.6"/>` : '') +
      `<path d="M12 50 H88 L87.6 56 H12.4 Z" fill="${o.trim}" ${S(1.6)}/>` +
      `<path d="M14 82 Q50 87 86 82 L86 88 Q50 93 14 88 Z" fill="${o.trim}" ${S(1.6)}/>` +
      `<path d="M24 50 V89 M76 50 V89" stroke="${O}" stroke-width="9"/><path d="M24 50 V89 M76 50 V89" stroke="${o.trimS}" stroke-width="6"/>` +
      (o.meander ? meander(30, 66, 40, o.meander, 5) : '') +
      `<path d="M10 50 Q10 22 50 20 Q90 22 90 50 Z" fill="${o.lid}" ${S()}/>` +
      `<path d="M24 50 Q24 26 34 22 M76 50 Q76 26 66 22" fill="none" stroke="${O}" stroke-width="9"/><path d="M24 50 Q24 26 34 22 M76 50 Q76 26 66 22" fill="none" stroke="${o.trimS}" stroke-width="6"/>` +
      `<path d="M20 34 Q30 26 44 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".55"/>` +
      `<path d="M42 44 H58 V62 Q50 68 42 62 Z" fill="url(#gold)" ${S(1.8)}/>` +
      `<circle cx="50" cy="52" r="4.6" fill="${o.gem}" ${S(1.4)}/><circle cx="48.6" cy="50.6" r="1.4" fill="#fff" opacity=".8"/>` +
      `<path d="M50 56 V61" stroke="${O}" stroke-width="2"/>` +
      (o.glow ? `<circle cx="50" cy="20" r="26" fill="url(#glow)" opacity=".55"/>` : '');
  }
  D.ch_legno = () => chest({ body: 'url(#wdv)', lid: 'url(#wdv)', dark: '#5a3418', trim: '#7d7466', trimS: '#9a917f', gem: '#7a4520', planks: true });
  D.ch_argento = () => chest({ body: 'url(#st)', lid: 'url(#st)', dark: '#6d7783', trim: '#5b6672', trimS: '#8d97a3', gem: '#3f7fe0', meander: '#5b6672' });
  D.ch_oro = () => chest({ body: 'url(#gold)', lid: 'url(#gold)', dark: '#8a5a1c', trim: '#b8841c', trimS: '#d9a62e', gem: '#c0392b', meander: '#8a5a1c', glow: true });
  D.ch_magico = () => chest({ body: 'url(#pur)', lid: 'url(#pur)', dark: '#3f1f66', trim: '#e9b949', trimS: '#f2c24a', gem: '#2ee6c8', meander: '#f2c24a', glow: true }) +
    `<g fill="#fff6b0"><path d="M14 16 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z"/><path d="M86 10 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 l4 -1.5 Z"/><path d="M90 40 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 l3 -1 Z"/></g>`;
  D.ch_dono = () =>
    `<ellipse cx="50" cy="92" rx="40" ry="6" fill="#000" opacity=".25"/>` +
    `<rect x="16" y="46" width="68" height="44" rx="4" fill="url(#terra)" ${S()}/>` +
    `<rect x="10" y="34" width="80" height="14" rx="4" fill="url(#terra)" ${S()}/>` +
    `<rect x="44" y="34" width="12" height="56" fill="url(#gold)" ${S(1.4)}/>` +
    meander(18, 62, 24, O, 6) + meander(58, 62, 24, O, 6) +
    `<path d="M50 34 Q30 10 22 22 Q18 32 50 34 Q70 10 78 22 Q82 32 50 34 Z" fill="url(#gold)" ${S()}/>` +
    `<circle cx="50" cy="33" r="5" fill="url(#gold)" ${S(1.6)}/><path d="M20 40 Q30 36 40 37" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/>`;

  // ---------- templi e rovine ----------
  function temple(T, king) {
    const cols = king ? [20, 35, 50, 65, 80] : [24, 41.3, 58.6, 76];
    return `<ellipse cx="50" cy="93" rx="48" ry="6" fill="#000" opacity=".25"/>` +
      `<rect x="4" y="82" width="92" height="10" fill="url(#mbv)" ${S()}/><rect x="9" y="74" width="82" height="9" fill="url(#mbv)" ${S()}/>` +
      `<path d="M6 87 H94" stroke="#cfc3a8" stroke-width="1.2"/>` +
      `<rect x="12" y="40" width="76" height="34" fill="#c9bfa8" ${S(1.6)}/>` +
      cols.map((x) => `<rect x="${x - 5.5}" y="40" width="11" height="34" fill="url(#mb)" ${S()}/>` +
        `<path d="M${x - 2.5} 42 V72 M${x} 42 V72 M${x + 2.5} 42 V72" stroke="#d2c7b0" stroke-width=".9"/>` +
        `<path d="M${x - 8} 36 H${x + 8} L${x + 6} 41 H${x - 6} Z" fill="url(#mbv)" ${S(1.4)}/>` +
        `<path d="M${x - 7.5} 73 H${x + 7.5}" stroke="${O}" stroke-width="2.6"/>`).join('') +
      `<rect x="8" y="28" width="84" height="9" fill="url(#mbv)" ${S()}/>` +
      `<rect x="10" y="30" width="80" height="5" fill="url(#tm)"/>` + meander(11, 30.5, 79, '#fdf6e3', 3.6) +
      `<path d="M3 29 L50 ${king ? 3 : 7} L97 29 Z" fill="url(#mbv)" ${S()}/>` +
      `<path d="M14 26 L50 ${king ? 9 : 12} L86 26 Z" fill="url(#tm)" ${S(1.4)}/>` +
      // rilievo nel frontone: due figure stilizzate e un disco d'oro
      `<circle cx="50" cy="${king ? 19 : 21}" r="3.8" fill="url(#gold)" ${S(1.2)}/>` +
      `<path d="M30 25 q3 -6 6 0 M64 25 q3 -6 6 0 M38 25 q2 -4 4 0 M58 25 q2 -4 4 0" fill="none" stroke="#fdf6e3" stroke-width="1.4"/>` +
      `<path d="M1 30 l4 -7 l4 7 Z M91 30 l4 -7 l4 7 Z" fill="url(#gold)" ${S(1.2)}/>` +
      (king
        ? `<path d="M36 2 L40 -7 L45 0 L50 -8 L55 0 L60 -7 L64 2 Z" fill="url(#gold)" ${S(1.4)}/><circle cx="50" cy="-2" r="1.6" fill="#c0392b"/>`
        : `<path d="M47 7 L50 -1 L53 7 Z" fill="url(#gold)" ${S(1.2)}/>`);
  }
  D.princess = (T) => temple(T, false);
  D.king = (T) => temple(T, true);
  D.rovine = () =>
    `<ellipse cx="50" cy="84" rx="46" ry="12" fill="#5a4c3a" opacity=".45"/>` +
    `<rect x="8" y="76" width="84" height="9" fill="url(#mbv)" ${S()}/>` +
    `<path d="M18 76 V50 L22 46 L25 52 L28 47 V76 Z" fill="url(#mb)" ${S()}/><path d="M21 52 V74 M24 54 V74" stroke="#d2c7b0" stroke-width=".9"/>` +
    `<path d="M68 76 V60 L72 56 L76 63 L79 58 V76 Z" fill="url(#mb)" ${S()}/>` +
    `<g transform="rotate(-14 49 68)"><rect x="34" y="63" width="30" height="10" rx="3" fill="url(#mbv)" ${S()}/><path d="M38 66 H60 M38 70 H60" stroke="#d2c7b0" stroke-width=".9"/></g>` +
    `<circle cx="86" cy="82" r="4" fill="url(#mbv)" ${S(1.4)}/><circle cx="12" cy="84" r="3" fill="url(#mbv)" ${S(1.4)}/><circle cx="58" cy="84" r="2.4" fill="url(#mbv)" ${S(1.2)}/>` +
    `<path d="M40 82 q4 -4 8 0" fill="none" stroke="#6fbf4a" stroke-width="2"/>`;

  // ---------- trasformazione in immagini ----------
  // flat: senza il filtro di luce (usato per le icone piccole se serve)
  function svgText(key, team, flat) {
    const f = D[key];
    if (!f) return null;
    const T = TEAMS[team || 0];
    const body = f(T);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW}">${defs(T)}` +
      (flat ? body : `<g filter="url(#vol)">${body}</g>`) + `</svg>`;
  }
  const cache = {};
  function url(key, team) {
    const id = key + ':' + (team || 0);
    if (!(id in cache)) {
      const s = svgText(key, team);
      cache[id] = s ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s) : null;
    }
    return cache[id];
  }
  // Le immagini vengono "fotografate" una volta in un canvas: così il filtro di luce non
  // viene ricalcolato a ogni disegno e il gioco resta veloce anche sui telefoni.
  const images = {};
  const SIZE = 192;
  function image(key, team) {
    if (typeof Image === 'undefined') return null;
    const id = key + ':' + (team || 0);
    let rec = images[id];
    if (!rec) {
      const u = url(key, team);
      if (!u) return null;
      rec = images[id] = { img: new Image(), canvas: null };
      rec.img.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = SIZE; c.height = SIZE;
          c.getContext('2d').drawImage(rec.img, 0, 0, SIZE, SIZE);
          rec.canvas = c;
        } catch (e) { rec.canvas = rec.img; }
      };
      rec.img.src = u;
    }
    return rec.canvas;
  }
  function preload(keys) { for (const k of keys) { image(k, 0); image(k, 1); } }

  const api = { svgText, url, image, preload, has: (k) => !!D[k], TEAMS, FOOT, keys: () => Object.keys(D) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Sprites = api;
})(typeof self !== 'undefined' ? self : this);
