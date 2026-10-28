// Disegni dei "plastici" delle arene per il Cammino degli Eroi: lo stadio visto dall'alto
// di sbieco, con il pubblico, il campo, i templi e un monumento dietro diverso per ogni arena.
// Stesso stile dei personaggi: contorno spesso, colori pieni e ombre nette.
(function (root) {
  'use strict';
  const K = '#1f120a';
  const st = (w) => `stroke="${K}" stroke-width="${w ?? 2}" stroke-linejoin="round" stroke-linecap="round"`;
  const P = (d, f, w) => `<path d="${d}" fill="${f}" ${st(w)}/>`;
  const R = (x, y, w, h, f, r, sw) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r || 0}" fill="${f}" ${st(sw)}/>`;
  const C = (x, y, r, f, w) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${st(w)}/>`;
  const toon = (id, l, b, d) => `<linearGradient id="${id}" x1=".1" y1="0" x2=".9" y2="1">` +
    `<stop offset=".08" stop-color="${l}"/><stop offset=".3" stop-color="${b}"/>` +
    `<stop offset=".64" stop-color="${b}"/><stop offset=".66" stop-color="${d}"/></linearGradient>`;

  // colori di ogni arena: gradinate e basamento
  const THEMES = [
    { stand: ['#f6e4ba', '#dcbc7e', '#a3824a'], base: ['#fff3b8', '#e8ae3e', '#a86c18'] },   // Sparta
    { stand: ['#f0d2a8', '#cfa06a', '#8e6438'], base: ['#ffc59a', '#d9693a', '#8e3a16'] },   // Creta
    { stand: ['#ead09a', '#bf9650', '#7e5c26'], base: ['#e6a86c', '#a9652f', '#6c3814'] },   // Troia
    { stand: ['#e4f0f2', '#b2c9d0', '#6f8a94'], base: ['#a9e4ff', '#3f9fdc', '#1d5f94'] },   // Ciclopi
    { stand: ['#f6dfb8', '#dab47e', '#9c7646'], base: ['#fffaf0', '#e6dcc8', '#a99a7c'] },   // Colosseo
    { stand: ['#9a7f9f', '#66506e', '#352838'], base: ['#ff9a6a', '#c8382a', '#6e1410'] },   // Inferi
    { stand: ['#ffffff', '#e3e9f2', '#a8b6cc'], base: ['#fff9c8', '#ffcf33', '#c98a0e'] },   // Olimpo
  ];
  const CROWD = ['#3f7fe0', '#e0453a', '#ffcf33', '#5bd23a', '#ffffff', '#f2a0c8', '#8f5ae0', '#ff8a3a'];

  const defs = (th) => `<defs>
  ${toon('a-st', th.stand[0], th.stand[1], th.stand[2])}
  ${toon('a-bs', th.base[0], th.base[1], th.base[2])}
  ${toon('a-mb', '#ffffff', '#efe8d8', '#b7a98c')}
  ${toon('a-go', '#fff9c8', '#ffcf33', '#c98a0e')}
  ${toon('a-rk', '#c9c3bd', '#948c86', '#5e5752')}
  ${toon('a-wd', '#e6a86c', '#a9652f', '#6c3814')}
  ${toon('a-cl', '#ffffff', '#f2f6fb', '#c4cfe0')}
  ${toon('a-bl', '#a6c8ff', '#3f7fe0', '#22509f')}
  ${toon('a-rd', '#ffb3a8', '#e0453a', '#9e231b')}
  ${toon('a-fi', '#fff6b0', '#ffb02e', '#e0532a')}
  ${toon('a-hn', '#ffffff', '#f3e8d0', '#b9a57e')}
</defs>`;

  // ---------- monumenti dietro lo stadio ----------
  function temple(x, w, top, bot, roof) {
    let cols = '';
    const n = 6, cw = w / (n * 2 - 1);
    for (let i = 0; i < n; i++) cols += R((x - w / 2 + i * cw * 2).toFixed(1), top + 17, cw.toFixed(1), bot - top - 22, 'url(#a-mb)', 0, 1.4);
    return P(`M${x - w / 2 - 6} ${top + 13} L${x} ${top} L${x + w / 2 + 6} ${top + 13} Z`, roof || 'url(#a-mb)', 2) +
      R(x - w / 2 - 4, top + 13, w + 8, 4.5, 'url(#a-mb)', 0, 1.6) + cols + R(x - w / 2 - 6, bot - 5, w + 12, 5, 'url(#a-mb)', 0, 1.6);
  }
  const cloud = (x, y, s) => `<g fill="url(#a-cl)" ${st(1.8)}><circle cx="${x - 9 * s}" cy="${y}" r="${7 * s}"/><circle cx="${x + 9 * s}" cy="${y}" r="${7 * s}"/><circle cx="${x}" cy="${y - 4 * s}" r="${9 * s}"/></g>` +
    `<path d="M${x - 15 * s} ${y + 2 * s} H${x + 15 * s}" stroke="#f2f6fb" stroke-width="${6 * s}" stroke-linecap="round"/>`;
  const flame = (x, y, s) => P(`M${x} ${y - 22 * s} Q${x + 10 * s} ${y - 10 * s} ${x + 7 * s} ${y} H${x - 7 * s} Q${x - 10 * s} ${y - 10 * s} ${x} ${y - 22 * s} Z`, 'url(#a-fi)', 1.8) +
    `<path d="M${x} ${y - 11 * s} Q${x + 4 * s} ${y - 5 * s} ${x + 2.5 * s} ${y} H${x - 2.5 * s} Q${x - 4 * s} ${y - 5 * s} ${x} ${y - 11 * s} Z" fill="#fff6b0"/>`;
  const bolt = (x, y, s) => P(`M${x + 4 * s} ${y} L${x - 6 * s} ${y + 16 * s} H${x} L${x - 4 * s} ${y + 30 * s} L${x + 9 * s} ${y + 11 * s} H${x + 2 * s} L${x + 7 * s} ${y} Z`, 'url(#a-go)', 1.6);

  const LANDMARK = [
    // Sparta: tempio e due scudi
    () => temple(100, 74, 2, 46) +
      C(34, 30, 13, 'url(#a-go)', 2) + C(34, 30, 9, 'url(#a-bl)', 1.4) + `<path d="M29 35 L34 25 L39 35" fill="none" stroke="#fff8e6" stroke-width="2.4" stroke-linecap="round"/>` +
      C(166, 30, 13, 'url(#a-go)', 2) + C(166, 30, 9, 'url(#a-rd)', 1.4) + `<path d="M161 35 L166 25 L171 35" fill="none" stroke="#fff8e6" stroke-width="2.4" stroke-linecap="round"/>`,
    // Creta: muro del labirinto e grandi corna di toro
    () => P('M56 44 Q40 30 30 4 Q46 18 62 26 Z', 'url(#a-hn)', 2) + P('M144 44 Q160 30 170 4 Q154 18 138 26 Z', 'url(#a-hn)', 2) +
      R(56, 16, 88, 30, 'url(#a-st)', 3, 2) +
      `<path d="M64 22 H136 V40 H70 V28 H128 V34 H78" fill="none" stroke="#8e6438" stroke-width="2.6" stroke-linejoin="round"/>`,
    // Troia: mura con torri e la testa del cavallo di legno
    () => R(26, 22, 148, 24, 'url(#a-st)', 0, 2) +
      [26, 44, 62, 80, 112, 130, 148, 166].map((x) => R(x, 17, 8, 6, 'url(#a-st)', 0, 1.4)).join('') +
      R(30, 8, 22, 38, 'url(#a-st)', 0, 2) + R(148, 8, 22, 38, 'url(#a-st)', 0, 2) +
      P('M88 46 L91 20 Q94 4 110 6 L124 13 L122 21 L108 19 L106 46 Z', 'url(#a-wd)', 2) +
      `<path d="M93 18 L90 10 L97 12" fill="url(#a-wd)" ${st(1.6)}/>` + C(108, 12, 1.8, K, 0),
    // Isola dei Ciclopi: montagna di roccia con un grande occhio e le onde
    () => P('M24 46 L54 12 L74 22 L100 0 L126 22 L146 10 L176 46 Z', 'url(#a-rk)', 2) +
      `<ellipse cx="100" cy="27" rx="13" ry="10" fill="#fff" ${st(2)}/>` + C(102, 28, 6.2, '#3d7fd6', 0) + C(102.4, 28.4, 3, K, 0) + C(98.6, 24.6, 2, '#fff', 0) +
      `<path d="M86 17 L100 22 L114 17" fill="none" stroke="${K}" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M10 44 q7 -7 14 0 q7 -7 14 0 M162 44 q7 -7 14 0 q7 -7 14 0" fill="none" stroke="#3f9fdc" stroke-width="4" stroke-linecap="round"/>`,
    // Colosseo: muro curvo con due file di archi
    () => P('M20 46 L24 10 Q100 -2 176 10 L180 46 Z', 'url(#a-st)', 2) +
      `<path d="M23 22 Q100 11 177 22" fill="none" stroke="#9c7646" stroke-width="1.6"/>` +
      [34, 52, 70, 88, 106, 124, 142, 160].map((x) => R(x, 12 + Math.abs(x - 97) * 0.03, 9, 8, '#5e3f22', 4, 1.2) + R(x, 27, 9, 12, '#5e3f22', 4, 1.2)).join(''),
    // Inferi di Ade: rocce scure, cancello e fiamme
    () => P('M20 46 L34 16 L54 28 L72 8 L90 24 L110 6 L130 24 L148 10 L166 28 L180 46 Z', '#3e3540', 2) +
      R(86, 18, 28, 28, '#231c25', 2, 2) + `<path d="M93 20 V46 M100 20 V46 M107 20 V46" stroke="#a8a0aa" stroke-width="2"/>` +
      flame(40, 44, 1) + flame(64, 40, 0.8) + flame(136, 40, 0.8) + flame(160, 44, 1),
    // Monte Olimpo: nuvole, tempio d'oro e fulmine
    () => cloud(36, 34, 1.1) + cloud(164, 34, 1.1) + temple(100, 64, 2, 44, 'url(#a-go)') + bolt(150, 2, 0.8) + bolt(44, 4, 0.7),
  ];

  // ---------- stadio ----------
  function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  // tempietto visto dall'alto (torre di gioco)
  function tower(x, y, s, team) {
    const roof = team ? 'url(#a-rd)' : 'url(#a-bl)';
    return R(x - 6 * s, y - 2 * s, 12 * s, 6 * s, 'url(#a-mb)', 1, 1.2) + P(`M${x - 7 * s} ${y - 2 * s} L${x} ${y - 8 * s} L${x + 7 * s} ${y - 2 * s} Z`, roof, 1.2);
  }
  function stadium(i, ground, river) {
    const g = rnd(97 + i * 13);
    // pubblico: puntini colorati sulle gradinate (fuori dal campo)
    let crowd = '';
    for (let n = 0; n < 260; n++) {
      const y = 46 + g() * 72, t = (y - 42) / 80;
      const left = 30 - 12 * t, right = 170 + 12 * t;
      const x = left + 3 + g() * (right - left - 6);
      const fl = 56 - 8 * ((y - 56) / 52), fr = 144 + 8 * ((y - 56) / 52);
      if (y > 52 && y < 112 && x > fl - 3 && x < fr + 3) continue;
      crowd += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.9" fill="${CROWD[(g() * CROWD.length) | 0]}" stroke="${K}" stroke-width=".7"/>`;
    }
    return P('M30 50 Q30 42 40 42 H160 Q170 42 170 50 L182 112 Q182 122 170 122 H30 Q18 122 18 112 Z', 'url(#a-st)', 2.4) +
      `<path d="M27 64 H173 M24 84 H176 M21 102 H179" stroke="#0002" stroke-width="1.4"/>` + crowd +
      // campo
      P('M56 54 H144 L152 110 H48 Z', ground, 2) +
      `<path d="M66 58 L63 106 M134 58 L137 106" stroke="#e4d2a0" stroke-width="5" opacity=".75"/>` +
      P('M52.2 79 H147.8 L148.8 86 H51.2 Z', river, 1.4) +
      R(59, 76.5, 9, 12, 'url(#a-mb)', 1, 1.2) + R(132, 76.5, 9, 12, 'url(#a-mb)', 1, 1.2) +
      tower(100, 61, 1.15, 1) + tower(70, 66, 0.9, 1) + tower(130, 66, 0.9, 1) +
      tower(68, 100, 1, 0) + tower(132, 100, 1, 0) + tower(100, 106, 1.3, 0) +
      // basamento davanti con la corona
      P('M18 112 Q18 122 30 122 H170 Q182 122 182 112 L182 124 Q182 134 170 134 H30 Q18 134 18 124 Z', 'url(#a-bs)', 2.4) +
      P('M88 136 L86 120 L93 126 L100 116 L107 126 L114 120 L112 136 Z', 'url(#a-go)', 2);
  }

  function svgText(i, arena) {
    const th = THEMES[Math.min(i, THEMES.length - 1)];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -4 200 144">${defs(th)}` +
      LANDMARK[Math.min(i, LANDMARK.length - 1)]() + stadium(i, arena.ground[0], arena.river) + `</svg>`;
  }

  // Cima del cammino: il monte Olimpo tra le nuvole (per le arene che arriveranno)
  function summitText() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -4 200 144">${defs(THEMES[6])}` +
      `<radialGradient id="a-glow"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></radialGradient>` +
      `<circle cx="100" cy="30" r="44" fill="url(#a-glow)"/>` +
      P('M8 132 L56 54 L74 70 L100 26 L126 70 L144 54 L192 132 Z', 'url(#a-rk)', 2.4) +
      P('M88 46 L100 26 L112 46 L106 42 L100 48 L94 42 Z M50 64 L56 54 L64 62 L58 61 Z M136 62 L144 54 L150 64 L143 61 Z', '#ffffff', 1.6) +
      temple(100, 34, -2, 30, 'url(#a-go)') +
      cloud(40, 96, 1.4) + cloud(160, 92, 1.4) + cloud(100, 118, 1.8) + cloud(60, 128, 1.2) + cloud(146, 128, 1.2) +
      bolt(30, 20, 0.9) + bolt(160, 14, 0.9) + `</svg>`;
  }
  const toUrl = (s) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  root.ArenaArt = { url: (i, arena) => toUrl(svgText(i, arena)), summitUrl: () => toUrl(summitText()) };
})(typeof self !== 'undefined' ? self : this);
