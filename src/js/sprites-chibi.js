// Nuovi disegni 2D in stile "cartone" (testa grande, contorno spesso, ombre nette).
// Stesso riquadro dei disegni attuali: (-5,-8)-(105,100), piedi in basso (y ≈ 95).
// sprites.js usa questi al posto dei vecchi per i personaggi che ci sono qui.
(function (root) {
  'use strict';
  const K = '#1f120a';                      // colore dei contorni
  const st = (w) => `stroke="${K}" stroke-width="${w ?? 2}" stroke-linejoin="round" stroke-linecap="round"`;
  const P = (d, f, w) => `<path d="${d}" fill="${f}" ${st(w)}/>`;
  const C = (x, y, r, f, w) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${st(w)}/>`;
  const E = (x, y, rx, ry, f, w) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${st(w)}/>`;
  const line = (d, c, w, o) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o ? ` opacity="${o}"` : ''}/>`;
  const shine = (d, w, o) => line(d, '#fff', w || 2.2, o || 0.75);
  // tubo con contorno (braccia)
  const limb = (d, f, w) => line(d, K, w + 3.4) + line(d, f, w);

  // Sfumature che danno volume (come un pupazzetto illuminato da sinistra in alto):
  // luce morbida, colore pieno al centro e ombra che scende piano verso il basso a destra
  const toon = (id, l, b, d) => `<linearGradient id="${id}" x1=".15" y1="0" x2=".85" y2="1">` +
    `<stop offset="0" stop-color="${l}"/><stop offset=".32" stop-color="${b}"/>` +
    `<stop offset=".58" stop-color="${b}"/><stop offset="1" stop-color="${d}"/></linearGradient>`;
  const defs = (T) => `<defs>
  ${toon('c-sk', '#ffe9d2', '#f8c193', '#d98b58')}
  ${toon('c-tm', T.l, T.c, T.d)}
  ${toon('c-br', '#fff3b8', '#f1b23a', '#b26a12')}
  ${toon('c-go', '#fff9c8', '#ffcf33', '#c98a0e')}
  ${toon('c-st', '#ffffff', '#cfd8e2', '#808c9b')}
  ${toon('c-wd', '#e6a86c', '#a9652f', '#6c3814')}
  ${toon('c-lt', '#b07a4c', '#7a4a26', '#4a2a12')}
  ${toon('c-fur', '#c98e5c', '#8c5429', '#583014')}
  ${toon('c-hr', '#7d4e2c', '#4b2b15', '#2a170a')}
  ${toon('c-gs', '#ffe8c4', '#e8bb88', '#b4824e')}
  ${toon('c-hn', '#ffffff', '#f3e8d0', '#b9a57e')}
  ${toon('c-mz', '#f7d2b0', '#dca47c', '#a87048')}
  ${toon('c-wh', '#ffffff', '#f7f2e6', '#cfc4ad')}
  ${toon('c-mb', '#ffffff', '#f1ebdd', '#c2b597')}
  ${toon('c-rk', '#c9c3bd', '#948c86', '#5e5752')}
  ${toon('c-bn', '#ffffff', '#efe6cf', '#b9aa88')}
  ${toon('c-ph', '#b98be6', '#6a3a9a', '#3f1f66')}
  ${toon('c-gr', '#9fe08a', '#4fa83f', '#2d6424')}
  ${toon('c-dk', '#7a6e78', '#463c48', '#231c25')}
  ${toon('c-pu', '#c49be8', '#7a46b0', '#3f1f66')}
  ${toon('c-tc', '#ffb488', '#d9693a', '#8e3a16')}
  ${toon('c-fi', '#fff6b0', '#ffb02e', '#e0532a')}
  ${toon('c-cl', '#ffffff', '#f2f6fb', '#c4cfe0')}
  ${toon('c-sea', '#9ff0d8', '#3fb8a0', '#1f7a6a')}
  ${toon('c-ms', '#eef8e2', '#bfe0a6', '#86b46e')}
  ${toon('c-lion', '#ffe08a', '#e0a840', '#9c6a18')}
  ${toon('c-bel', '#fff6c0', '#e8d27a', '#b09a40')}
  <filter id="c-ol" x="-12%" y="-12%" width="124%" height="124%">
    <feOffset in="SourceAlpha" dx="-2.2" dy="-2.6" result="sh"/>
    <feComposite in="SourceAlpha" in2="sh" operator="out" result="edge"/>
    <feGaussianBlur in="edge" stdDeviation="1.3" result="eb"/>
    <feFlood flood-color="#2a1404" flood-opacity=".42"/><feComposite in2="eb" operator="in" result="shade"/>
    <feOffset in="SourceAlpha" dx="1.6" dy="1.8" result="hl"/>
    <feComposite in="SourceAlpha" in2="hl" operator="out" result="redge"/>
    <feGaussianBlur in="redge" stdDeviation="1" result="rb"/>
    <feFlood flood-color="#ffffff" flood-opacity=".38"/><feComposite in2="rb" operator="in" result="rim"/>
    <feMerge result="lit"><feMergeNode in="SourceGraphic"/><feMergeNode in="shade"/><feMergeNode in="rim"/></feMerge>
    <feComposite in="lit" in2="SourceAlpha" operator="in" result="body"/>
    <feMorphology in="SourceAlpha" operator="dilate" radius="1.6" result="d"/>
    <feFlood flood-color="${K}"/><feComposite in2="d" operator="in" result="o"/>
    <feMerge><feMergeNode in="o"/><feMergeNode in="body"/></feMerge>
  </filter>
</defs>`;

  // ---------- facce ----------
  // occhi grandi; look: verso dove guardano (+1 = a destra)
  function eyes(x, y, gap, o) {
    o = o || {};
    const iris = o.iris || '#3d7fd6', rx = o.rx || 4.6, ry = o.ry || 5.4, lk = 1.1;
    let m = '';
    for (const s of [-1, 1]) {
      const ex = x + s * gap;
      m += E(ex, y, rx, ry, '#fff', 1.6) +
        `<ellipse cx="${ex + lk}" cy="${y + 0.6}" rx="${rx * 0.66}" ry="${ry * 0.68}" fill="${iris}"/>` +
        `<circle cx="${ex + lk + 0.3}" cy="${y + 0.9}" r="${rx * 0.36}" fill="${K}"/>` +
        `<circle cx="${ex - 0.6}" cy="${y - 1.8}" r="${rx * 0.28}" fill="#fff"/>` +
        `<circle cx="${ex + 2}" cy="${y + 2.4}" r="${rx * 0.13}" fill="#fff"/>`;
    }
    return m;
  }
  // sopracciglia spesse; angry = a V (arrabbiate)
  function brows(x, y, gap, angry, c) {
    c = c || K;
    let m = '';
    for (const s of [-1, 1]) {
      const a = x + s * (gap + 5), b = x + s * (gap - 4);
      m += angry
        ? `<path d="M${a} ${y - 3} L${b} ${y + 0.8} L${b} ${y + 3.4} L${a} ${y} Z" fill="${c}" ${st(1)}/>`
        : `<path d="M${a} ${y + 1} Q${(a + b) / 2} ${y - 2.6} ${b} ${y + 0.6} L${b} ${y + 2.8} Q${(a + b) / 2} ${y} ${a} ${y + 3} Z" fill="${c}" ${st(1)}/>`;
    }
    return m;
  }
  const cheeks = (x, y, gap) => `<ellipse cx="${x - gap}" cy="${y}" rx="3.4" ry="2" fill="#ff7b6b" opacity=".45"/><ellipse cx="${x + gap}" cy="${y}" rx="3.4" ry="2" fill="#ff7b6b" opacity=".45"/>`;
  // bocca: 'shout' (urlo con i denti), 'grin' (ghigno), 'smirk' (mezzo sorriso)
  function mouth(x, y, kind, w) {
    w = w || 5;
    if (kind === 'smirk') return line(`M${x - w} ${y} Q${x} ${y + 2.6} ${x + w} ${y - 1.6}`, K, 1.8);
    if (kind === 'grin') return P(`M${x - w} ${y - 0.5} Q${x} ${y + 1} ${x + w} ${y - 0.5} Q${x + w * 0.7} ${y + 4.5} ${x} ${y + 4.5} Q${x - w * 0.7} ${y + 4.5} ${x - w} ${y - 0.5} Z`, '#fff', 1.6) + line(`M${x - w * 0.8} ${y + 1.8} H${x + w * 0.8}`, '#c9bfae', 0.8);
    return P(`M${x - w} ${y} Q${x} ${y - 2} ${x + w} ${y} Q${x + w * 0.85} ${y + 7} ${x} ${y + 7} Q${x - w * 0.85} ${y + 7} ${x - w} ${y} Z`, '#7a1f17', 1.6) +
      `<path d="M${x - w * 0.8} ${y + 0.2} Q${x} ${y - 1.4} ${x + w * 0.8} ${y + 0.2} L${x + w * 0.7} ${y + 2} Q${x} ${y + 1} ${x - w * 0.7} ${y + 2} Z" fill="#fff"/>` +
      `<ellipse cx="${x + 0.6}" cy="${y + 5.3}" rx="${w * 0.5}" ry="1.4" fill="#e3615a"/>`;
  }

  // ---------- pezzi ----------
  function shield(x, y, r, emblem) {
    let riv = '';
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; riv += `<circle cx="${(x + Math.cos(a) * r * 0.87).toFixed(1)}" cy="${(y + Math.sin(a) * r * 0.87).toFixed(1)}" r="1.1" fill="#fff6c8" ${st(0.6)}/>`; }
    const em = emblem === 'tridente'
      ? line(`M${x} ${y + r * 0.5} V${y - r * 0.45} M${x - r * 0.34} ${y - r * 0.42} V${y - r * 0.08} Q${x} ${y + r * 0.12} ${x + r * 0.34} ${y - r * 0.08} V${y - r * 0.42}`, '#fff8e6', 3.4)
      : line(`M${x - r * 0.36} ${y + r * 0.4} L${x} ${y - r * 0.44} L${x + r * 0.36} ${y + r * 0.4}`, K, 6.2) + line(`M${x - r * 0.36} ${y + r * 0.4} L${x} ${y - r * 0.44} L${x + r * 0.36} ${y + r * 0.4}`, '#fff8e6', 3.6);
    return C(x, y, r, 'url(#c-br)', 2.2) + C(x, y, r * 0.74, 'url(#c-tm)', 1.6) + riv + em +
      shine(`M${x - r * 0.72} ${y - r * 0.3} Q${x - r * 0.5} ${y - r * 0.78} ${x - r * 0.05} ${y - r * 0.9}`, 2.6, 0.8);
  }
  // testa squadrata: fronte larga, guance dritte, mento a spigolo
  const headShape = (x, y, w, h, f) => P(`M${x - w} ${y - h * 0.15} Q${x - w} ${y - h} ${x} ${y - h} Q${x + w} ${y - h} ${x + w} ${y - h * 0.15} ` +
    `L${x + w * 0.88} ${y + h * 0.55} L${x + w * 0.5} ${y + h} H${x - w * 0.5} L${x - w * 0.88} ${y + h * 0.55} Z`, f || 'url(#c-sk)', 2.2);
  // pugno squadrato
  const fist = (x, y, s, f) => `<rect x="${x - s}" y="${y - s}" width="${s * 2}" height="${s * 2}" rx="${s * 0.45}" fill="${f || 'url(#c-sk)'}" ${st(1.8)}/>`;
  // stivali a punta squadrata
  const feet = (x1, x2, y, f, w) => { w = w || 7; const b = (x) => P(`M${x - w} ${y - 4} H${x + w - 2} L${x + w + 1} ${y + 2.5} H${x - w} Z`, f || 'url(#c-lt)', 1.8); return b(x1) + b(x2); };
  const legs = (x1, x2, y1, y2, f, w) => { w = w || 5; return P(`M${x1 - w} ${y1} H${x1 + w} V${y2} H${x1 - w} Z`, f || 'url(#c-sk)', 1.8) + P(`M${x2 - w} ${y1} H${x2 + w} V${y2} H${x2 - w} Z`, f || 'url(#c-sk)', 1.8); };

  const D = {};

  // ---------- Oplita: elmo corinzio con cresta, scudo rotondo, lancia ----------
  D.oplita = (T) =>
    // lancia dietro la mano
    line('M80 10 V96', K, 6) + line('M80 10 V96', '#b0743c', 3.2) +
    P('M80 -4.5 L85.5 6 L84 11 L80 15 L76 11 L74.5 6 Z', 'url(#c-st)', 1.8) + shine('M79 0 V9', 1.2, 0.9) +
    P('M77 13 H83 V17 H77 Z', 'url(#c-br)', 1.4) +
    feet(42, 59, 93) + legs(42, 59, 80, 90.5, 'url(#c-sk)', 4.6) +
    P('M36.5 81 H47.5 L47 90 H37 Z', 'url(#c-br)', 1.6) + P('M53.5 81 H64.5 L64 90 H54 Z', 'url(#c-br)', 1.6) +
    // gonnellino a strisce
    P('M33 68 H67 L71 84 H29 Z', 'url(#c-tm)') + line('M38.5 72 L37.5 84 M44.5 72 V84 M50.5 72 V84 M56.5 72 V84 M62.5 72 L63.5 84', T.x, 1.4, 0.8) +
    // corazza di bronzo a V
    P('M30 50.5 L36 47 H64 L70 50.5 L66 71 L50 74 L34 71 Z', 'url(#c-br)') +
    line('M40 54.5 L50 58 L60 54.5 M50 58 V69 M43 63 H57', '#a3610f', 1.6) + shine('M35 51 L40 48.5 H45', 2) +
    P('M33 68.5 L50 71.5 L67 68.5 V72.5 L50 75.5 L33 72.5 Z', 'url(#c-tm)', 1.6) +
    // braccio con la lancia
    P('M61 47 L71 48 L72.5 56 L63 56.5 Z', 'url(#c-br)', 1.8) + limb('M68 56 L77 61', '#f2b583', 6.4) + fist(80, 61.5, 5.2) + line('M76.5 59.5 H83.5 M76.5 63 H83.5', K, 1, 0.6) +
    // testa ed elmo
    headShape(50, 32, 20, 22) +
    P('M28 36 Q27 8 50 7 Q73 8 72 36 L71 48 L63 51.5 L63 36 Q63 30 57 30 L43 30 Q37 30 37 36 L37 51.5 L29 48 Z', 'url(#c-br)', 2.2) +
    P('M48.3 29.5 V39 L50 41 L51.7 39 V29.5 Z', 'url(#c-br)', 1.4) +
    line('M30 25 Q50 16 70 25', '#a3610f', 1.6) + shine('M31.5 23 Q35 13 45 10', 3) +
    P('M44 8 L45 2.5 H55 L56 8 Z', 'url(#c-br)', 1.6) +
    // cresta a setole
    P('M23 16 L22 6 L27 0 L35 -3.5 L44 -5 L50 -5.5 L56 -5 L65 -3.5 L73 0 L78 6 L77 16 L71 6 L61 3 H39 L29 6 Z', 'url(#c-tm)', 2.2) +
    line('M29 4 L35 0 M38 -1.5 L45 -2.5 M55 -2.5 L62 -1.5 M65 0 L71 4', '#fff', 1.4, 0.55) +
    eyes(50, 38.5, 7.2, { rx: 3.9, ry: 4.6 }) + brows(50, 32.6, 7.2, true) + mouth(50, 47.5, 'grin', 4.6) +
    // scudo davanti
    shield(28, 68, 19.5);

  // ---------- Arciere: capelli a ciuffi, fascia in testa, arco teso ----------
  D.arcieri = (T) =>
    `<g transform="rotate(-22 33 56)">` + P('M27 40 H39 V70 L33 72 L27 70 Z', 'url(#c-wd)', 1.8) +
    line('M27 47 H39 M27 63 H39', '#ffcf33', 2.2) +
    line('M30 40 L29 30 M33 40 V29 M36 40 L37 30', '#b0743c', 2.2) +
    P('M26 31 l3 -5 l2 6 Z M31 30 l2 -6 l2 6 Z M35 31 l2 -5 l3 5 Z', 'url(#c-tm)', 1.2) + `</g>` +
    feet(42, 59, 93) + legs(42, 59, 80, 90.5, 'url(#c-sk)', 4.6) + line('M37.4 85 H46.6 M54.4 85 H63.6', '#6c3814', 1.8) +
    // tunica
    P('M32 51 L38 47.5 H62 L68 51 L70 83 H30 Z', 'url(#c-tm)') +
    P('M30.6 78.5 H69.4 L70 83 H30 Z', 'url(#c-wh)', 1.4) +
    P('M33 64 L50 66.5 L67 64 V68.5 L50 71 L33 68.5 Z', 'url(#c-lt)', 1.4) + P('M47.5 65.5 H52.5 V70.5 H47.5 Z', 'url(#c-go)', 1.2) +
    line('M38 49 L63 65', K, 5.4) + line('M38 49 L63 65', '#8a5228', 3) +
    // arco e freccia
    line('M75 23 Q91 34 86.5 56 Q91 78 75 89', K, 7.4) + line('M75 23 Q91 34 86.5 56 Q91 78 75 89', '#b0743c', 4.2) +
    line('M75 23 L63 56 L75 89', '#fff', 1.2) +
    line('M60 56 H95', K, 3.6) + line('M60 56 H95', '#c98e5c', 2) + P('M94 52.4 L101.5 56 L94 59.6 Z', 'url(#c-st)', 1.4) +
    P('M57.5 53 l6 3 l-6 3 Z', 'url(#c-tm)', 1.2) +
    limb('M39 52 L60 56.5', '#f2b583', 6.2) + fist(63, 56.5, 4.8) +
    limb('M61 52 L83 56', '#f2b583', 6.2) + fist(86.5, 56, 5.2) +
    // testa
    headShape(50, 33, 20, 21.5) +
    P('M28 36 L27 20 L31.5 13 L37 12.5 L40 6 L46.5 9 L52 3.5 L57 9 L64 7 L66 13.5 L72 17.5 L72 36 L68 27 L58 23.5 H42 L32 27 Z', 'url(#c-hr)', 2.2) +
    shine('M33 15 L38 13', 1.8, 0.4) +
    line('M28 27.5 L50 21.5 L72 27.5', K, 6.4) + line('M28 27.5 L50 21.5 L72 27.5', T.c, 3.8) +
    P('M28.5 27.5 L17 30.5 L15 37.5 L21 35.5 L24 31.5 L30 31 Z', 'url(#c-tm)', 1.6) +
    eyes(50, 38, 7.2, { rx: 3.9, ry: 4.6, iris: '#5a8f3c' }) + brows(50, 31.8, 7.2, true, '#3a2010') +
    cheeks(50, 45.5, 12) + mouth(50, 48, 'smirk', 4.4);

  // ---------- Ciclope: un occhio solo, barba, clava chiodata ----------
  D.ciclope = (T) =>
    // clava
    P('M76 14 L98 11 L96.5 44 L89 85 L80 83 L84 46 L84 30 L75 24 Z', 'url(#c-wd)', 2.2) +
    `<g fill="url(#c-st)" ${st(1.2)}><path d="M93 19 l7 -3 l-4 6 Z"/><path d="M96 34 l7 1 l-6 4 Z"/><path d="M80 15 l-2 -7 l6 4 Z"/><path d="M89 48 l7 2 l-6 3 Z"/></g>` +
    shine('M81 19 L91 17', 2, 0.5) +
    feet(38, 62, 92.5, 'url(#c-lt)', 9) + legs(38, 62, 78, 90, 'url(#c-gs)', 7) +
    // gonnellino di pelliccia
    P('M21 63 H79 L83 84 L73 80 L65 86.5 L57 80.5 L50 87.5 L43 80.5 L35 86.5 L27 80 L17 84 Z', 'url(#c-fur)', 2.2) +
    // torace largo a V
    P('M13 46 L28 37 H72 L87 46 L81 67 L50 74 L19 67 Z', 'url(#c-gs)', 2.2) +
    line('M29 45 L40 50.5 L49 47.5 M51 47.5 L60 50.5 L71 45 M50 51 V64 M43 57 H57', '#b4824e', 1.8) +
    shine('M19 46 L28 40.5', 2.4, 0.5) +
    P('M19 63.5 L50 70 L81 63.5 V69 L50 75.5 L19 69 Z', 'url(#c-tm)', 1.8) +
    // braccia
    limb('M20 45 L13 63', '#e8bb88', 12) + fist(13.5, 69, 7.6, 'url(#c-gs)') +
    limb('M80 45 L85 57', '#e8bb88', 12) + fist(85, 63.5, 7.6, 'url(#c-gs)') + line('M78.5 60.5 H91.5 M78.5 65.5 H91.5', K, 1.2, 0.5) +
    // testa
    P('M28 25 L21.5 23 L21.5 35 L28 34 Z M72 25 L78.5 23 L78.5 35 L72 34 Z', 'url(#c-gs)', 1.8) +
    headShape(50, 29, 23, 25, 'url(#c-gs)') +
    P('M29.5 37 L32 51 L42 58.5 H58 L68 51 L70.5 37 L62 45.5 H38 Z', 'url(#c-hr)', 2.2) +
    P('M38 7 L42 -1 L46 5 L50 -3 L54 5 L58 -1 L62 7 Q50 10 38 7 Z', 'url(#c-hr)', 1.8) +
    shine('M31 17 L35 10 L42 7', 2.6, 0.5) +
    // occhio unico
    E(50, 25, 11.5, 10.5, '#fff', 2) + C(52, 26, 7, T.c, 0) + C(52.4, 26.4, 3.6, K, 0) +
    C(48.3, 22, 2.5, '#fff', 0) + C(55.5, 29.4, 1.1, '#fff', 0) +
    P('M35 11.5 L50 19 L65 11.5 L65.5 16.5 L50 24 L34.5 16.5 Z', K, 1) +
    P('M47 34 H53 L54 38.5 H46 Z', 'url(#c-gs)', 1.6) +
    P('M42 40.5 L50 38.5 L58 40.5 L56.5 48 H43.5 Z', '#7a1f17', 1.8) +
    P('M43.6 41.3 L45.2 36.8 L46.8 41 Z M53.2 41 L54.8 36.8 L56.4 41.3 Z', '#fff', 1.1);

  // ---------- Minotauro: testa di toro, corna, ascia bipenne ----------
  D.minotauro = (T) =>
    // ascia
    line('M87 26 V96', K, 7.4) + line('M87 26 V96', '#b0743c', 4.4) +
    P('M87 30 L103 23 L105 48 L87 44 Z', 'url(#c-st)', 2) + P('M87 30 L71 23 L69 48 L87 44 Z', 'url(#c-st)', 2) +
    shine('M92 29.5 L100.5 26.5 M82 29.5 L73.5 26.5', 1.6, 0.9) +
    P('M84 33 H90 V46 H84 Z', 'url(#c-go)', 1.4) +
    // zoccoli e gambe
    P('M31 89 H46 L45 95.5 H32 Z M54 89 H69 L68 95.5 H55 Z', '#2e2622', 1.8) + line('M38.5 89.5 V95 M61.5 89.5 V95', '#6b625c', 1.2) +
    P('M32 76 L33 90 H45 L46 76 Z M54 76 L55 90 H67 L68 76 Z', 'url(#c-fur)', 1.8) +
    // gonnellino e cintura d'oro
    P('M28 64 H72 L76 81 H24 Z', 'url(#c-tm)', 2.2) + line('M25.5 76.5 H74.5', '#fff8e6', 2.6) +
    P('M27 61 L50 64.5 L73 61 V66.5 L50 70 L27 66.5 Z', 'url(#c-go)', 1.6) + P('M46 62.5 H54 V70.5 H46 Z', 'url(#c-go)', 1.4) + C(50, 66.5, 1.8, '#c0392b', 0.8) +
    // torace a V
    P('M17 46 L31 38.5 H69 L83 46 L75 63 L50 68 L25 63 Z', 'url(#c-fur)', 2.2) +
    line('M31 46 L41 51 L50 48 L59 51 L69 46 M50 51 V62', '#4a2810', 1.8) + shine('M23 46 L31 41.5', 2.2, 0.45) +
    // braccia
    limb('M24 44 L16 60', '#8c5429', 11) + P('M10 56 H22 V62.5 H10 Z', 'url(#c-go)', 1.4) + fist(16, 68, 6.8, 'url(#c-fur)') +
    limb('M76 44 L85 53', '#8c5429', 11) + P('M80.5 50 H92.5 V56.5 H80.5 Z', 'url(#c-go)', 1.4) + fist(87, 61, 6.8, 'url(#c-fur)') +
    // corna e orecchie
    P('M30 18 L12 15 L5 -2 L17 8 L31 9.5 Z', 'url(#c-hn)', 2) + P('M70 18 L88 15 L95 -2 L83 8 L69 9.5 Z', 'url(#c-hn)', 2) +
    P('M5 -2 L13 7 L15 4.5 Z M95 -2 L87 7 L85 4.5 Z', '#3a2a1a', 1) +
    P('M28 25 L15 25 L15 33 L29.5 30 Z M72 25 L85 25 L85 33 L70.5 30 Z', 'url(#c-fur)', 1.8) +
    // testa squadrata da toro
    P('M28 11 Q50 5 72 11 L75 30 L67 46 H33 L25 30 Z', 'url(#c-fur)', 2.4) +
    P('M41 8 L48 5.5 L54 6.5 L48 11 L46 17 L43 12 Z', '#4a2810', 1.2) +
    eyes(50, 23, 9, { rx: 4.2, ry: 4.6, iris: '#d62d20' }) + brows(50, 17, 9, true) +
    P('M35 32 H65 L67 43 L61 49 H39 L33 43 Z', 'url(#c-mz)', 2) + E(44, 39.5, 2.4, 3.2, '#3a1a0c', 0.8) + E(56, 39.5, 2.4, 3.2, '#3a1a0c', 0.8) +
    shine('M38 34.5 H48', 1.8, 0.6) +
    line('M50 50 m-4.6 0 a4.6 4.6 0 1 0 9.2 0 a4.6 4.6 0 1 0 -9.2 0', K, 4.6) + line('M50 50 m-4.6 0 a4.6 4.6 0 1 0 9.2 0 a4.6 4.6 0 1 0 -9.2 0', '#ffcf33', 2.4);


  // ---------- templi (torri) ----------
  // restituisce [ombra sotto, disegno]: l'ombra resta fuori dal contorno nero
  const temple = (king) => {
    const cols = king ? [20, 35, 50, 65, 80] : [24, 41.3, 58.6, 76];
    const peak = king ? 2 : 6;
    return ['<ellipse cx="50" cy="93" rx="48" ry="6" fill="#000" opacity=".25"/>',
      P('M2 83 H98 V94 H2 Z', 'url(#c-mb)', 2.2) + P('M8 75 H92 V83 H8 Z', 'url(#c-mb)', 2) + line('M5 88 H95', '#c9bda2', 1.2) +
      P('M12 40 H88 V75 H12 Z', '#b5a98e', 1.8) +
      cols.map((x) => P(`M${x - 6} 41 H${x + 6} V75 H${x - 6} Z`, 'url(#c-mb)', 1.8) + line(`M${x - 2.4} 44 V72 M${x + 2.4} 44 V72`, '#c9bda2', 1.2) +
        P(`M${x - 8.5} 36 H${x + 8.5} L${x + 7} 41.5 H${x - 7} Z`, 'url(#c-mb)', 1.6)).join('') +
      P('M6 28 H94 V37 H6 Z', 'url(#c-mb)', 2) + P('M9 30.5 H91 V34.5 H9 Z', 'url(#c-tm)', 1.2) +
      P(`M0 29.5 L50 ${peak} L100 29.5 Z`, 'url(#c-mb)', 2.2) + P(`M13 26.5 L50 ${peak + 8} L87 26.5 Z`, 'url(#c-tm)', 1.6) +
      C(50, peak + 13.5, 4.2, 'url(#c-go)', 1.4) +
      P('M-1 30 L3.5 21 L8 30 Z M92 30 L96.5 21 L101 30 Z', 'url(#c-go)', 1.4) +
      (king ? P('M36 3 L39 -7 L44 -1 L50 -9 L56 -1 L61 -7 L64 3 Z', 'url(#c-go)', 1.6) + C(50, -2.5, 1.8, '#d62d20', 0.8)
        : P('M46.5 7 L50 -1 L53.5 7 Z', 'url(#c-go)', 1.4))];
  };
  D.princess = () => temple(false);
  D.king = () => temple(true);
  D.rovine = () => ['<ellipse cx="50" cy="84" rx="46" ry="12" fill="#5a4c3a" opacity=".45"/>',
    P('M6 76 H94 V86 H6 Z', 'url(#c-mb)', 2) +
    P('M16 76 V48 L20 44 L23 50 L26 45 L28 49 V76 Z', 'url(#c-mb)', 2) + line('M20 54 V73 M24 54 V73', '#c9bda2', 1.2) +
    P('M70 76 V60 L74 56 L77 62 L80 57 V76 Z', 'url(#c-mb)', 2) +
    `<g transform="rotate(-12 50 68)">${P('M34 62 H64 V73 H34 Z', 'url(#c-mb)', 2)}${line('M38 66 H60', '#c9bda2', 1.2)}</g>` +
    P('M83 78 L91 78 L92 86 L82 86 Z', 'url(#c-mb)', 1.6) + P('M9 80 L15 80 L16 86 L8 86 Z', 'url(#c-mb)', 1.4) +
    line('M40 85 l2 -4 l2 4 M56 85 l2 -4 l2 4', '#5bd23a', 1.6)];

  // ---------- guardiani dei templi ----------
  D.sacerdotessa = () =>
    P('M34 50 L28 92 H72 L66 50 Z', 'url(#c-tm)') +
    P('M36 50 L42 47 H58 L64 50 L67 92 H33 Z', 'url(#c-wh)') + line('M45 54 L43 90 M55 54 L57 90', '#cfc4ad', 1.4) +
    P('M33.6 85 H66.4 L67 92 H33 Z', 'url(#c-tm)', 1.4) +
    P('M37 60 L50 62.5 L63 60 V64 L50 66.5 L37 64 Z', 'url(#c-go)', 1.4) +
    line('M27 24 Q14 38 18 57 Q14 76 27 90', K, 7.4) + line('M27 24 Q14 38 18 57 Q14 76 27 90', '#ffcf33', 4.2) + line('M27 24 V90', '#fff', 1.1) +
    limb('M38 53 L23 57', '#f2b583', 6) + fist(20.5, 57, 4.6) +
    line('M66 66 L84 38', K, 3.4) + line('M66 66 L84 38', '#c98e5c', 1.8) + P('M83 36 L88 32 L86 40 Z', 'url(#c-st)', 1.2) +
    limb('M62 53 L66 62', '#f2b583', 6) + fist(66, 66, 4.6) +
    P('M30 30 L28 54 L36 56 L38 34 Z M70 30 L72 54 L64 56 L62 34 Z', 'url(#c-hr)', 1.8) +
    headShape(50, 33, 19, 21) +
    P('M30 34 Q29 12 50 11 Q71 12 70 34 L66 25 L50 21 L34 25 Z', 'url(#c-hr)', 2) + C(50, 9, 6.5, 'url(#c-hr)', 1.8) +
    line('M32 25 L50 19 L68 25', K, 5.4) + line('M32 25 L50 19 L68 25', '#ffcf33', 3.2) + C(50, 20, 2.4, 'url(#c-tm)', 1.2) +
    eyes(50, 37.5, 7, { rx: 3.8, ry: 4.6, iris: '#7a4a26' }) + brows(50, 31.6, 7, false, '#4b2b15') +
    cheeks(50, 45, 11.5) + mouth(50, 47.5, 'smirk', 4);

  const basileus = (sleep) =>
    P('M32 50 L26 93 H74 L68 50 Z', 'url(#c-tm)') +
    P('M35 50 L41 46.5 H59 L65 50 L68 92 H32 Z', 'url(#c-tm)') + P('M44 48 H56 L58 92 H42 Z', 'url(#c-wh)', 1.6) +
    line('M33 86 H67', '#ffcf33', 3) +
    P('M36 60 L50 63 L64 60 V64.5 L50 67.5 L36 64.5 Z', 'url(#c-go)', 1.4) + C(50, 65, 3, 'url(#c-go)', 1.2) +
    P('M30 52 L35 45 L44 46 L42 54 Z M70 52 L65 45 L56 46 L58 54 Z', 'url(#c-go)', 1.6) +
    line('M80 22 V92', K, 6) + line('M80 22 V92', '#e8b04a', 3.6) +
    P('M72 18 L76 12 L80 16 L84 12 L88 18 L80 22 Z', 'url(#c-go)', 1.4) + C(80, 13, 3, 'url(#c-go)', 1.2) +
    limb('M64 53 L77 60', '#f2b583', 6.4) + fist(80, 60.5, 5) +
    limb('M37 53 L37 63', '#f2b583', 6.4) + fist(40, 65, 4.8) +
    headShape(50, 32, 19, 21) +
    P('M30 30 L29 42 L34 40 L34 28 Z M70 30 L71 42 L66 40 L66 28 Z', 'url(#c-wh)', 1.6) +
    P('M32 38 L34 50 L42 57 H58 L66 50 L68 38 L60 44 H40 Z', 'url(#c-wh)', 2) + line('M44 47 L46 54 M50 46 V56 M56 47 L54 54', '#cfc4ad', 1.2) +
    P('M41 42 L50 40 L59 42 L55 45 L50 43 L45 45 Z', '#fff', 1.4) +
    (sleep ? line('M39 35 Q42.5 38 46 35 M54 35 Q57.5 38 61 35', K, 2) : eyes(50, 35, 7, { rx: 3.6, ry: 4.2 })) +
    brows(50, 29.5, 7, !sleep, '#f4f4f4') +
    P('M31 25 L33 8 L41 16 L50 3 L59 16 L67 8 L69 25 Q50 20 31 25 Z', 'url(#c-go)', 2) +
    C(50, 14, 2, '#d62d20', 0.8) + C(40, 19.5, 1.5, 'url(#c-tm)', 0.6) + C(60, 19.5, 1.5, 'url(#c-tm)', 0.6);
  D.basileus = () => basileus(false);
  D.basileus_dorme = () => basileus(true);

  // ---------- Frombolieri: berretto a punta e fionda ----------
  D.frombolieri = () =>
    feet(42, 59, 93) + legs(42, 59, 80, 90.5, 'url(#c-sk)', 4.6) + line('M37.4 86 H46.6 M54.4 86 H63.6', '#6c3814', 1.8) +
    P('M33 51 L39 47.5 H61 L67 51 L69 82 H31 Z', 'url(#c-tm)') + P('M30.6 78 H69.4 L69 82 H31 Z', 'url(#c-wh)', 1.4) +
    P('M33 64 L50 66.5 L67 64 V68.5 L50 71 L33 68.5 Z', 'url(#c-lt)', 1.4) +
    limb('M36 53 L30 65', '#f2b583', 6) + fist(29, 67.5, 4.6) + P('M23 71 H33 L32 79 H24 Z', 'url(#c-lt)', 1.6) +
    line('M77 29 L91 12', '#7a4a26', 1.8) + line('M76 31 L94 22', '#7a4a26', 1.8) + C(93, 12, 4.4, 'url(#c-rk)', 1.6) +
    line('M82 2 Q99 4 100 22', '#fff', 2, 0.6) +
    limb('M64 52 L73 35', '#f2b583', 6) + fist(75, 31.5, 4.8) +
    headShape(50, 33, 19, 21) +
    P('M31 34 L30 26 L36 22 H64 L70 26 L69 34 L64 28 H36 Z', 'url(#c-hr)', 1.8) +
    P('M27 27 Q50 20 73 27 L73 31 Q50 24 27 31 Z', 'url(#c-lt)', 1.8) +
    P('M31 26 L50 -1 L69 26 Q50 21 31 26 Z', 'url(#c-tm)', 2) + shine('M40 15 L47 6', 2, 0.6) +
    eyes(50, 37.5, 7, { rx: 3.8, ry: 4.6, iris: '#7a4a26' }) + brows(50, 31.4, 7, true) + mouth(50, 46.5, 'shout', 4.2);

  // ---------- Arpie: donna-uccello con le ali ----------
  const wing = (s) => {
    const x = (v) => 50 + s * (v - 50);
    return P(`M${x(38)} 50 L${x(8)} 30 L${x(4)} 44 L${x(12)} 46 L${x(6)} 56 L${x(16)} 56 L${x(14)} 66 L${x(36)} 60 Z`, 'url(#c-fur)', 2) +
      P(`M${x(38)} 50 L${x(8)} 30 L${x(11)} 38 L${x(37)} 55 Z`, 'url(#c-tm)', 1.4) +
      line(`M${x(30)} 54 L${x(12)} 47 M${x(30)} 58 L${x(16)} 57`, '#583014', 1.4);
  };
  D.arpie = () =>
    wing(1) + wing(-1) +
    line('M44 74 L42 86 M56 74 L58 86', K, 4.6) + line('M44 74 L42 86 M56 74 L58 86', '#ffcf33', 2.6) +
    line('M36 89 L42 86 L45 91 M55 91 L58 86 L64 89', K, 2.4) +
    P('M38 48 L62 48 L64 70 L50 77 L36 70 Z', 'url(#c-fur)') + P('M43 54 H57 L58 68 L50 72 L42 68 Z', 'url(#c-mz)', 1.4) +
    line('M45 58 L50 61 L55 58 M45 64 L50 67 L55 64', '#a87048', 1.2) +
    P('M30 34 L26 56 L36 50 Z M70 34 L74 56 L64 50 Z', 'url(#c-ph)', 1.8) +
    headShape(50, 32, 18, 20) +
    P('M30 34 L28 18 L34 10 L40 13 L45 4 L50 10 L56 3 L60 12 L67 10 L72 20 L70 34 L64 23 H36 Z', 'url(#c-ph)', 2) +
    eyes(50, 35.5, 6.8, { rx: 3.8, ry: 4.4, iris: '#ffb02e' }) + brows(50, 29.6, 6.8, true) +
    P('M44 44 H56 L54 48 H46 Z', '#7a1f17', 1.4) + P('M45 44 L46.5 47 L48 44 Z M52 44 L53.5 47 L55 44 Z', '#fff', 0.8);

  // ---------- Scheletri: teschio con l'elmo, spada e scudo ----------
  D.scheletri = (T) =>
    line('M44 76 V91 M56 76 V91', K, 5.6) + line('M44 76 V91 M56 76 V91', '#efe6cf', 3.2) +
    P('M38 90 H47 L48 94.5 H38 Z M53 90 H62 L63 94.5 H53 Z', 'url(#c-bn)', 1.6) +
    P('M40 71 H60 L58 79 H42 Z', 'url(#c-bn)', 1.8) +
    line('M50 52 V72', K, 4.6) + line('M50 52 V72', '#efe6cf', 2.6) +
    P('M38 52 L43 48.5 H57 L62 52 L60 65 L50 68 L40 65 Z', 'url(#c-bn)', 2) + line('M41 56 H59 M41.5 60.5 H58.5', K, 1.6, 0.8) +
    line('M73 61 L93 29', K, 5.4) + line('M73 61 L93 29', '#dfe6ee', 3) + line('M69 57 L78 64', K, 3.6) + line('M69 57 L78 64', '#ffcf33', 2) +
    line('M61 53 L72 60', K, 5) + line('M61 53 L72 60', '#efe6cf', 2.8) + C(74, 61, 3.6, 'url(#c-bn)', 1.4) +
    line('M39 53 L32 60', K, 5) + line('M39 53 L32 60', '#efe6cf', 2.8) +
    C(30, 63, 12.5, 'url(#c-br)', 2) + C(30, 63, 8.8, 'url(#c-tm)', 1.4) + line('M26 67 L30 59 L34 67', '#fff8e6', 2.4) +
    headShape(50, 31, 19, 20, 'url(#c-bn)') +
    E(42.5, 32, 5, 5.6, K, 1) + E(57.5, 32, 5, 5.6, K, 1) + C(43.5, 33, 2, T.l, 0) + C(58.5, 33, 2, T.l, 0) +
    P('M48 41 L50 37.5 L52 41 Z', K, 1) +
    P('M41 44 H59 V48.5 H41 Z', '#fff', 1.6) + line('M44.6 44 V48.5 M48.2 44 V48.5 M51.8 44 V48.5 M55.4 44 V48.5', K, 1) +
    P('M30 26 Q30 9 50 9 Q70 9 70 26 L64 22 L50 20 L36 22 Z', 'url(#c-br)', 2) + line('M60 13 L58 18', K, 1.4) +
    P('M42 10 L50 1 L58 10 Z', 'url(#c-tm)', 1.6);

  // ---------- Legionari: elmo romano, corazza a bande, scudo rettangolare ----------
  D.legionari = () =>
    feet(42, 59, 93) + legs(42, 59, 80, 90.5, 'url(#c-sk)', 4.6) + line('M37.4 85 H46.6 M54.4 85 H63.6', '#6c3814', 1.8) +
    P('M34 68 H66 L69 82 H31 Z', 'url(#c-tm)') +
    P('M33 51 L39 47 H61 L67 51 L65 70 H35 Z', 'url(#c-st)') + line('M34.5 56 H65.5 M34.8 61 H65.2 M35 66 H65', '#6f7b8a', 1.6) +
    P('M34 68 H66 V72 H34 Z', 'url(#c-lt)', 1.4) + line('M46 72 V80 M50 72 V81 M54 72 V80', '#7a4a26', 2.2) +
    P('M70.5 58 L72 34 L74.5 30 L77 34 L77.5 58 Z', 'url(#c-st)', 1.6) + P('M68 56 H80 V59.5 H68 Z', 'url(#c-go)', 1.2) +
    limb('M63 52 L70 60', '#f2b583', 6.2) + fist(73.5, 61.5, 5) +
    headShape(50, 33, 19, 21) +
    P('M29 34 Q28 10 50 9 Q72 10 71 34 L66 29 V25 H34 V29 Z', 'url(#c-st)', 2.2) +
    P('M30 29 L36 29 L37 46 L31 44 Z M70 29 L64 29 L63 46 L69 44 Z', 'url(#c-st)', 1.6) +
    line('M30 24 H70', '#6f7b8a', 1.6) + shine('M33 20 Q36 13 44 11', 2.4) +
    P('M33 11 Q50 -7 67 11 L62 13 Q50 3 38 13 Z', 'url(#c-tm)', 1.8) +
    eyes(50, 37.5, 7, { rx: 3.8, ry: 4.6 }) + brows(50, 31.6, 7, true) + mouth(50, 47, 'grin', 4.2) +
    P('M17 50 Q27 47 37 50 V87 Q27 90 17 87 Z', 'url(#c-tm)', 2.4) + line('M20 53 Q27 51 34 53 V84 Q27 86 20 84 Z', '#ffcf33', 1.4) +
    line('M20 61 L27 65 L34 61 M20 77 L27 73 L34 77', '#ffcf33', 2.2) + C(27, 69, 4.4, 'url(#c-go)', 1.4);

  // ---------- Testuggine: legionario chiuso dietro gli scudi ----------
  D.testuggine = () =>
    feet(40, 60, 93) + legs(40, 60, 84, 90.5, 'url(#c-sk)', 4.6) +
    limb('M34 52 L22 32', '#f2b583', 6) + limb('M66 52 L78 32', '#f2b583', 6) +
    headShape(50, 37, 17, 17) +
    P('M32 36 Q32 18 50 18 Q68 18 68 36 L63 31 H37 Z', 'url(#c-st)', 2) +
    eyes(50, 39, 6.4, { rx: 3.4, ry: 4 }) + brows(50, 33.6, 6.4, true) +
    P('M14 22 Q50 10 86 22 L84 32 Q50 21 16 32 Z', 'url(#c-tm)', 2.2) + line('M18 24 Q50 14 82 24', '#ffcf33', 1.4) +
    fist(21, 30, 4.4) + fist(79, 30, 4.4) +
    P('M20 44 Q50 39 80 44 V89 Q50 94 20 89 Z', 'url(#c-tm)', 2.4) + line('M24 47 Q50 43 76 47 V86 Q50 90 24 86 Z', '#ffcf33', 1.6) +
    line('M27 56 L36 63 L27 70 M73 56 L64 63 L73 70', '#ffcf33', 2.4) + C(50, 66, 6.4, 'url(#c-go)', 1.6) +
    [[28, 50], [72, 50], [28, 82], [72, 82]].map(([x, y]) => C(x, y, 1.6, '#fff6c8', 0.6)).join('') +
    shine('M25 50 Q36 46 46 46', 2.2, 0.6);

  // ---------- Gladiatore: elmo con la grata, torso nudo, spada alzata ----------
  D.gladiatore = () =>
    feet(42, 59, 93) + legs(42, 59, 80, 90.5, 'url(#c-sk)', 4.6) + P('M36.5 80 H47.5 V90 H36.5 Z', 'url(#c-st)', 1.6) +
    P('M36 68 H64 L67 82 L50 86 L33 82 Z', 'url(#c-tm)') +
    P('M30 50 L37 46 H63 L70 50 L66 66 L50 69 L34 66 Z', 'url(#c-sk)') +
    line('M40 53 L50 56 L60 53 M50 56 V65 M44 61 H56', '#d98b58', 1.6) +
    P('M33 64 L50 67 L67 64 V70 L50 73 L33 70 Z', 'url(#c-go)', 1.6) +
    limb('M33 52 L25 63', '#cfd8e2', 8) + line('M28 55 L33 58 M26 59 L31 62', '#6f7b8a', 1.4) +
    C(22, 68, 11, 'url(#c-br)', 2) + C(22, 68, 7.4, 'url(#c-tm)', 1.4) +
    P('M74 40 L90 13 L94 15 L78 43 Z', 'url(#c-st)', 1.6) + line('M70 39 L80 45', K, 4) + line('M70 39 L80 45', '#ffcf33', 2.2) +
    limb('M66 52 L73 45', '#f2b583', 7) + fist(76, 42.5, 5.4) +
    headShape(50, 31, 20, 21) +
    P('M28 36 Q27 6 50 5 Q73 6 72 36 L72 46 H28 Z', 'url(#c-st)', 2.2) +
    P('M35 26 H65 V44 H35 Z', '#2b2f36', 1.6) + line('M40 26 V44 M45 26 V44 M50 26 V44 M55 26 V44 M60 26 V44 M35 32 H65 M35 38 H65', '#cfd8e2', 1.6) +
    C(42.5, 34.5, 2.2, '#fff', 0) + C(57.5, 34.5, 2.2, '#fff', 0) +
    P('M24 27 Q50 19 76 27 L76 30.5 Q50 23 24 30.5 Z', 'url(#c-st)', 1.8) + shine('M32 18 Q36 10 44 8', 2.4) +
    P('M44 6 Q52 -9 72 -1 Q63 3 57 8 Z', 'url(#c-tm)', 1.8);

  // ---------- Centauro: corpo di cavallo, busto d'uomo, lancia ----------
  D.centauro = () =>
    P('M18 58 Q4 60 6 80 Q12 70 20 66 Z', 'url(#c-hr)', 1.8) +
    P('M22 72 L20 91 H27 L29 74 Z M34 74 L33 91 H40 L41 74 Z M60 74 L60 91 H67 L66 74 Z M72 72 L74 91 H81 L78 72 Z', 'url(#c-fur)', 1.8) +
    P('M19 90 H28 V95 H19 Z M32 90 H41 V95 H32 Z M59 90 H68 V95 H59 Z M73 90 H82 V95 H73 Z', '#2e2622', 1.6) +
    P('M18 58 Q18 51 26 51 H70 Q80 51 80 59 L78 75 H20 Z', 'url(#c-fur)', 2.2) +
    P('M34 51 H56 L58 70 H32 Z', 'url(#c-tm)', 1.8) + line('M33 67 H57', '#ffcf33', 2) +
    line('M54 64 L98 8', K, 5.4) + line('M54 64 L98 8', '#b0743c', 3) + P('M95 12 L103 -2 L91 6 Z', 'url(#c-st)', 1.4) +
    P('M58 55 L60 35 L66 31 H78 L84 34 L82 56 Z', 'url(#c-sk)', 2) + line('M64 40 L71 43 L78 40', '#d98b58', 1.4) +
    limb('M62 37 L66 48', '#f2b583', 6) + fist(66.5, 50, 4.6) +
    limb('M80 37 L84 32', '#f2b583', 6) + fist(85, 28, 4.6) +
    headShape(71, 20, 15, 16) +
    P('M57 23 Q56 4 71 4 Q86 4 85 23 L81 14 L71 11 L61 14 Z', 'url(#c-hr)', 2) +
    P('M58 25 L60 32 L66 36 H76 L82 32 L84 25 L78 29 H64 Z', 'url(#c-hr)', 1.8) +
    line('M57 15 L71 11 L85 15', K, 4.6) + line('M57 15 L71 11 L85 15', '#ffcf33', 2.6) +
    eyes(71, 21, 5.4, { rx: 3.2, ry: 3.8, iris: '#5a3a20' }) + brows(71, 16.6, 5.2, true) + mouth(71, 30, 'grin', 3.2);

  // ---------- Cavallo di Troia: grande cavallo di legno su ruote ----------
  D.cavallo = () =>
    P('M14 46 Q4 50 6 64 Q10 56 15 54 Z', 'url(#c-hr)', 1.8) +
    P('M20 60 H28 V79 H20 Z M34 60 H42 V79 H34 Z M58 60 H66 V79 H58 Z M72 60 H80 V79 H72 Z', 'url(#c-wd)', 1.8) +
    P('M10 78 H90 V85 H10 Z', 'url(#c-wd)', 2) +
    C(22, 88, 7, 'url(#c-wd)', 2) + C(22, 88, 2.4, 'url(#c-go)', 1) + C(78, 88, 7, 'url(#c-wd)', 2) + C(78, 88, 2.4, 'url(#c-go)', 1) +
    P('M14 46 Q14 38 24 38 H74 Q82 38 82 46 V62 H14 Z', 'url(#c-wd)', 2.2) +
    line('M16 45 H80 M16 52 H80 M16 58 H80', '#6c3814', 1.2) + P('M40 46 H56 V60 H40 Z', '#4a2a12', 1.6) + line('M48 46 V60', '#a9652f', 1.2) +
    P('M64 40 L70 12 L84 10 L84 40 Z', 'url(#c-wd)', 2) + line('M68 30 H83 M70 20 H84', '#6c3814', 1.2) +
    P('M66 40 L69 12 L64 14 L60 38 Z', 'url(#c-tm)', 1.6) +
    P('M74 2 L76 -6 L80 1 Z', 'url(#c-wd)', 1.4) +
    P('M68 8 Q70 -1 82 0 L98 12 L96 22 L84 20 L72 14 Z', 'url(#c-wd)', 2) + C(84, 8, 2, K, 0) + C(83.4, 7.3, 0.7, '#fff', 0) +
    E(94, 15, 1.4, 1, K, 0) + shine('M74 4 Q78 2 82 2.5', 1.6, 0.5);

  // ---------- Balista: grande arco su un cavalletto ----------
  D.balista = () =>
    P('M18 82 H82 L86 94 H14 Z', 'url(#c-wd)', 2) + P('M44 56 H56 V83 H44 Z', 'url(#c-wd)', 1.8) +
    line('M26 52 V28', K, 3.4) + line('M26 52 V28', '#b0743c', 1.8) + P('M26 28 L41 32 L26 37 Z', 'url(#c-tm)', 1.6) +
    P('M18 50 H84 V59 H18 Z', 'url(#c-wd)', 2) + P('M40 50 H48 V59 H40 Z M70 50 H76 V59 H70 Z', 'url(#c-go)', 1.2) +
    line('M64 28 Q76 54 64 80', K, 7.4) + line('M64 28 Q76 54 64 80', '#b0743c', 4.2) +
    line('M64 28 L34 54.5 L64 80', '#fff', 1.4) +
    line('M32 54.5 H96', K, 4.4) + line('M32 54.5 H96', '#c98e5c', 2.4) + P('M95 50.5 L104 54.5 L95 58.5 Z', 'url(#c-st)', 1.4) +
    P('M30 51.5 L36 54.5 L30 57.5 Z', 'url(#c-tm)', 1.2);

  // ---------- Vaso di Pandora e i suoi mali ----------
  D.vaso = () =>
    P('M46 14 Q38 2 48 -4 Q46 4 54 6 Q58 -4 68 0 Q60 8 58 16 Z', 'url(#c-pu)', 1.8) + C(50, 2, 1.4, '#ffe680', 0) + C(55, 3, 1.4, '#ffe680', 0) +
    line('M40 30 Q27 30 30 46', K, 6.4) + line('M40 30 Q27 30 30 46', '#d9693a', 3.4) +
    line('M60 30 Q73 30 70 46', K, 6.4) + line('M60 30 Q73 30 70 46', '#d9693a', 3.4) +
    P('M32 40 Q20 56 30 78 L34 88 H66 L70 78 Q80 56 68 40 Z', 'url(#c-tc)', 2.2) +
    P('M40 25 H60 L58 40 H42 Z', 'url(#c-tc)', 2) + P('M36 20 H64 V26 H36 Z', 'url(#c-tc)', 2) +
    P('M26 54 H74 V68 H26 Z', '#2a1a14', 1.6) + line('M33 66 L37 58 L41 66 M47 66 L51 58 L55 66 M61 66 L65 58 L69 66', '#e07a4a', 2) +
    line('M27 51 H73 M27 71 H73', 'url(#c-tm)', 2.6) +
    P('M38 88 H62 L64 94.5 H36 Z', 'url(#c-tc)', 1.8) + shine('M34 46 Q30 54 31 62', 2.4, 0.5);
  D.male = () =>
    P('M40 50 L10 34 L16 46 L6 52 L20 56 L18 64 L40 60 Z', 'url(#c-pu)', 2) + P('M60 50 L90 34 L84 46 L94 52 L80 56 L82 64 L60 60 Z', 'url(#c-pu)', 2) +
    P('M38 52 L16 44 L22 54 Z M62 52 L84 44 L78 54 Z', 'url(#c-tm)', 1.2) +
    P('M50 30 Q70 34 68 56 Q66 76 50 86 Q34 76 32 56 Q30 34 50 30 Z', 'url(#c-pu)', 2.2) +
    P('M38 38 L32 22 L45 33 Z M62 38 L68 22 L55 33 Z', '#2a1a2a', 1.6) +
    eyes(50, 52, 7, { rx: 4.2, ry: 4.8, iris: '#ffcf33' }) + brows(50, 45.8, 7, true) +
    P('M43 63 H57 L55 68 H45 Z', '#3a0f2a', 1.4) + P('M44.5 63 L46 66.5 L47.5 63 Z M52.5 63 L54 66.5 L55.5 63 Z', '#fff', 0.8);

  // ---------- Guerriero acheo (esce dal cavallo di Troia) ----------
  D.acheo = () =>
    feet(42, 59, 93) + legs(42, 59, 80, 90.5, 'url(#c-sk)', 4.6) +
    P('M33 68 H67 L70 83 H30 Z', 'url(#c-tm)') +
    P('M32 51 L38 47 H62 L68 51 L66 71 L50 74 L34 71 Z', 'url(#c-lt)') + line('M38 56 H62 M38 62 H62', '#4a2a12', 1.4) +
    P('M72 58 L88 32 L91 34 L76 61 Z', 'url(#c-st)', 1.6) + line('M69 56 L78 62', K, 3.6) + line('M69 56 L78 62', '#ffcf33', 2) +
    limb('M64 52 L71 58', '#f2b583', 6.2) + fist(73.5, 60, 5) +
    P('M30 34 L24 62 L32 58 L36 36 Z', 'url(#c-tm)', 1.6) +
    headShape(50, 33, 19, 21) +
    P('M29 34 Q28 9 50 8 Q72 9 71 34 L66 28 H34 Z', 'url(#c-br)', 2.2) + line('M31 22 H69', '#a3610f', 1.6) +
    P('M47 8 L50 2 L53 8 Z', 'url(#c-br)', 1.4) +
    eyes(50, 37.5, 7, { rx: 3.8, ry: 4.6, iris: '#5a3a20' }) + brows(50, 31.6, 7, true) + mouth(50, 46.5, 'shout', 4.2) +
    C(28, 66, 12, 'url(#c-br)', 2) + C(28, 66, 8.4, 'url(#c-tm)', 1.4) + C(28, 66, 2.6, 'url(#c-go)', 1);

  // ---------- Sirene: coda di pesce, lira, note ----------
  D.sirene = () =>
    P('M40 66 Q30 80 44 88 Q58 94 72 86 L82 78 L80 93 L95 90 L84 80 Q76 74 70 80 Q60 86 52 80 Q60 72 60 64 Z', 'url(#c-tm)', 2.2) +
    line('M44 76 q3 3 6 0 M52 84 q3 3 6 0 M62 82 q3 3 6 0 M48 70 q3 3 6 0', '#fff', 1.4, 0.6) +
    P('M38 51 L44 47.5 H56 L62 51 L60 67 H40 Z', 'url(#c-sk)', 2) + C(44.5, 55, 4.2, 'url(#c-hn)', 1.4) + C(55.5, 55, 4.2, 'url(#c-hn)', 1.4) +
    P('M20 44 Q15 60 26 65 H34 Q43 60 38 44 L35 46 Q36 58 30 60 Q24 58 23 46 Z', 'url(#c-go)', 1.6) +
    line('M27 48 V60 M30 48 V61 M33 48 V60', '#fff', 0.9) + line('M21.5 46 H37', K, 2.4) +
    limb('M40 53 L32 58', '#f2b583', 6) + fist(31, 58, 4.2) +
    limb('M60 53 L66 60', '#f2b583', 6) + fist(67, 61.5, 4.2) +
    P('M28 30 Q26 60 37 66 L40 36 Z M72 30 Q74 60 63 66 L60 36 Z', 'url(#c-sea)', 1.8) +
    headShape(50, 32, 19, 20) +
    P('M30 33 Q30 10 50 10 Q70 10 70 33 L64 22 L50 19 L36 22 Z', 'url(#c-sea)', 2) +
    P('M62 12 L64 7 L66 12 L71 12 L67 15 L69 20 L64 17 L59 20 L61 15 L57 12 Z', 'url(#c-go)', 1.2) +
    eyes(50, 36.5, 7, { rx: 3.8, ry: 4.6, iris: '#2aa58f' }) + brows(50, 30.6, 7, false, '#1f7a6a') +
    cheeks(50, 44, 11.5) + P('M47.6 44.5 Q50 43 52.4 44.5 Q52.4 48.5 50 48.5 Q47.6 48.5 47.6 44.5 Z', '#7a1f17', 1.2) +
    C(80, 30, 2.6, K, 0) + line('M82.4 30 V19 L89 17 V27', K, 1.8) + C(86.6, 27.5, 2.6, K, 0);

  // ---------- Satiro: zampe di capra, corna, flauto ----------
  D.satiro = () =>
    P('M38 72 L36 84 L40 91 H47 L46 84 L48 72 Z M52 72 L54 84 L53 91 H60 L64 84 L62 72 Z', 'url(#c-fur)', 1.8) +
    P('M38 90 H48 V95 H38 Z M52 90 H62 V95 H52 Z', '#2e2622', 1.4) + line('M43 90.5 V95 M57 90.5 V95', '#6b625c', 1) +
    P('M34 66 H66 L68 78 L50 82 L32 78 Z', 'url(#c-fur)', 2) +
    P('M34 50 L40 47 H60 L66 50 L64 68 H36 Z', 'url(#c-sk)', 2) + line('M38 49 L62 66', K, 5.4) +
    `<path d="M38 49 L62 66" stroke="url(#c-tm)" stroke-width="3.2" stroke-linecap="round"/>` +
    [[59, 44, 14], [63, 44, 12], [67, 44, 10], [71, 44, 8]].map(([x, y, h]) => P(`M${x} ${y} H${x + 4} V${y + h} H${x} Z`, 'url(#c-wd)', 1.2)).join('') +
    line('M58.5 49 H75.5', '#ffcf33', 1.8) +
    limb('M37 52 L52 56', '#f2b583', 6) + fist(56, 55, 4.2) + limb('M64 52 L70 58', '#f2b583', 6) + fist(70, 60, 4.2) +
    P('M30 30 L20 26 L28 37 Z M70 30 L80 26 L72 37 Z', 'url(#c-sk)', 1.6) +
    headShape(50, 32, 19, 20) +
    P('M30 33 L29 18 L35 12 L41 14 L45 7 L50 12 L55 7 L59 14 L65 12 L71 18 L70 33 L65 23 H35 Z', 'url(#c-hr)', 2) +
    P('M36 17 L27 2 L41 12 Z M64 17 L73 2 L59 12 Z', 'url(#c-hn)', 1.6) +
    P('M46 48 L50 57 L54 48 Z', 'url(#c-hr)', 1.4) +
    eyes(50, 36.5, 7, { rx: 3.8, ry: 4.6, iris: '#c98a0e' }) + brows(50, 30.6, 7, false, '#4b2b15') +
    cheeks(50, 44, 11.5) + mouth(50, 44.6, 'grin', 4) +
    C(84, 22, 2.4, K, 0) + line('M86.2 22 V12', K, 1.8) + line('M86.2 12 L91 14', K, 1.8);

  // ---------- Medusa: serpenti per capelli, coda di serpente ----------
  const snake = (x1, y1, cx, cy, x2, y2) => line(`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`, K, 7.4) + line(`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`, '#5bbf4a', 4.4) +
    C(x2, y2, 3.8, 'url(#c-gr)', 1.4) + C(x2 + 1, y2 - 0.6, 1, '#ffcf33', 0);
  D.medusa = () =>
    P('M36 66 Q28 84 40 90 H70 Q84 88 80 76 Q74 70 66 76 Q72 82 64 84 H46 Q40 80 44 66 Z', 'url(#c-gr)', 2.2) +
    line('M38 76 H46 M38 82 H48 M52 88 V84 M60 88 V84', '#e8d27a', 1.6) +
    P('M36 50 L42 47 H58 L64 50 L62 68 H38 Z', 'url(#c-tm)', 2) + P('M37 62 L50 64.5 L63 62 V66 L50 68.5 L37 66 Z', 'url(#c-go)', 1.4) +
    limb('M38 53 L28 62', '#b9dca0', 6) + fist(26, 64, 4.4, 'url(#c-ms)') +
    limb('M62 53 L72 62', '#b9dca0', 6) + fist(74, 64, 4.4, 'url(#c-ms)') +
    snake(32, 30, 22, 28, 20, 42) + snake(68, 30, 78, 28, 80, 42) +
    snake(36, 20, 26, 22, 22, 8) + snake(44, 14, 34, 8, 36, -2) + snake(50, 12, 56, 4, 50, -4) + snake(56, 14, 66, 8, 66, -2) + snake(64, 20, 76, 20, 80, 8) +
    headShape(50, 32, 19, 20, 'url(#c-ms)') +
    P('M30 33 Q30 12 50 12 Q70 12 70 33 L64 22 L50 20 L36 22 Z', 'url(#c-gr)', 2) +
    eyes(50, 36.5, 7, { rx: 3.8, ry: 4.6, iris: '#ffcf33' }) + brows(50, 30.6, 7, true, '#2d6424') +
    mouth(50, 46, 'smirk', 4);

  // ---------- Pegaso: cavallo bianco con le ali ----------
  D.pegaso = () =>
    P('M44 48 L30 14 L38 18 L40 8 L48 16 L52 6 L56 18 L58 48 Z', 'url(#c-cl)', 1.8) +
    P('M22 52 Q6 50 8 70 Q14 60 24 60 Z', 'url(#c-tm)', 1.8) +
    P('M28 64 L24 80 H30 L34 66 Z M40 64 L40 80 H46 L46 66 Z M58 64 L62 80 H68 L64 64 Z M66 62 L76 76 L80 72 L72 60 Z', 'url(#c-wh)', 1.8) +
    P('M23 79 H31 V83 H23 Z M39 79 H47 V83 H39 Z M61 79 H69 V83 H61 Z', 'url(#c-go)', 1.2) +
    P('M22 54 Q22 46 32 46 H66 Q74 46 74 54 L72 66 H24 Z', 'url(#c-wh)', 2.2) +
    P('M62 48 L68 24 L80 22 L78 50 Z', 'url(#c-wh)', 2) +
    P('M62 48 L66 22 L60 26 L56 44 Z', 'url(#c-tm)', 1.6) +
    P('M70 13 L71 4 L76 12 Z', 'url(#c-wh)', 1.4) +
    P('M66 22 Q66 12 76 12 L92 20 L92 28 L80 30 L70 28 Z', 'url(#c-wh)', 2) + P('M64 16 L70 10 L72 18 Z', 'url(#c-tm)', 1.2) +
    C(77, 19, 2.4, K, 0) + C(76.3, 18.2, 0.8, '#fff', 0) + E(89, 24, 1.2, 0.9, K, 0) + line('M70 26 L88 24', '#ffcf33', 1.4) +
    P('M36 48 L16 6 L28 12 L28 0 L40 10 L44 -2 L50 12 L54 48 Z', 'url(#c-wh)', 2) +
    line('M24 10 L36 34 M34 6 L42 32 M44 6 L47 30', '#cfc4ad', 1.4) + P('M16 6 L28 12 L26 16 Z M28 0 L40 10 L36 12 Z', 'url(#c-tm)', 1);

  // ---------- Cerbero: cane a tre teste ----------
  const dogHead = (cx, cy, s) =>
    P(`M${cx - 10 * s} ${cy - 6 * s} L${cx - 13 * s} ${cy - 20 * s} L${cx - 3 * s} ${cy - 10 * s} Z M${cx + 10 * s} ${cy - 6 * s} L${cx + 13 * s} ${cy - 20 * s} L${cx + 3 * s} ${cy - 10 * s} Z`, 'url(#c-dk)', 1.6) +
    P(`M${cx - 12 * s} ${cy - 8 * s} Q${cx} ${cy - 15 * s} ${cx + 12 * s} ${cy - 8 * s} L${cx + 13 * s} ${cy + 4 * s} L${cx + 6 * s} ${cy + 12 * s} H${cx - 6 * s} L${cx - 13 * s} ${cy + 4 * s} Z`, 'url(#c-dk)', 2) +
    P(`M${cx - 6 * s} ${cy + 2 * s} H${cx + 6 * s} L${cx + 7 * s} ${cy + 9 * s} L${cx} ${cy + 13 * s} L${cx - 7 * s} ${cy + 9 * s} Z`, '#8a7f8c', 1.6) +
    E(cx, cy + 3.6 * s, 2.6 * s, 1.8 * s, K, 0) +
    P(`M${cx - 4 * s} ${cy + 9 * s} L${cx - 3 * s} ${cy + 13 * s} L${cx - 2 * s} ${cy + 9.5 * s} Z M${cx + 2 * s} ${cy + 9.5 * s} L${cx + 3 * s} ${cy + 13 * s} L${cx + 4 * s} ${cy + 9 * s} Z`, '#fff', 1) +
    E(cx - 5 * s, cy - 3 * s, 2.8 * s, 3.2 * s, '#fff', 1.2) + E(cx + 5 * s, cy - 3 * s, 2.8 * s, 3.2 * s, '#fff', 1.2) +
    C(cx - 4.4 * s, cy - 2.6 * s, 1.8 * s, '#ff3b2b', 0) + C(cx + 5.6 * s, cy - 2.6 * s, 1.8 * s, '#ff3b2b', 0) +
    C(cx - 4.2 * s, cy - 2.4 * s, 0.8 * s, K, 0) + C(cx + 5.8 * s, cy - 2.4 * s, 0.8 * s, K, 0) +
    P(`M${cx - 10 * s} ${cy - 9 * s} L${cx - 1.5 * s} ${cy - 5 * s} L${cx - 1.5 * s} ${cy - 7 * s} L${cx - 10 * s} ${cy - 11.5 * s} Z M${cx + 10 * s} ${cy - 9 * s} L${cx + 1.5 * s} ${cy - 5 * s} L${cx + 1.5 * s} ${cy - 7 * s} L${cx + 10 * s} ${cy - 11.5 * s} Z`, K, 0.8) +
    P(`M${cx - 11 * s} ${cy + 12 * s} H${cx + 11 * s} V${cy + 16.5 * s} H${cx - 11 * s} Z`, 'url(#c-tm)', 1.4) +
    P(`M${cx - 7 * s} ${cy + 16.5 * s} L${cx - 5.5 * s} ${cy + 20 * s} L${cx - 4 * s} ${cy + 16.5 * s} Z M${cx - 1.5 * s} ${cy + 16.5 * s} L${cx} ${cy + 20 * s} L${cx + 1.5 * s} ${cy + 16.5 * s} Z M${cx + 4 * s} ${cy + 16.5 * s} L${cx + 5.5 * s} ${cy + 20 * s} L${cx + 7 * s} ${cy + 16.5 * s} Z`, 'url(#c-go)', 1);
  D.cerbero = () =>
    P('M22 58 Q8 54 10 40 Q16 50 24 52 Z', 'url(#c-dk)', 1.8) +
    P('M28 74 L26 91 H36 L37 76 Z M42 76 L42 91 H51 L50 76 Z M58 76 L58 91 H67 L66 76 Z M70 74 L72 91 H81 L78 74 Z', 'url(#c-dk)', 1.8) +
    P('M25 90 H37 V95 H25 Z M41 90 H52 V95 H41 Z M57 90 H68 V95 H57 Z M71 90 H82 V95 H71 Z', '#231c25', 1.4) +
    P('M20 60 Q20 50 30 50 H70 Q80 50 80 60 L78 78 H22 Z', 'url(#c-dk)', 2.2) + line('M30 58 L36 62 M44 58 L50 62 M58 58 L64 62', '#231c25', 1.4) +
    dogHead(24, 38, 0.82) + dogHead(76, 38, 0.82) + dogHead(50, 28, 1);

  // ---------- Idra: corpo di serpente e tre teste di drago ----------
  const dragonHead = (cx, cy, s) =>
    P(`M${cx - 7 * s} ${cy - 6 * s} L${cx - 5 * s} ${cy - 14 * s} L${cx - 2 * s} ${cy - 6 * s} Z M${cx - 2 * s} ${cy - 6 * s} L${cx} ${cy - 16 * s} L${cx + 2 * s} ${cy - 6 * s} Z M${cx + 2 * s} ${cy - 6 * s} L${cx + 5 * s} ${cy - 14 * s} L${cx + 7 * s} ${cy - 6 * s} Z`, 'url(#c-tm)', 1.4) +
    P(`M${cx - 10 * s} ${cy - 6 * s} L${cx + 10 * s} ${cy - 6 * s} L${cx + 12 * s} ${cy + 4 * s} L${cx + 6 * s} ${cy + 12 * s} H${cx - 6 * s} L${cx - 12 * s} ${cy + 4 * s} Z`, 'url(#c-gr)', 2) +
    E(cx - 5 * s, cy - 1 * s, 2.8 * s, 3.2 * s, '#fff', 1.2) + E(cx + 5 * s, cy - 1 * s, 2.8 * s, 3.2 * s, '#fff', 1.2) +
    C(cx - 4.2 * s, cy - 0.6 * s, 1.8 * s, '#ffb02e', 0) + C(cx + 5.8 * s, cy - 0.6 * s, 1.8 * s, '#ffb02e', 0) +
    C(cx - 4 * s, cy - 0.4 * s, 0.8 * s, K, 0) + C(cx + 6 * s, cy - 0.4 * s, 0.8 * s, K, 0) +
    P(`M${cx - 9 * s} ${cy - 6.5 * s} L${cx - 1.5 * s} ${cy - 3 * s} L${cx - 1.5 * s} ${cy - 5 * s} L${cx - 9 * s} ${cy - 9 * s} Z M${cx + 9 * s} ${cy - 6.5 * s} L${cx + 1.5 * s} ${cy - 3 * s} L${cx + 1.5 * s} ${cy - 5 * s} L${cx + 9 * s} ${cy - 9 * s} Z`, K, 0.8) +
    P(`M${cx - 5.5 * s} ${cy + 5.5 * s} H${cx + 5.5 * s} L${cx + 3.5 * s} ${cy + 10 * s} H${cx - 3.5 * s} Z`, '#7a1f17', 1.2) +
    P(`M${cx - 4 * s} ${cy + 5.5 * s} L${cx - 3 * s} ${cy + 8.5 * s} L${cx - 2 * s} ${cy + 5.5 * s} Z M${cx + 2 * s} ${cy + 5.5 * s} L${cx + 3 * s} ${cy + 8.5 * s} L${cx + 4 * s} ${cy + 5.5 * s} Z`, '#fff', 0.8);
  D.idra = () =>
    P('M78 84 Q96 84 98 70 Q92 78 80 76 Z', 'url(#c-gr)', 1.8) +
    line('M40 70 Q30 46 24 32', K, 12.4) + line('M40 70 Q30 46 24 32', '#5bbf4a', 8.6) +
    line('M60 70 Q70 46 76 32', K, 12.4) + line('M60 70 Q70 46 76 32', '#5bbf4a', 8.6) +
    line('M50 68 Q50 44 50 24', K, 12.4) + line('M50 68 Q50 44 50 24', '#5bbf4a', 8.6) +
    P('M20 82 Q20 66 36 66 H64 Q80 66 80 82 L78 93 H22 Z', 'url(#c-gr)', 2.2) + P('M34 72 H66 L64 91 H36 Z', 'url(#c-bel)', 1.6) +
    line('M36 78 H64 M36 84 H64', '#b09a40', 1.4) +
    dragonHead(24, 28, 0.9) + dragonHead(76, 28, 0.9) + dragonHead(50, 18, 1);

  // ---------- Ercole: pelle di leone, clava, barba ----------
  D.ercole = () =>
    P('M30 30 L22 72 L34 68 L40 40 Z M70 30 L78 72 L66 68 L60 40 Z', 'url(#c-lion)', 1.8) +
    feet(42, 59, 93) + legs(42, 59, 80, 90.5, 'url(#c-sk)', 5) +
    P('M34 68 H66 L69 82 H31 Z', 'url(#c-tm)') +
    P('M28 50 L36 45 H64 L72 50 L67 68 L50 71 L33 68 Z', 'url(#c-sk)') + line('M39 53 L50 57 L61 53 M50 57 V67 M44 62 H56', '#d98b58', 1.6) +
    P('M40 47 L50 55 L60 47 L56 45 L50 50 L44 45 Z', 'url(#c-lion)', 1.6) +
    P('M33 66 L50 69 L67 66 V71 L50 74 L33 71 Z', 'url(#c-lt)', 1.4) +
    P('M68 72 L86 14 Q95 6 99 18 L78 76 Z', 'url(#c-wd)', 2.2) + line('M84 30 l5 2 M80 46 l5 2', '#6c3814', 1.8) +
    limb('M66 52 L74 60', '#f2b583', 8) + fist(76.5, 61, 6) +
    limb('M34 52 L25 61', '#f2b583', 8) + fist(22, 63.5, 6) +
    headShape(50, 32, 19, 21) +
    P('M32 36 L34 48 L42 54 H58 L66 48 L68 36 L60 42 H40 Z', 'url(#c-hr)', 2) +
    P('M25 33 Q23 3 50 1 Q77 3 75 33 L68 22 Q50 14 32 22 Z', 'url(#c-lion)', 2.2) +
    C(30, 7, 4.4, 'url(#c-lion)', 1.6) + C(70, 7, 4.4, 'url(#c-lion)', 1.6) +
    E(42, 11, 2, 1.6, K, 0) + E(58, 11, 2, 1.6, K, 0) + P('M47 14 H53 L50 18 Z', K, 1) +
    eyes(50, 34.5, 7, { rx: 3.6, ry: 4.4, iris: '#5a3a20' }) + brows(50, 28.6, 7, true) + mouth(50, 44, 'grin', 4);

  // ---------- incantesimi ----------
  // Lancia di Atena: la civetta con l'elmo e la lancia
  D.lancia = () =>
    line('M82 6 V94', K, 5.6) + line('M82 6 V94', '#b0743c', 3.2) + P('M82 -6 L87 4 L82 10 L77 4 Z', 'url(#c-st)', 1.6) +
    P('M30 40 Q30 28 40 26 H60 Q70 28 70 40 L72 76 Q50 90 28 76 Z', 'url(#c-fur)', 2.2) +
    P('M38 50 H62 L64 76 Q50 84 36 76 Z', 'url(#c-hn)', 1.6) + line('M42 58 l3 3 l3 -3 M52 58 l3 3 l3 -3 M44 67 l3 3 l3 -3 M52 67 l3 3 l3 -3', '#8c5429', 1.4) +
    P('M30 44 L22 70 L32 74 Z', 'url(#c-fur)', 1.8) + P('M70 44 L80 60 L74 66 Z', 'url(#c-fur)', 1.8) +
    line('M42 84 L40 92 M46 84 L46 92 M54 84 L54 92 M58 84 L60 92', K, 4.4) + line('M42 84 L40 92 M46 84 L46 92 M54 84 L54 92 M58 84 L60 92', '#ffcf33', 2.4) +
    C(41, 40, 9, 'url(#c-go)', 1.8) + C(41, 40, 6.6, '#fff', 1.2) + C(42, 41, 3.6, K, 0) + C(40.6, 39, 1.3, '#fff', 0) +
    C(59, 40, 9, 'url(#c-go)', 1.8) + C(59, 40, 6.6, '#fff', 1.2) + C(60, 41, 3.6, K, 0) + C(58.6, 39, 1.3, '#fff', 0) +
    P('M47 47 L53 47 L50 54 Z', '#ffcf33', 1.4) +
    P('M28 34 Q28 12 50 10 Q72 12 72 34 L66 27 H34 Z', 'url(#c-br)', 2.2) + brows(50, 29.6, 9, true) +
    P('M34 14 Q36 -2 50 -1 Q64 -2 66 14 Q60 6 50 6 Q40 6 34 14 Z', 'url(#c-tm)', 1.8);
  // Fuoco greco: vaso con le fiamme
  D.fuoco = () =>
    P('M50 -2 Q66 14 64 30 Q70 22 72 30 Q78 44 66 54 H34 Q22 44 28 30 Q30 22 36 28 Q34 14 50 -2 Z', 'url(#c-fi)', 2.2) +
    `<path d="M50 20 Q60 32 58 42 Q56 50 50 52 Q44 50 42 42 Q40 32 50 20 Z" fill="#fff6b0"/>` +
    P('M26 52 H74 V58 H26 Z', 'url(#c-tc)', 2) + P('M30 58 H70 L66 84 Q50 92 34 84 Z', 'url(#c-tc)', 2.2) +
    P('M31.5 64 H68.5 L67.6 70 H32.4 Z', 'url(#c-tm)', 1.4) + shine('M35 62 Q34 70 36 78', 2.2, 0.5);
  // Fulmine di Zeus: nuvola arrabbiata con il fulmine
  D.fulmine = () =>
    P('M54 40 L36 70 H48 L40 96 L70 58 H55 L65 40 Z', 'url(#c-go)', 2.2) + shine('M52 46 L42 64', 2, 0.7) +
    `<g fill="url(#c-cl)" ${st(2)}><circle cx="30" cy="30" r="12"/><circle cx="50" cy="22" r="16"/><circle cx="70" cy="30" r="12"/></g>` +
    P('M18 32 H82 Q86 44 76 44 H24 Q14 44 18 32 Z', 'url(#c-cl)', 2) + `<path d="M20 34 H80 V38 H20 Z" fill="#f2f6fb"/>` +
    eyes(50, 30, 7.5, { rx: 3.2, ry: 3.8 }) + brows(50, 24.6, 7.5, true) +
    line('M20 56 L26 52 M82 50 L76 54 M24 74 L30 72 M78 72 L72 70', '#ffcf33', 2.4);

  const VIEW = '-5 -8 110 108';
  function svgText(key, T) {
    const f = D[key];
    if (!f) return null;
    // un disegno può essere [parte sotto senza contorno (ombra), disegno]
    const out = f(T), under = Array.isArray(out) ? out[0] : '', body = Array.isArray(out) ? out[1] : out;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW}">${defs(T)}${under}<g filter="url(#c-ol)">${body}</g></svg>`;
  }
  const url = (key, T) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText(key, T));
  root.SpritesChibi = { svgText, url, has: (k) => !!D[k], keys: () => Object.keys(D) };
})(typeof self !== 'undefined' ? self : this);
