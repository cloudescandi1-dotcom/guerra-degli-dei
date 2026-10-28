// PROVA: nuovi disegni 2D in stile "cartone" (testa grande, contorno spesso, ombre nette).
// Stesso riquadro dei disegni attuali: (-5,-8)-(105,100), piedi in basso (y ≈ 95).
// Se piacciono, prenderanno il posto di quelli in sprites.js.
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

  // Sfumature "a cartone": luce in alto a sinistra, colore pieno e una fascia d'ombra netta
  // in basso a destra, tagliata dritta (fa sembrare le forme sfaccettate, non tonde)
  const toon = (id, l, b, d) => `<linearGradient id="${id}" x1=".1" y1="0" x2=".9" y2="1">` +
    `<stop offset=".08" stop-color="${l}"/><stop offset=".3" stop-color="${b}"/>` +
    `<stop offset=".64" stop-color="${b}"/><stop offset=".66" stop-color="${d}"/></linearGradient>`;
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
  <filter id="c-ol" x="-12%" y="-12%" width="124%" height="124%">
    <feMorphology in="SourceAlpha" operator="dilate" radius="1.6" result="d"/>
    <feFlood flood-color="${K}"/><feComposite in2="d" operator="in" result="o"/>
    <feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
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

  const VIEW = '-5 -8 110 108';
  function svgText(key, T) {
    const f = D[key];
    if (!f) return null;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW}">${defs(T)}<g filter="url(#c-ol)">${f(T)}</g></svg>`;
  }
  const url = (key, T) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText(key, T));
  root.SpritesChibi = { svgText, url, keys: () => Object.keys(D) };
})(typeof self !== 'undefined' ? self : this);
