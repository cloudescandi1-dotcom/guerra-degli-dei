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

  // Sfumature "a cartone": zona di luce, colore pieno e una fascia d'ombra netta in basso a destra
  const toon = (id, l, b, d) => `<radialGradient id="${id}" cx=".34" cy=".28" r=".95">` +
    `<stop offset=".08" stop-color="${l}"/><stop offset=".34" stop-color="${b}"/>` +
    `<stop offset=".7" stop-color="${b}"/><stop offset=".72" stop-color="${d}"/></radialGradient>`;
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
  const feet = (x1, x2, y, f, rx) => E(x1, y, rx || 7, 3.8, f || 'url(#c-lt)', 1.8) + E(x2, y, rx || 7, 3.8, f || 'url(#c-lt)', 1.8);
  const legs = (x1, x2, y1, y2, f, w) => { w = w || 5; return P(`M${x1 - w} ${y1} H${x1 + w} V${y2} H${x1 - w} Z`, f || 'url(#c-sk)', 1.8) + P(`M${x2 - w} ${y1} H${x2 + w} V${y2} H${x2 - w} Z`, f || 'url(#c-sk)', 1.8); };

  const D = {};

  // ---------- Oplita: elmo corinzio con cresta, scudo rotondo, lancia ----------
  D.oplita = (T) =>
    // lancia dietro la mano
    line('M80 10 V96', K, 6) + line('M80 10 V96', '#b0743c', 3.2) +
    P('M80 -4.5 Q87 4 84 11 L80 15 L76 11 Q73 4 80 -4.5 Z', 'url(#c-st)', 1.8) + shine('M79 0 V9', 1.2, 0.9) +
    P('M77 13 H83 V17 H77 Z', 'url(#c-br)', 1.4) +
    feet(42, 59, 93) + legs(42, 59, 80, 92) +
    P('M36.5 82 Q42 80 47.5 82 V90 Q42 92 36.5 90 Z', 'url(#c-br)', 1.6) + P('M53.5 82 Q59 80 64.5 82 V90 Q59 92 53.5 90 Z', 'url(#c-br)', 1.6) +
    // gonnellino a strisce
    P('M33 68 H67 L70 83 Q50 87 30 83 Z', 'url(#c-tm)') + line('M39 72 V84 M45 72 V85.5 M50.5 72 V86 M56 72 V85.5 M62 72 V84', T.x, 1.4, 0.8) +
    // corazza di bronzo
    P('M33 56 Q33 48 41 47.5 H59 Q67 48 67 56 L66 71 Q50 76 34 71 Z', 'url(#c-br)') +
    line('M42 55 Q46 58.5 50 56.5 Q54 58.5 58 55 M50 59 V68', '#a3610f', 1.6) + shine('M37.5 53 Q39 50.5 42.5 50.5', 2) +
    P('M33 68.5 Q50 73.5 67 68.5 L67 72.5 Q50 77.5 33 72.5 Z', 'url(#c-tm)', 1.6) +
    // braccio con la lancia
    C(65, 52.5, 6.2, 'url(#c-br)', 1.8) + limb('M67 56 Q73 60 78 61', '#f2b583', 6.4) + C(80, 61.5, 5.8, 'url(#c-sk)', 1.8) + line('M77.5 59 H83 M77.5 62.5 H83', K, 1, 0.6) +
    // testa
    C(50, 31, 23, 'url(#c-sk)', 2.2) +
    P('M27 33 Q26 6 50 5 Q74 6 73 33 L73 45 Q69 51 63 48 L63 35 Q63 29 57 29 L43 29 Q37 29 37 35 L37 48 Q31 51 27 45 Z', 'url(#c-br)', 2.2) +
    P('M48.3 28.5 V38 Q50 40.5 51.7 38 V28.5 Z', 'url(#c-br)', 1.4) +
    line('M30 24 Q50 15 70 24', '#a3610f', 1.6) + shine('M31.5 22 Q35 12 45 9', 3) +
    P('M44 6.5 L45 1 H55 L56 6.5 Z', 'url(#c-br)', 1.6) +
    // cresta
    P('M23 15 Q21 -8 50 -5.5 Q79 -8 77 15 Q72 2 50 1.5 Q28 2 23 15 Z', 'url(#c-tm)', 2.2) +
    line('M29 8 Q36 -1.5 50 -2 M58 -1.5 Q68 -1 72 6', '#fff', 1.4, 0.55) +
    eyes(50, 38, 7.2, { rx: 4.2, ry: 5 }) + brows(50, 32, 7.2, true) + mouth(50, 46.5, 'shout', 4.6) +
    // scudo davanti
    shield(28, 68, 19.5);

  // ---------- Arciere: ricci, fascia in testa, arco teso ----------
  D.arcieri = (T) =>
    `<g transform="rotate(-22 33 56)">` + P('M27 40 H39 V70 Q33 73 27 70 Z', 'url(#c-wd)', 1.8) +
    line('M27 47 H39 M27 63 H39', '#ffcf33', 2.2) +
    line('M30 40 L29 30 M33 40 V29 M36 40 L37 30', '#b0743c', 2.2) +
    P('M26 31 l3 -5 l2 6 Z M31 30 l2 -6 l2 6 Z M35 31 l2 -5 l3 5 Z', 'url(#c-tm)', 1.2) + `</g>` +
    feet(42, 59, 93) + legs(42, 59, 80, 92) + line('M37 86 H47 M54 86 H64 M37 89.5 H47 M54 89.5 H64', '#6c3814', 1.6) +
    // tunica
    P('M34 53 Q34 48 41 47.5 H59 Q66 48 66 53 L69.5 82 Q50 87 30.5 82 Z', 'url(#c-tm)') +
    P('M31.2 77.5 Q50 82.5 68.8 77.5 L69.5 82 Q50 87 30.5 82 Z', 'url(#c-wh)', 1.4) +
    P('M33.5 64 Q50 67.5 66.5 64 V68.5 Q50 72 33.5 68.5 Z', 'url(#c-lt)', 1.4) + C(50, 68, 2.4, 'url(#c-go)', 1.2) +
    line('M38 49 L63 65', K, 5.4) + line('M38 49 L63 65', '#8a5228', 3) +
    // arco e freccia
    line('M75 23 Q91 34 86.5 56 Q91 78 75 89', K, 7.4) + line('M75 23 Q91 34 86.5 56 Q91 78 75 89', '#b0743c', 4.2) +
    line('M75 23 L63 56 L75 89', '#fff', 1.2) +
    line('M60 56 H95', K, 3.6) + line('M60 56 H95', '#c98e5c', 2) + P('M94 52.4 L101.5 56 L94 59.6 Z', 'url(#c-st)', 1.4) +
    P('M57.5 53 l6 3 l-6 3 Z', 'url(#c-tm)', 1.2) +
    limb('M39 52 Q50 58 61 56.5', '#f2b583', 6.2) + C(63, 56.5, 5.4, 'url(#c-sk)', 1.8) +
    limb('M61 52 Q74 54 84 56', '#f2b583', 6.2) + C(86.5, 56, 5.8, 'url(#c-sk)', 1.8) +
    // testa
    C(50, 32, 22.5, 'url(#c-sk)', 2.2) +
    P('M27.5 33 Q25 8 50 7.5 Q75 8 72.5 33 Q66 21 50 21 Q34 21 27.5 33 Z', 'url(#c-hr)', 2.2) +
    `<g fill="url(#c-hr)" ${st(1.8)}><circle cx="30" cy="21" r="6"/><circle cx="38" cy="13" r="6.6"/><circle cx="49" cy="9.5" r="7"/><circle cx="60" cy="12" r="6.6"/><circle cx="68.5" cy="19.5" r="6"/></g>` +
    shine('M34 12 Q38 9 42 9.5', 1.8, 0.4) +
    line('M28 26 Q50 16 72 26', K, 6.4) + line('M28 26 Q50 16 72 26', T.c, 3.8) +
    P('M28.5 26 Q19 27 15 36 L20.5 35.5 Q23 30 30 29.5 Z', 'url(#c-tm)', 1.6) +
    eyes(50, 37, 7.2, { rx: 4.2, ry: 5, iris: '#5a8f3c' }) + brows(50, 30.6, 7.2, true, '#3a2010') +
    cheeks(50, 45, 12) + mouth(50, 46.5, 'smirk', 4.4);

  // ---------- Ciclope: un occhio solo, barba, clava chiodata ----------
  D.ciclope = (T) =>
    // clava
    P('M77 14 Q101 10 97 44 L89 85 L80 83 L84 46 Q84 28 75 24 Z', 'url(#c-wd)', 2.2) +
    `<g fill="url(#c-st)" ${st(1.2)}><path d="M93 19 l7 -3 l-4 6 Z"/><path d="M96 34 l7 1 l-6 4 Z"/><path d="M80 15 l-2 -7 l6 4 Z"/><path d="M89 48 l7 2 l-6 3 Z"/></g>` +
    shine('M81 20 Q88 18 91 24', 2, 0.5) +
    feet(38, 62, 92.5, 'url(#c-lt)', 9.5) + legs(38, 62, 78, 91, 'url(#c-gs)', 7) +
    // gonnellino di pelliccia
    P('M21 63 H79 L83 84 L73 80 L65 86.5 L57 80.5 L50 87.5 L43 80.5 L35 86.5 L27 80 L17 84 Z', 'url(#c-fur)', 2.2) +
    // pancione
    P('M17 51 Q15 40 30 38.5 H70 Q85 40 83 51 L81 67 Q50 76 19 67 Z', 'url(#c-gs)', 2.2) +
    line('M37 61 Q50 69 63 61', '#b4824e', 1.8) + `<ellipse cx="50" cy="64" rx="1.6" ry="1.2" fill="#8a5a30"/>` +
    line('M30 45 Q40 50 48 47 M52 47 Q60 50 70 45', '#b4824e', 1.8) +
    P('M19 63.5 Q50 72 81 63.5 V69 Q50 77.5 19 69 Z', 'url(#c-tm)', 1.8) +
    // braccia
    limb('M21 44 Q12 54 14 66', '#e8bb88', 12) + C(14, 70, 8.4, 'url(#c-gs)', 2) +
    limb('M79 44 Q87 52 85 62', '#e8bb88', 12) + C(85, 63.5, 8.4, 'url(#c-gs)', 2) + line('M80 60 H90 M80.5 65 H90', K, 1.2, 0.5) +
    // testa
    C(24.5, 30, 5.4, 'url(#c-gs)', 1.8) + C(75.5, 30, 5.4, 'url(#c-gs)', 1.8) +
    C(50, 28, 25, 'url(#c-gs)', 2.4) +
    P('M30 37 Q31 57 50 59 Q69 57 70 37 Q63 46 50 46 Q37 46 30 37 Z', 'url(#c-hr)', 2.2) +
    P('M39 5.5 Q44 -3 50 4.5 Q56 -3 61 5.5 Q56 9.5 50 8.5 Q44 9.5 39 5.5 Z', 'url(#c-hr)', 1.8) +
    shine('M31 18 Q35 9 43 6', 2.6, 0.55) +
    // occhio unico
    E(50, 25, 11.5, 10.5, '#fff', 2) + C(52, 26, 7, T.c, 0) + C(52.4, 26.4, 3.6, K, 0) +
    C(48.3, 22, 2.5, '#fff', 0) + C(55.5, 29.4, 1.1, '#fff', 0) +
    P('M35 11.5 L50 19 L65 11.5 L65.5 16.5 L50 24 L34.5 16.5 Z', K, 1) +
    E(50, 36.5, 3.6, 2.6, 'url(#c-gs)', 1.6) +
    P('M42 40.5 Q50 37.5 58 40.5 Q57 49 50 49 Q43 49 42 40.5 Z', '#7a1f17', 1.8) +
    P('M43.6 41.3 L45.2 36.8 L46.8 41 Z M53.2 41 L54.8 36.8 L56.4 41.3 Z', '#fff', 1.1);

  // ---------- Minotauro: testa di toro, corna, ascia bipenne ----------
  D.minotauro = (T) =>
    // ascia
    line('M87 26 V96', K, 7.4) + line('M87 26 V96', '#b0743c', 4.4) +
    P('M87 30 Q104 21 105 48 Q97 42 87 44 Z', 'url(#c-st)', 2) + P('M87 30 Q70 21 69 48 Q77 42 87 44 Z', 'url(#c-st)', 2) +
    shine('M92 29 Q100 29 101.5 39 M82 29 Q74 29 72.5 39', 1.6, 0.9) +
    P('M84 33 H90 V46 H84 Z', 'url(#c-go)', 1.4) +
    // zoccoli e gambe
    P('M31 89 H46 L45 95.5 H32 Z M54 89 H69 L68 95.5 H55 Z', '#2e2622', 1.8) + line('M38.5 89.5 V95 M61.5 89.5 V95', '#6b625c', 1.2) +
    P('M32 76 Q31 84 33 90 H45 Q46 83 45 76 Z M55 76 Q54 83 55 90 H67 Q69 84 68 76 Z', 'url(#c-fur)', 1.8) +
    // gonnellino e cintura d'oro
    P('M28 64 H72 L75 81 Q50 86 25 81 Z', 'url(#c-tm)', 2.2) + line('M27 76.5 Q50 81 73 76.5', '#fff8e6', 2.6) +
    P('M27 61 Q50 65.5 73 61 V66.5 Q50 71 27 66.5 Z', 'url(#c-go)', 1.6) + C(50, 66, 4.2, 'url(#c-go)', 1.4) + C(50, 66, 1.8, '#c0392b', 0.8) +
    // torace muscoloso
    P('M23 48 Q23 39 34 38.5 H66 Q77 39 77 48 L75 63 Q50 69 25 63 Z', 'url(#c-fur)', 2.2) +
    line('M33 47 Q42 53 50 49 Q58 53 67 47 M50 52 V61', '#4a2810', 1.8) + shine('M28 45 Q31 41 36 41', 2.2, 0.45) +
    // braccia
    limb('M26 43 Q14 51 16 63', '#8c5429', 11) + P('M10.5 58 H21.5 V64.5 H10.5 Z', 'url(#c-go)', 1.4) + C(16, 68, 7.4, 'url(#c-fur)', 1.8) +
    limb('M74 43 Q84 47 86 55', '#8c5429', 11) + P('M80.5 51 H91.5 V57.5 H80.5 Z', 'url(#c-go)', 1.4) + C(87, 61, 7.4, 'url(#c-fur)', 1.8) +
    // corna e orecchie
    P('M30 19 Q11 18 5 -2 Q16 9 31 10.5 Z', 'url(#c-hn)', 2) + P('M70 19 Q89 18 95 -2 Q84 9 69 10.5 Z', 'url(#c-hn)', 2) +
    P('M5 -2 Q9 4 13 7 L15 4.5 Q10 2 5 -2 Z M95 -2 Q91 4 87 7 L85 4.5 Q90 2 95 -2 Z', '#3a2a1a', 1) +
    P('M28 27 Q16 26 15 34 Q23 35.5 29.5 31 Z M72 27 Q84 26 85 34 Q77 35.5 70.5 31 Z', 'url(#c-fur)', 1.8) +
    // testa
    E(50, 28, 23.5, 21.5, 'url(#c-fur)', 2.4) +
    P('M41 9 Q47 4 54 6 Q48 11 46 18 Q43 12 41 9 Z', '#4a2810', 1.2) +
    eyes(50, 25, 9, { rx: 4.4, ry: 4.8, iris: '#d62d20' }) + brows(50, 18.8, 9, true) +
    E(50, 40, 14.5, 9.5, 'url(#c-mz)', 2) + E(44, 40, 2.4, 3.2, '#3a1a0c', 0.8) + E(56, 40, 2.4, 3.2, '#3a1a0c', 0.8) +
    shine('M40 34.5 Q45 32 50 32.5', 1.8, 0.6) +
    line('M50 46 m-4.6 0 a4.6 4.6 0 1 0 9.2 0 a4.6 4.6 0 1 0 -9.2 0', K, 4.6) + line('M50 46 m-4.6 0 a4.6 4.6 0 1 0 9.2 0 a4.6 4.6 0 1 0 -9.2 0', '#ffcf33', 2.4);

  const VIEW = '-5 -8 110 108';
  function svgText(key, T) {
    const f = D[key];
    if (!f) return null;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW}">${defs(T)}<g filter="url(#c-ol)">${f(T)}</g></svg>`;
  }
  const url = (key, T) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText(key, T));
  root.SpritesChibi = { svgText, url, keys: () => Object.keys(D) };
})(typeof self !== 'undefined' ? self : this);
