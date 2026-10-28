// Disegna il campo di battaglia su un <canvas>: terreno, fiume, templi, truppe ed effetti.
// I personaggi sono i disegni di sprites.js; il terreno è disegnato col codice.
(function (root) {
  'use strict';
  const D = root.GameData, E = root.Engine, SP = root.Sprites;
  const TEAM = ['#3f7fe0', '#e0453a'];
  const TEAM_DARK = ['#22509f', '#9e231b'];
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif';

  // opts.top / opts.bot: spazio extra sopra e sotto il campo (in caselle)
  function create(canvas, opts) {
    opts = opts || {};
    const ctx = canvas.getContext('2d');
    let S = 20, ox = 0, oy = 0, flip = false, arena = D.ARENAS[0], dpr = 1;
    const FOOT = (SP && SP.FOOT) || 0.94;
    let bg = null;                     // terreno già disegnato (non cambia durante la partita)
    const facing = new Map();          // verso dove guarda ogni truppa (destra/sinistra)

    // Prospettiva: la parte lontana del campo è più stretta (KT) e tutto è un po' schiacciato (C)
    const KT = 0.78, C = 0.86, AVG = (KT + 1) / 2;
    const FIELD_H = E.H * C * AVG;   // altezza del campo sullo schermo, in "caselle vicine"

    function resize() {
      dpr = Math.min(2, root.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      // Sopra il campo serve spazio per il tempio del Re nemico (TOP) e sotto per il bordo (BOT)
      const TOP = opts.top || 2.6, BOT = opts.bot || 0.6;
      S = Math.min(canvas.width / E.W, canvas.height / (FIELD_H + TOP + BOT));
      ox = (canvas.width - S * E.W) / 2;
      // Il campo sta in basso (vicino alle carte); lo spazio che avanza in alto diventa cielo
      oy = canvas.height - S * FIELD_H - S * BOT;
      bg = null;
    }

    // Colore: chi guarda si vede sempre blu, l'avversario rosso
    const side = (owner) => (flip ? 1 - owner : owner);

    // Da coordinate di gioco a pixel (con la prospettiva). k = quanto è "grande" quel punto.
    function proj(x, y) {
      const vx = flip ? E.W - x : x, vy = flip ? E.H - y : y;
      const v = vy / E.H, k = KT + (1 - KT) * v;
      const f = (KT * v + (1 - KT) * v * v / 2) / AVG;
      return { x: ox + (E.W / 2 + (vx - E.W / 2) * k) * S, y: oy + f * FIELD_H * S, k };
    }
    function toGame(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      const sx = (clientX - r.left) * dpr, sy = (clientY - r.top) * dpr;
      const f = (sy - oy) / (FIELD_H * S);
      const v = (-KT + Math.sqrt(Math.max(0, KT * KT + 2 * (1 - KT) * f * AVG))) / (1 - KT);
      const k = KT + (1 - KT) * v;
      const vx = E.W / 2 + ((sx - ox) / S - E.W / 2) / k, vy = v * E.H;
      return flip ? { x: E.W - vx, y: E.H - vy } : { x: vx, y: vy };
    }
    // Quadrilatero del campo tra (x0,y0) e (x1,y1), già in prospettiva
    function quad(g, x0, y0, x1, y1) {
      const a = proj(x0, y0), b = proj(x1, y0), c = proj(x1, y1), d = proj(x0, y1);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath();
    }

    // ---------------------------------------------------------------- anfiteatro
    // Materiale delle gradinate e colore del pavimento di ogni arena
    const STONE = ['#a87a4a', '#b9a98a', '#c9a46a', '#8a8274', '#d9bf8f', '#3a2a30', '#f2ece0'];
    const PATHS = ['rgba(222,196,140,0.78)', 'rgba(232,222,200,0.75)', 'rgba(150,110,60,0.45)', 'rgba(240,226,180,0.8)', 'rgba(190,160,110,0.45)', 'rgba(120,90,100,0.6)', 'rgba(242,200,90,0.35)'];
    // Il pubblico sono i personaggi del gioco, blu e rossi
    const CROWD = ['oplita', 'arcieri', 'frombolieri', 'arpie', 'scheletri', 'legionari', 'centauro', 'minotauro', 'gladiatore',
      'male', 'acheo', 'ciclope', 'sirene', 'satiro', 'medusa', 'pegaso', 'cerbero', 'idra', 'ercole'];
    let crowdMissing = false;   // true se qualche disegno non era ancora pronto: il terreno verrà ridisegnato
    const crowdReady = () => !SP || CROWD.every((k) => SP.image(k, 0) && SP.image(k, 1));
    function member(g, x, foot, size, rnd, mirror) {
      const key = CROWD[Math.floor(rnd() * CROWD.length)], team = rnd() < 0.5 ? 0 : 1;
      const img = SP && SP.image(key, team);
      if (!img) { crowdMissing = true; return; }
      g.save(); g.translate(x, foot); if (mirror) g.scale(-1, 1);
      g.drawImage(img, -size / 2, -size * FOOT, size, size);
      g.restore();
    }
    function stands(g, c, idx, rnd) {
      const tl = proj(0, 0), lw = Math.max(1, S * 0.04);
      const stone = STONE[idx];
      // --- gradinate in fondo (dietro il campo avversario): prima le file lontane, poi le vicine
      const rows = 30, uTop = S * KT;
      const list = [];
      let base = tl.y - S * 0.25;
      for (let r = 0; r < rows && base > -uTop * 0.2; r++) {
        const u = uTop * Math.max(0.6, 1 - r * 0.06), h = u * 0.72;
        list.push({ base, u, h, r });
        base -= h;
      }
      g.fillStyle = stone; g.fillRect(0, 0, c.width, tl.y);
      for (const row of list.reverse()) {
        const { base: b0, u, h, r } = row;
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, b0 - h, c.width, h * 0.5);
        // spettatori in piedi dietro il parapetto
        for (let x = u * 0.35 + (r % 2) * u * 0.3; x < c.width + u * 0.3; x += u * 0.62) {
          if (rnd() < 0.1) continue;
          member(g, x + (rnd() - 0.5) * u * 0.15, b0 - h * 0.12, u * 1.05, rnd, rnd() < 0.5);
        }
        // parapetto di pietra davanti alla fila
        g.fillStyle = stone; g.fillRect(0, b0 - h * 0.3, c.width, h * 0.3);
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, b0 - h * 0.3, c.width, h * 0.06);
        g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = lw; g.beginPath(); g.moveTo(0, b0 - h * 0.3); g.lineTo(c.width, b0 - h * 0.3); g.stroke();
      }
      // stendardi della squadra avversaria appesi al muro
      const wy = tl.y - S * 0.25;
      for (let x = c.width * 0.12; x < c.width; x += c.width * 0.19) {
        g.fillStyle = '#e0453a'; g.strokeStyle = '#2b1d14'; g.lineWidth = lw;
        g.beginPath(); g.moveTo(x - S * 0.25, wy - S * 0.55); g.lineTo(x + S * 0.25, wy - S * 0.55); g.lineTo(x + S * 0.25, wy + S * 0.05); g.lineTo(x, wy - S * 0.12); g.lineTo(x - S * 0.25, wy + S * 0.05); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#f2c24a'; g.beginPath(); g.arc(x, wy - S * 0.3, S * 0.08, 0, 7); g.fill();
      }
      // --- tribune ai lati, lungo tutto il campo (dal fondo verso chi guarda)
      for (const sideL of [true, false]) {
        for (let yy = -1.2; yy < E.H; yy += 0.7) {
          const e = proj(sideL ? 0 : E.W, Math.max(0, yy)), u = S * e.k;
          if (yy < 0) e.y += yy * S * KT * 0.8;
          const room = sideL ? e.x : c.width - e.x;
          if (room < u * 0.3) continue;
          const dir = sideL ? -1 : 1;
          // gradinate fino al bordo dello schermo (niente spazi vuoti negli angoli)
          const cols = Math.min(14, Math.ceil(room / (u * 0.55)) + 1);
          for (let k = cols - 1; k >= 0; k--) {
            const x = e.x + dir * u * (0.45 + k * 0.55);
            if (x < -u || x > c.width + u) continue;
            const foot = e.y - u * k * 0.2;
            g.fillStyle = stone; g.fillRect(x - u * 0.3, foot - u * 0.05, u * 0.6, u * 0.45);
            if (rnd() < 0.85) member(g, x, foot + u * 0.05, u * 0.95, rnd, !sideL);
            g.fillStyle = stone; g.fillRect(x - u * 0.3, foot - u * 0.02, u * 0.6, u * 0.18);
          }
        }
      }
    }

    // ---------------------------------------------------------------- pavimento di ogni arena
    function floor(g, idx, rnd) {
      const lw = Math.max(1, S * 0.03);
      // base a scacchi leggeri con i colori dell'arena
      for (let y = 0; y < E.H; y++) {
        for (let x = 0; x < E.W; x++) {
          g.fillStyle = arena.ground[(x + y) % 2];
          quad(g, x, y, x + 1.02, y + 1.02); g.fill();
        }
      }
      const line = (x0, y0, x1, y1) => { const a = proj(x0, y0), b = proj(x1, y1); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); };
      const dot = (x, y, r, col) => { const q = proj(x, y); g.fillStyle = col; g.beginPath(); g.ellipse(q.x, q.y, r * S * q.k, r * S * q.k * 0.7, 0, 0, 7); g.fill(); };
      switch (idx) {
        case 1:   // Labirinto: lastre di pietra sfalsate, con un po' di muschio
          g.strokeStyle = 'rgba(80,65,45,0.45)'; g.lineWidth = lw;
          for (let y = 0; y <= E.H; y++) line(0, y, E.W, y);
          for (let y = 0; y < E.H; y++) for (let x = (y % 2) * 0.75; x < E.W; x += 1.5) line(x, y, x, y + 1);
          for (let i = 0; i < 90; i++) dot(rnd() * E.W, rnd() * E.H, 0.08 + rnd() * 0.1, 'rgba(70,120,50,0.35)');
          break;
        case 2:   // Troia: terra battuta, sassolini e solchi dei carri
          for (let i = 0; i < 160; i++) dot(rnd() * E.W, rnd() * E.H, 0.04 + rnd() * 0.06, 'rgba(110,80,40,0.35)');
          g.strokeStyle = 'rgba(110,80,40,0.35)'; g.lineWidth = lw * 2;
          for (const x of [5.5, 6.2, 11.8, 12.5]) line(x, 0.6, x, E.H - 0.6);
          break;
        case 3:   // Isola: sabbia, conchiglie e qualche ciuffo
          for (let i = 0; i < 120; i++) dot(rnd() * E.W, rnd() * E.H, 0.04, 'rgba(160,130,80,0.35)');
          for (let i = 0; i < 26; i++) {
            const x = rnd() * E.W, y = E.RIVER_TOP - 2 + rnd() * 6;
            if (y > E.RIVER_TOP - 0.3 && y < E.RIVER_BOTTOM + 0.3) continue;
            dot(x, y, 0.13, ['#fff3e6', '#f7c7b8', '#f2e2c4'][i % 3]);
          }
          break;
        case 4:   // Colosseo: sabbia rastrellata ad archi
          g.strokeStyle = 'rgba(150,115,70,0.3)'; g.lineWidth = lw;
          for (let i = 0; i < 14; i++) {
            const cx = rnd() * E.W, cy = rnd() * E.H, r = 0.8 + rnd() * 1.2;
            for (let k = 0; k < 3; k++) { g.beginPath(); let first = true; for (let a = -0.9; a <= 0.9; a += 0.15) { const q = proj(cx + Math.sin(a) * (r + k * 0.25), cy - Math.cos(a) * (r + k * 0.25)); if (first) { g.moveTo(q.x, q.y); first = false; } else g.lineTo(q.x, q.y); } g.stroke(); }
          }
          break;
        case 5:   // Inferi: roccia nera con crepe di lava che brillano
          g.lineCap = 'round';
          for (let i = 0; i < 22; i++) {
            let x = rnd() * E.W, y = rnd() * E.H;
            if (y > E.RIVER_TOP - 0.5 && y < E.RIVER_BOTTOM + 0.5) continue;
            const pts = [[x, y]];
            for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 1.4; y += (rnd() - 0.5) * 1.4; pts.push([x, y]); }
            for (const [col, w] of [['rgba(255,90,20,0.35)', lw * 5], ['#ff8a2a', lw * 1.8], ['#ffe08a', lw * 0.7]]) {
              g.strokeStyle = col; g.lineWidth = w; g.beginPath();
              pts.forEach(([px2, py2], j) => { const q = proj(px2, py2); if (j) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y); });
              g.stroke();
            }
          }
          break;
        case 6:   // Olimpo: lastre di marmo con intarsi d'oro
          g.strokeStyle = 'rgba(200,160,60,0.55)'; g.lineWidth = lw * 1.4;
          for (let y = 0; y <= E.H; y += 2) line(0, y, E.W, y);
          for (let x = 0; x <= E.W; x += 2) line(x, 0, x, E.H);
          for (let y = 1; y < E.H; y += 2) for (let x = 1; x < E.W; x += 2) dot(x, y, 0.12, 'rgba(230,190,80,0.6)');
          g.strokeStyle = 'rgba(160,150,140,0.25)'; g.lineWidth = lw;
          for (let i = 0; i < 25; i++) { const x = rnd() * E.W, y = rnd() * E.H; line(x, y, x + rnd() * 1.5, y + (rnd() - 0.5)); }
          break;
        default:  // Sparta: prato con fiori e ciuffi
          for (let i = 0; i < 80; i++) {
            const x = 0.4 + rnd() * (E.W - 0.8), y = 0.8 + rnd() * (E.H - 1.6);
            if (Math.abs(x - 3.5) < 1.6 || Math.abs(x - 14.5) < 1.6 || (y > 14.3 && y < 17.7)) continue;
            if ((Math.abs(y - 3.2) < 3 || Math.abs(y - 28.8) < 3) && Math.abs(x - 9) < 3.5) continue;
            const q = proj(x, y), u = S * q.k;
            if (rnd() < 0.55) {
              g.strokeStyle = 'rgba(30,60,10,0.3)'; g.lineWidth = Math.max(1, u * 0.06);
              g.beginPath(); g.moveTo(q.x - u * 0.15, q.y); g.lineTo(q.x - u * 0.05, q.y - u * 0.25);
              g.moveTo(q.x, q.y); g.lineTo(q.x, q.y - u * 0.3);
              g.moveTo(q.x + u * 0.15, q.y); g.lineTo(q.x + u * 0.05, q.y - u * 0.25); g.stroke();
            } else {
              g.fillStyle = ['#fff6d6', '#ffd166', '#f4a3b5'][i % 3];
              for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(q.x + Math.cos(k * 1.57) * u * 0.08, q.y + Math.sin(k * 1.57) * u * 0.06, u * 0.07, 0, 7); g.fill(); }
              g.fillStyle = '#e8a23a'; g.beginPath(); g.arc(q.x, q.y, u * 0.05, 0, 7); g.fill();
            }
          }
      }
    }

    // ---------------------------------------------------------------- paesaggio di ogni arena
    // Tutto quello che sta fuori dal campo: cielo e decorazioni diverse per ogni arena
    const SKIES = ['#7fb2e0', '#d8b47a', '#e8a05e', '#63b6ea', '#e3ae6c', '#2a0c10', '#cfe6ff'];
    function scenery(g, c) {
      const idx = Math.max(0, D.ARENAS.indexOf(arena));
      const sky = g.createLinearGradient(0, 0, 0, c.height);
      sky.addColorStop(0, SKIES[idx]); sky.addColorStop(0.45, arena.sky); sky.addColorStop(1, '#140e0a');
      g.fillStyle = sky; g.fillRect(0, 0, c.width, c.height);
      const rnd = E.makeRng(11 + idx);
      const lw = Math.max(1, S * 0.04);
      // posizioni lungo i due lati del campo (in prospettiva), dal fondo verso chi guarda
      const spots = [];
      for (let yy = -1.5; yy < E.H + 0.5; yy += idx === 1 || idx === 2 || idx === 4 ? 1.1 : 1.6) {
        for (const sideL of [true, false]) spots.push({ yy, sideL, r: rnd(), r2: rnd() });
      }
      const at = (sp, off) => {
        const e = proj(sp.sideL ? 0 : E.W, Math.max(0, Math.min(E.H, sp.yy)));
        return { x: e.x + (sp.sideL ? -1 : 1) * S * off * e.k, y: e.y, k: e.k, u: S * e.k };
      };
      if (idx === 3) {   // Isola: tutto intorno è mare con la schiuma
        const sea = g.createLinearGradient(0, 0, 0, c.height);
        sea.addColorStop(0, '#9fd4f5'); sea.addColorStop(0.25, '#2f86c9'); sea.addColorStop(1, '#0d3d6b');
        g.fillStyle = sea; g.fillRect(0, c.height * 0.08, c.width, c.height);
        g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = lw * 1.5;
        for (let i = 0; i < 40; i++) {
          const x = rnd() * c.width, y = c.height * (0.1 + rnd() * 0.9);
          g.beginPath(); g.arc(x, y, S * 0.3, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
        }
      }
      if (idx === 5) {   // Inferi: bagliore rosso sullo sfondo
        const glow = g.createRadialGradient(c.width / 2, 0, 0, c.width / 2, 0, c.height * 0.6);
        glow.addColorStop(0, 'rgba(255,90,30,0.55)'); glow.addColorStop(1, 'rgba(255,90,30,0)');
        g.fillStyle = glow; g.fillRect(0, 0, c.width, c.height);
      }
      if (idx === 6) {   // Olimpo: raggi di sole
        g.fillStyle = 'rgba(255,240,180,0.25)';
        for (let i = 0; i < 7; i++) {
          g.beginPath(); g.moveTo(c.width / 2, -S); g.lineTo(c.width * (i / 6) - S, c.height); g.lineTo(c.width * (i / 6) + S * 1.2, c.height); g.fill();
        }
      }
      stands(g, c, idx, rnd);
      for (const sp of spots) {
        if (idx === 4) continue;   // il Colosseo ha già le sue gradinate
        const q = at(sp, 2.2 + sp.r * 1.2), u = q.u;
        if ((sp.sideL && q.x < -u * 2) || (!sp.sideL && q.x > c.width + u * 2)) continue;
        g.lineWidth = lw; g.strokeStyle = '#1b130d';
        switch (idx) {
          case 0: {   // Sparta: cipressi e ulivi
            if (sp.r2 < 0.55) {
              const h = u * (1.6 + sp.r);
              g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(q.x, q.y, h * 0.25, h * 0.08, 0, 0, 7); g.fill();
              g.fillStyle = sp.r > 0.5 ? '#2f5a2a' : '#3d6e34';
              g.beginPath(); g.ellipse(q.x, q.y - h * 0.45, h * 0.17, h * 0.5, 0, 0, 7); g.fill(); g.stroke();
            } else {
              g.fillStyle = '#6b4a2a'; g.fillRect(q.x - u * 0.08, q.y - u * 0.7, u * 0.16, u * 0.7);
              g.fillStyle = '#8fa86a';
              for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(q.x + (k - 1.5) * u * 0.28, q.y - u * (0.9 + (k % 2) * 0.25), u * 0.38, 0, 7); g.fill(); g.stroke(); }
            }
            break;
          }
          case 1: {   // Labirinto: siepi alte
            const w = u * 1.3, h = u * (0.9 + (sp.r > 0.7 ? 0.5 : 0));
            g.fillStyle = '#2f6a22'; g.fillRect(q.x - w / 2, q.y - h, w, h); g.strokeRect(q.x - w / 2, q.y - h, w, h);
            g.fillStyle = '#4f9a3a'; g.fillRect(q.x - w / 2, q.y - h, w, h * 0.28);
            g.fillStyle = 'rgba(255,255,255,0.12)';
            for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(q.x - w / 2 + (k + 0.5) * w / 4, q.y - h * 0.6, u * 0.08, 0, 7); g.fill(); }
            break;
          }
          case 2: {   // Troia: mura di pietra con le merlature e le torri
            const tower = sp.r > 0.78, w = u * 1.25, h = u * (tower ? 2.2 : 1.3);
            g.fillStyle = tower ? '#b89a68' : '#c9b080'; g.fillRect(q.x - w / 2, q.y - h, w, h); g.strokeRect(q.x - w / 2, q.y - h, w, h);
            g.fillStyle = '#d9c49a';
            for (let k = 0; k < 3; k++) { g.fillRect(q.x - w / 2 + k * w * 0.4, q.y - h - u * 0.25, w * 0.22, u * 0.25); g.strokeRect(q.x - w / 2 + k * w * 0.4, q.y - h - u * 0.25, w * 0.22, u * 0.25); }
            g.strokeStyle = 'rgba(80,60,30,0.5)';
            for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(q.x - w / 2, q.y - (h * k) / 4); g.lineTo(q.x + w / 2, q.y - (h * k) / 4); g.stroke(); }
            if (tower) { g.fillStyle = '#2b1d14'; g.fillRect(q.x - u * 0.12, q.y - h * 0.7, u * 0.24, u * 0.4); }
            break;
          }
          case 3: {   // Isola: scogli e schiuma
            if (sp.r2 < 0.6) {
              g.fillStyle = sp.r > 0.5 ? '#7d7466' : '#958b7a';
              g.beginPath(); g.moveTo(q.x - u * 0.7, q.y); g.lineTo(q.x - u * 0.3, q.y - u * (0.7 + sp.r)); g.lineTo(q.x + u * 0.4, q.y - u * 0.5); g.lineTo(q.x + u * 0.7, q.y); g.closePath(); g.fill(); g.stroke();
              g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = lw * 2;
              g.beginPath(); g.ellipse(q.x, q.y, u * 0.85, u * 0.18, 0, 0, Math.PI); g.stroke();
            }
            break;
          }
          case 4: {   // Colosseo: gradinate con archi e pubblico
            const w = u * 1.25, h = u * 2.2;
            g.fillStyle = '#d9b98c'; g.fillRect(q.x - w / 2, q.y - h, w, h); g.strokeRect(q.x - w / 2, q.y - h, w, h);
            g.fillStyle = '#3a2414';
            for (let row = 0; row < 2; row++) {
              g.beginPath(); g.arc(q.x, q.y - h * (0.25 + row * 0.42), u * 0.28, Math.PI, 0); g.lineTo(q.x + u * 0.28, q.y - h * (0.12 + row * 0.42)); g.lineTo(q.x - u * 0.28, q.y - h * (0.12 + row * 0.42)); g.fill();
            }
            const fans = ['#e0453a', '#3f7fe0', '#f2c24a', '#fff', '#4fa83a'];
            for (let k = 0; k < 5; k++) { g.fillStyle = fans[(k + Math.floor(sp.r * 5)) % 5]; g.beginPath(); g.arc(q.x - w / 2 + (k + 0.5) * w / 5, q.y - h - u * 0.15, u * 0.12, 0, 7); g.fill(); }
            break;
          }
          case 5: {   // Inferi: rocce scure, crepe di lava e fiammelle
            g.fillStyle = sp.r > 0.5 ? '#2a1f24' : '#3a2a30';
            g.beginPath(); g.moveTo(q.x - u * 0.8, q.y); g.lineTo(q.x - u * 0.4, q.y - u * (0.9 + sp.r)); g.lineTo(q.x + u * 0.3, q.y - u * 0.6); g.lineTo(q.x + u * 0.8, q.y); g.closePath(); g.fill(); g.stroke();
            g.strokeStyle = '#ff6a1a'; g.lineWidth = lw * 1.6;
            g.beginPath(); g.moveTo(q.x - u * 0.4, q.y - u * 0.1); g.lineTo(q.x - u * 0.1, q.y - u * 0.5); g.lineTo(q.x + u * 0.2, q.y - u * 0.3); g.stroke();
            if (sp.r2 < 0.45) {
              g.fillStyle = '#ff7b1a'; g.beginPath(); g.ellipse(q.x + u * 0.5, q.y - u * 0.35, u * 0.16, u * 0.35, 0, 0, 7); g.fill();
              g.fillStyle = '#ffd166'; g.beginPath(); g.ellipse(q.x + u * 0.5, q.y - u * 0.25, u * 0.08, u * 0.18, 0, 0, 7); g.fill();
            }
            break;
          }
          default: {   // Olimpo: nuvole e colonne d'oro
            if (sp.r2 < 0.35) {
              const h = u * 2;
              g.fillStyle = '#f2c24a'; g.fillRect(q.x - u * 0.22, q.y - h, u * 0.44, h); g.strokeRect(q.x - u * 0.22, q.y - h, u * 0.44, h);
              g.fillStyle = '#fff0a8'; g.fillRect(q.x - u * 0.34, q.y - h - u * 0.18, u * 0.68, u * 0.2);
            }
            g.fillStyle = 'rgba(255,255,255,0.92)';
            for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(q.x + (k - 1.5) * u * 0.4, q.y - u * (0.1 + (k % 2) * 0.25), u * (0.42 + sp.r * 0.2), 0, 7); g.fill(); }
          }
        }
      }
    }

    // ---------------------------------------------------------------- terreno
    // Il campo è simmetrico: si disegna una volta sola (anche girato è uguale)
    function buildGround() {
      const c = document.createElement('canvas');
      c.width = canvas.width; c.height = canvas.height;
      const g = c.getContext('2d');
      scenery(g, c);
      // bordo di marmo rialzato (si vede lo spessore sotto il campo)
      const tl = proj(0, 0), tr = proj(E.W, 0), br = proj(E.W, E.H), bl = proj(0, E.H);
      const lip = S * 0.45;
      g.fillStyle = '#b9ad94';
      g.beginPath(); g.moveTo(bl.x - S * 0.3, bl.y); g.lineTo(br.x + S * 0.3, br.y); g.lineTo(br.x + S * 0.3, br.y + lip); g.lineTo(bl.x - S * 0.3, bl.y + lip); g.closePath(); g.fill();
      g.fillStyle = '#e8dfcc';
      g.beginPath(); g.moveTo(tl.x - S * 0.3 * KT, tl.y - S * 0.1); g.lineTo(tr.x + S * 0.3 * KT, tr.y - S * 0.1); g.lineTo(br.x + S * 0.3, br.y + S * 0.08); g.lineTo(bl.x - S * 0.3, bl.y + S * 0.08); g.closePath(); g.fill();
      const idx = Math.max(0, D.ARENAS.indexOf(arena));
      floor(g, idx, E.makeRng(5 + idx));
      // luce: più scuro lontano, più chiaro vicino
      const shade = g.createLinearGradient(0, tl.y, 0, bl.y);
      shade.addColorStop(0, 'rgba(0,0,0,0.18)'); shade.addColorStop(0.5, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(255,255,220,0.06)');
      g.fillStyle = shade; quad(g, 0, 0, E.W, E.H); g.fill();
      // sentieri di terra battuta: le due corsie e il passaggio davanti ai Re
      g.fillStyle = PATHS[idx];
      quad(g, 2.6, 4.5, 4.4, 27.5); g.fill(); quad(g, 13.6, 4.5, 15.4, 27.5); g.fill();
      quad(g, 2.6, 1.6, 15.4, 3.4); g.fill(); quad(g, 2.6, 28.6, 15.4, 30.4); g.fill();
      const rnd = E.makeRng(7);
      g.fillStyle = 'rgba(120,90,50,0.22)';
      for (let i = 0; i < 110; i++) {
        const lx = rnd() < 0.5 ? 2.7 + rnd() * 1.6 : 13.7 + rnd() * 1.6, ly = 5 + rnd() * 22;
        const q = proj(lx, ly);
        g.beginPath(); g.ellipse(q.x, q.y, S * 0.06 * q.k, S * 0.04 * q.k, 0, 0, 7); g.fill();
      }
      // fiume con le rive
      g.fillStyle = '#d8c79c'; quad(g, 0, E.RIVER_TOP - 0.15, E.W, E.RIVER_BOTTOM + 0.15); g.fill();
      g.fillStyle = arena.river; quad(g, 0, E.RIVER_TOP, E.W, E.RIVER_BOTTOM); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.18)'; quad(g, 0, E.RIVER_TOP, E.W, E.RIVER_TOP + 0.35); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.15)'; quad(g, 0, E.RIVER_BOTTOM - 0.5, E.W, E.RIVER_BOTTOM - 0.2); g.fill();
      // ponti di marmo con le colonnine (con lo spessore visibile)
      for (const bx of E.BRIDGES) {
        const x0 = bx - 1.2, x1 = bx + 1.2, y0 = E.RIVER_TOP - 0.35, y1 = E.RIVER_BOTTOM + 0.35;
        const a = proj(x0, y1), b = proj(x1, y1);
        g.fillStyle = '#a89c84';
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(b.x, b.y + S * 0.3); g.lineTo(a.x, a.y + S * 0.3); g.closePath(); g.fill();
        g.fillStyle = '#efe7d6'; quad(g, x0, y0, x1, y1); g.fill();
        g.strokeStyle = '#cfc3a8'; g.lineWidth = Math.max(1, S * 0.04);
        for (let k = 1; k < 6; k++) {
          const yy = y0 + (k * (y1 - y0)) / 6, l = proj(x0 + 0.25, yy), r = proj(x1 - 0.25, yy);
          g.beginPath(); g.moveTo(l.x, l.y); g.lineTo(r.x, r.y); g.stroke();
        }
        g.strokeStyle = '#2b1d14'; g.lineWidth = Math.max(1, S * 0.05); quad(g, x0, y0, x1, y1); g.stroke();
        // balaustre: colonnine in piedi e corrimano
        for (const sx of [x0 + 0.12, x1 - 0.12]) {
          for (let k = 0; k <= 4; k++) {
            const q = proj(sx, y0 + 0.2 + (k * (y1 - y0 - 0.4)) / 4), u = S * q.k;
            g.fillStyle = '#fbf7ef'; g.strokeStyle = '#2b1d14'; g.lineWidth = Math.max(1, u * 0.04);
            g.fillRect(q.x - u * 0.09, q.y - u * 0.42, u * 0.18, u * 0.42); g.strokeRect(q.x - u * 0.09, q.y - u * 0.42, u * 0.18, u * 0.42);
          }
          const t0 = proj(sx, y0 + 0.2), t1 = proj(sx, y1 - 0.2);
          g.strokeStyle = '#2b1d14'; g.lineWidth = S * 0.16 * t1.k;
          g.beginPath(); g.moveTo(t0.x, t0.y - S * 0.42 * t0.k); g.lineTo(t1.x, t1.y - S * 0.42 * t1.k); g.stroke();
          g.strokeStyle = '#f6f0e3'; g.lineWidth = S * 0.1 * t1.k; g.stroke();
        }
      }
      // cornice di marmo con la greca (sopra e sotto) e bordi laterali
      const band = (y0, y1) => {
        g.fillStyle = '#efe7d6'; quad(g, 0, y0, E.W, y1); g.fill();
        g.strokeStyle = '#b5552f';
        const n = 36;
        for (let i = 0; i < n; i++) {
          const x = 0.15 + (i * (E.W - 0.3)) / n, w = (E.W - 0.3) / n;
          const P = (dx, dy) => proj(x + dx * w, y0 + 0.08 + dy * (y1 - y0 - 0.16));
          g.lineWidth = Math.max(1, S * 0.06 * P(0, 0).k);
          const pts = [P(0, 1), P(0, 0), P(0.75, 0), P(0.75, 0.7), P(0.3, 0.7), P(0.3, 0.35)];
          g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (const q of pts.slice(1)) g.lineTo(q.x, q.y); g.stroke();
        }
      };
      band(0, 0.6); band(E.H - 0.6, E.H);
      g.fillStyle = 'rgba(239,231,214,0.95)';
      quad(g, 0, 0, 0.18, E.H); g.fill(); quad(g, E.W - 0.18, 0, E.W, E.H); g.fill();
      return c;
    }

    function ground(state) {
      // se mancavano dei disegni del pubblico e adesso sono pronti, si ridisegna il terreno
      if (bg && crowdMissing && crowdReady()) bg = null;
      if (!bg || bg.width !== canvas.width || bg.height !== canvas.height) { crowdMissing = false; bg = buildGround(); }
      ctx.drawImage(bg, 0, 0);
      // onde che si muovono
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = Math.max(1, S * 0.06);
      const t = state ? state.t : 0;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        let pen = false;
        for (let x = 0.3; x <= E.W - 0.3; x += 0.25) {
          if (Math.abs(x - 3.5) < 1.35 || Math.abs(x - 14.5) < 1.35) { pen = false; continue; }
          const q = proj(x, E.RIVER_TOP + 0.7 + i * 0.6 + Math.sin(x * 1.7 + t * 2.2 + i * 2) * 0.08);
          if (pen) ctx.lineTo(q.x, q.y); else { ctx.moveTo(q.x, q.y); pen = true; }
        }
        ctx.stroke();
      }
    }

    // ---------------------------------------------------------------- pezzi
    const overlay = [];
    function bar(x, y, w, e, showNum, k, lvl) {
      k = k || 1;
      const h = Math.max(4, S * 0.24 * k);
      ctx.fillStyle = 'rgba(30,20,10,0.75)';
      ctx.beginPath(); (ctx.roundRect ? ctx.roundRect(x - w / 2 - 1.5, y - 1.5, w + 3, h + 3, 3) : ctx.rect(x - w / 2 - 1.5, y - 1.5, w + 3, h + 3)); ctx.fill();
      ctx.fillStyle = TEAM[side(e.owner)];
      ctx.fillRect(x - w / 2, y, w * Math.max(0, e.hp / e.max), h);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x - w / 2, y, w * Math.max(0, e.hp / e.max), h * 0.4);
      if (showNum) {
        // Vita dei templi: numero grande in grassetto, accanto alla barra
        const fs = Math.round(Math.max(11, S * 0.62 * k));
        ctx.font = `900 ${fs}px "Trebuchet MS", system-ui, sans-serif`;
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(3, fs * 0.28); ctx.strokeStyle = '#2b1d14';
        const tx = x - w / 2 - 5, ty = y + h / 2 + 1;
        ctx.strokeText(Math.ceil(e.hp), tx, ty);
        ctx.fillStyle = e.hp / e.max < 0.3 ? '#ffb4a8' : '#ffffff';
        ctx.fillText(Math.ceil(e.hp), tx, ty);
        if (lvl) levelBadge(tx - ctx.measureText(String(Math.ceil(e.hp))).width - 3, ty, fs * 1.05, lvl, e.owner);
      } else if (lvl) levelBadge(x - w / 2 - 2, y + h / 2, Math.max(10, h * 1.9), lvl, e.owner);
    }

    function stars(x, y, size) {
      ctx.font = `${Math.round(size)}px ${EMOJI_FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💫', x, y);
    }

    // Disegna un'immagine coi piedi in (cx, footY); se non è ancora pronta usa l'emoji
    function sprite(key, team, cx, footY, size, mirror, fallbackEmoji) {
      const img = SP && SP.image(key, team);
      if (img) {
        ctx.save();
        ctx.translate(cx, footY);
        if (mirror) ctx.scale(-1, 1);
        ctx.drawImage(img, -size / 2, -size * FOOT, size, size);
        ctx.restore();
      } else if (fallbackEmoji) {
        ctx.font = `${Math.round(size * 0.5)}px ${EMOJI_FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(fallbackEmoji, cx, footY - size * 0.4);
      }
    }
    function shadow(x, y, rx, ry, a) {
      ctx.fillStyle = `rgba(0,0,0,${a || 0.25})`;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    }

    function temple(e) {
      const p = proj(e.x, e.y), u = S * p.k, R = e.r * u;
      const size = R * 3.1;
      const foot = p.y + R * 0.75;
      shadow(p.x, foot - R * 0.05, R * 1.45, R * 0.42, 0.3);
      if (e.flash > 0) ctx.filter = 'brightness(1.5)';
      sprite(e.tower, side(e.owner), p.x, foot, size, false, '🏛️');
      // il guardiano sta sul gradino, davanti alle colonne
      const king = e.tower === 'king';
      const guard = king ? (e.active ? 'basileus' : 'basileus_dorme') : 'sacerdotessa';
      sprite(guard, side(e.owner), p.x, foot - size * 0.19, size * (king ? 0.6 : 0.62), false, null);
      ctx.filter = 'none';
      if (e.tower === 'king' && !e.active) {
        ctx.font = `bold ${Math.round(u * 0.6)}px "Trebuchet MS", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.strokeText('z z', p.x + R * 1.1, foot - size * 0.9);
        ctx.fillStyle = '#fff'; ctx.fillText('z z', p.x + R * 1.1, foot - size * 0.9);
      }
      if (e.stun > 0) stars(p.x, foot - size * 0.95, R * 0.6);
      if (e.tower !== 'king' || e.hp < e.max) overlay.push(() => bar(p.x, foot + u * 0.12, R * 1.7, e, true, p.k, e.level));
      else overlay.push(() => levelBadge(p.x + u * 0.42, foot + u * 0.5, Math.max(12, S * 0.55 * p.k), e.level || 1, e.owner));
    }

    function ruin(r) {
      const p = proj(r.x, r.y), u = S * p.k;
      sprite('rovine', 0, p.x, p.y + r.r * u * 0.75, r.r * u * 2.8, false, null);
    }

    function unit(e, t) {
      const d = D.BY_KEY[e.key] || {};
      const p = proj(e.x, e.y), u = S * p.k;
      // verso: guarda dove sta andando
      const last = facing.get(e.id);
      let dir = last ? last.dir : (side(e.owner) === 0 ? 1 : -1);
      if (last && Math.abs(e.x - last.x) > 0.01) dir = (flip ? -1 : 1) * Math.sign(e.x - last.x);
      const moving = last ? Math.hypot(e.x - last.x, e.y - last.y) > 0.002 : false;
      facing.set(e.id, { x: e.x, y: e.y, dir });

      const R = e.r * u;
      const size = u * (1.8 + e.r * 2.4);
      const lift = e.flying ? u * 1.1 + Math.sin(t * 4 + e.id) * u * 0.12 : 0;
      const foot = p.y + R * 0.3;
      // ombra e cerchio della squadra
      shadow(p.x, foot, R * (e.flying ? 0.8 : 1.1), R * 0.45, e.flying ? 0.18 : 0.28);
      ctx.strokeStyle = TEAM[side(e.owner)];
      ctx.lineWidth = Math.max(1.5, u * 0.09);
      ctx.beginPath(); ctx.ellipse(p.x, foot, R, R * 0.42, 0, 0, Math.PI * 2); ctx.stroke();

      ctx.save();
      ctx.globalAlpha = e.deploy > 0 ? 0.55 : 1;
      const hop = moving && !e.flying && e.stun <= 0 ? Math.abs(Math.sin(t * 9 + e.id)) * u * 0.12 : 0;
      ctx.translate(p.x, foot - lift - hop);
      if (moving && e.stun <= 0) ctx.rotate(Math.sin(t * 9 + e.id) * 0.06);
      if (e.flash > 0) ctx.filter = 'brightness(1.7)';
      if (e.stun > 0) ctx.filter = 'grayscale(1) brightness(1.1)';
      sprite(e.key, side(e.owner), 0, 0, size, dir < 0, d.emoji);
      ctx.filter = 'none';
      ctx.restore();
      ctx.globalAlpha = 1;

      const top = foot - lift - size * 0.92;
      if (e.charging) {
        ctx.strokeStyle = '#ffe066'; ctx.lineWidth = u * 0.1;
        ctx.beginPath(); ctx.ellipse(p.x, foot, R * 1.35, R * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
      }
      if (d.heads && e.heads > 1) {
        ctx.font = `bold ${Math.round(u * 0.55)}px "Trebuchet MS", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = '#2b1d14'; ctx.strokeText('×' + e.heads, p.x + size * 0.4, top + size * 0.1);
        ctx.fillStyle = '#ffe066'; ctx.fillText('×' + e.heads, p.x + size * 0.4, top + size * 0.1);
      }
      if (e.stun > 0) stars(p.x, top, u * 0.7);
      if (e.deploy > 0) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.5, u * 0.07);
        ctx.beginPath(); ctx.arc(p.x, foot - lift - size * 0.45, size * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - Math.min(1, e.deploy))); ctx.stroke();
      }
      if (e.hp < e.max) overlay.push(() => bar(p.x, top - u * 0.1, Math.max(u * 0.9, R * 1.8), e, false, p.k, e.level));
    }

    function building(e) {
      const d = D.BY_KEY[e.key];
      const p = proj(e.x, e.y), u = S * p.k, R = e.r * u;
      const foot = p.y + R * 0.6;
      shadow(p.x, foot, R * 1.3, R * 0.45);
      ctx.globalAlpha = e.deploy > 0 ? 0.55 : 1;
      if (e.flash > 0) ctx.filter = 'brightness(1.6)';
      sprite(e.key, side(e.owner), p.x, foot, R * 3.1, side(e.owner) === 1 && e.key === 'cavallo', d.emoji);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      if (e.stun > 0) stars(p.x, foot - R * 2.8, R * 0.8);
      overlay.push(() => bar(p.x, foot - R * 3.1, R * 1.8, e, false, p.k, e.level));
    }

    // Proiettili: frecce, pietre, dardi, note, sguardi, fiamme (volano un po' sopra il terreno)
    const lastShot = [];
    function shot(sh, i) {
      const p = proj(sh.x, sh.y), u = S * p.k;
      const x = p.x, y = p.y - u * 0.9;
      const prev = lastShot[i];
      const ang = prev ? Math.atan2(y - prev.y, x - prev.x) : Math.PI / 2;
      lastShot[i] = { x, y };
      ctx.save();
      ctx.translate(x, y);
      switch (sh.shot) {
        case 'freccia': case 'dardo': {
          const L = u * (sh.shot === 'dardo' ? 0.9 : 0.6);
          ctx.rotate(ang);
          ctx.strokeStyle = '#5b3a1a'; ctx.lineWidth = Math.max(1.5, u * (sh.shot === 'dardo' ? 0.1 : 0.06));
          ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(0, 0); ctx.stroke();
          ctx.fillStyle = '#d8dde3';
          ctx.beginPath(); ctx.moveTo(u * 0.15, 0); ctx.lineTo(-u * 0.06, -u * 0.08); ctx.lineTo(-u * 0.06, u * 0.08); ctx.fill();
          break;
        }
        case 'pietra':
          ctx.fillStyle = '#8f8a80'; ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(0, 0, u * 0.14, 0, 7); ctx.fill(); ctx.stroke();
          break;
        case 'nota':
          ctx.font = `bold ${Math.round(u * 0.6)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ff7ad9'; ctx.fillText('♪', 0, 0);
          break;
        case 'sguardo':
          ctx.fillStyle = 'rgba(120,255,140,0.85)';
          ctx.beginPath(); ctx.arc(0, 0, u * 0.18, 0, 7); ctx.fill();
          break;
        default:
          ctx.fillStyle = '#ff7b1a';
          ctx.beginPath(); ctx.arc(0, 0, u * 0.22, 0, 7); ctx.fill();
          ctx.fillStyle = '#ffd166';
          ctx.beginPath(); ctx.arc(0, 0, u * 0.11, 0, 7); ctx.fill();
      }
      ctx.restore();
    }

    // Cerchio "a terra" in prospettiva (un'ellisse)
    function groundCircle(p, r) { ctx.beginPath(); ctx.ellipse(p.x, p.y, r * S * p.k, r * S * p.k * C * 0.85, 0, 0, Math.PI * 2); }

    function effect(f, t) {
      const k = Math.min(1, (t - f.t0) / f.dur);
      const p = proj(f.x, f.y), u = S * p.k, x = p.x, y = p.y;
      ctx.save();
      switch (f.type) {
        case 'cast': {   // area dell'incantesimo in arrivo
          ctx.globalAlpha = 0.3 * (1 - k);
          ctx.fillStyle = f.key === 'fuoco' ? '#ff7b1a' : f.key === 'fulmine' ? '#fff27a' : '#a5d8ff';
          groundCircle(p, f.r || 2); ctx.fill();
          ctx.globalAlpha = 0.8 * (1 - k);
          ctx.strokeStyle = '#fff'; ctx.lineWidth = u * 0.06; ctx.setLineDash([u * 0.3, u * 0.2]);
          groundCircle(p, f.r || 2); ctx.stroke();
          ctx.setLineDash([]);
          if (f.key === 'fuoco') {   // il vaso di fuoco cade dal cielo
            ctx.globalAlpha = 1;
            sprite('fuoco', 0, x, y - (1 - k) * u * 8 + u * 0.6, u * 1.9, false, '🔥');
          }
          break;
        }
        case 'boom':
          ctx.globalAlpha = 0.75 * (1 - k);
          ctx.fillStyle = f.key === 'fuoco' ? '#ff9d2e' : '#bfe3ff';
          groundCircle(p, f.r * (0.6 + 0.4 * k)); ctx.fill();
          ctx.fillStyle = f.key === 'fuoco' ? '#ffd166' : '#ffffff';
          groundCircle(p, f.r * 0.5 * (1 - k)); ctx.fill();
          if (f.key === 'fuoco') {   // fiammata verso l'alto
            ctx.globalAlpha = 0.6 * (1 - k);
            ctx.fillStyle = '#ff6a1a';
            ctx.beginPath(); ctx.ellipse(x, y - u * 1.2 * (0.5 + k), u * f.r * 0.5, u * 1.4, 0, 0, Math.PI * 2); ctx.fill();
          }
          if (f.key === 'lancia') {
            ctx.globalAlpha = 1 - k;
            sprite('lancia', 0, x, y + u * 0.4, u * 2, false, '🦉');
          }
          break;
        case 'bolt':
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = '#fff27a'; ctx.lineWidth = u * 0.3; ctx.shadowColor = '#fff27a'; ctx.shadowBlur = u;
          ctx.beginPath(); ctx.moveTo(x, y - u * 10);
          for (let i = 1; i <= 5; i++) ctx.lineTo(x + (i % 2 ? 1 : -1) * u * 0.5, y - u * 10 + i * u * 2);
          ctx.stroke();
          break;
        case 'splash':
          ctx.globalAlpha = 0.55 * (1 - k);
          ctx.strokeStyle = '#fff'; ctx.lineWidth = u * 0.12;
          groundCircle(p, f.r * (0.5 + 0.5 * k)); ctx.stroke();
          break;
        case 'heal':
          ctx.globalAlpha = 0.45 * (1 - k);
          ctx.strokeStyle = '#86efac'; ctx.lineWidth = u * 0.15;
          groundCircle(p, f.r * k); ctx.stroke();
          ctx.fillStyle = '#4ade80'; ctx.font = `bold ${Math.round(u * 0.6)}px sans-serif`; ctx.textAlign = 'center';
          ctx.fillText('+', x, y - u * (1.4 + k));
          break;
        case 'slash':
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = '#fff'; ctx.lineWidth = u * 0.1; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.arc(x, y - u * 0.8, u * 0.5, -2.4 + k, -0.8 + k); ctx.stroke();
          break;
        case 'charge':
          ctx.globalAlpha = 1 - k;
          ctx.font = `${Math.round(u)}px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('💥', x, y - u * 0.8);
          break;
        case 'collapse': {   // tempio abbattuto: lampo, macerie che volano e polvere
          const R = f.r * u;
          if (k < 0.25) {
            ctx.globalAlpha = 1 - k * 4;
            ctx.fillStyle = '#fff6c4';
            ctx.beginPath(); ctx.ellipse(x, y - R * 0.5, R * (1 + k * 6), R * (0.6 + k * 4), 0, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = Math.max(0, 1 - k);
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2 + i, sp = 0.6 + (i % 4) * 0.25;
            const dx = Math.cos(a) * R * 2.2 * sp * k, dy = -Math.abs(Math.sin(a)) * R * 2.8 * sp * k + R * 3.5 * k * k;
            ctx.save(); ctx.translate(x + dx, y - R * 0.6 + dy); ctx.rotate(k * 8 + i);
            ctx.fillStyle = i % 3 ? '#efe7d6' : '#cfc3a8'; ctx.strokeStyle = '#2b1d14'; ctx.lineWidth = Math.max(1, u * 0.04);
            ctx.fillRect(-u * 0.2, -u * 0.12, u * 0.4, u * 0.24); ctx.strokeRect(-u * 0.2, -u * 0.12, u * 0.4, u * 0.24);
            ctx.restore();
          }
          ctx.fillStyle = 'rgba(214,200,170,0.75)';
          for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2;
            ctx.globalAlpha = 0.7 * (1 - k);
            ctx.beginPath(); ctx.arc(x + Math.cos(a) * R * (0.4 + k * 1.6), y - R * 0.2 + Math.sin(a) * R * 0.5 * (0.4 + k * 1.6), u * (0.5 + k * 0.9), 0, Math.PI * 2); ctx.fill();
          }
          break;
        }
        case 'poof':
          ctx.globalAlpha = 0.65 * (1 - k);
          ctx.fillStyle = '#efe7d6';
          for (let i = 0; i < 6; i++) {
            const a = i * 1.05;
            ctx.beginPath(); ctx.arc(x + Math.cos(a) * u * f.r * k * 1.5, y - u * 0.5 + Math.sin(a) * u * f.r * k, u * 0.28 * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
          }
          break;
      }
      ctx.restore();
    }

    // Zona dove si può mettere la carta scelta (il resto viene scurito)
    function placeZone(state, me, key) {
      const d = D.BY_KEY[key];
      if (!d || d.type === 'spell') return;
      // Come una scacchiera: i colori vengono dal terreno dell'arena, così la griglia si "fonde" col campo.
      // Le caselle vietate sono solo un po' più scure.
      const g = gridColors();
      ctx.lineWidth = Math.max(1, S * 0.035);
      for (let y = 0; y < E.H; y++) {
        for (let x = 0; x < E.W; x++) {
          quad(ctx, x + 0.04, y + 0.04, x + 0.96, y + 0.96);
          if (!E.canPlace(state, me, key, x + 0.5, y + 0.5)) { ctx.fillStyle = 'rgba(232,48,72,0.38)'; ctx.fill(); }
          else {
            ctx.fillStyle = (x + y) % 2 ? g.a : g.b; ctx.fill();
            ctx.strokeStyle = g.line; ctx.stroke();
          }
        }
      }
    }
    // Colori della griglia presi dal terreno dell'arena (chiaro o scuro)
    function gridColors() {
      const hex = arena.ground[0].replace('#', '');
      const [r, gg, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const light = (r * 0.3 + gg * 0.59 + b * 0.11) > 150;
      const mix = (k, a) => `rgba(${Math.round(r * k)},${Math.round(gg * k)},${Math.round(b * k)},${a})`;
      return light
        ? { a: mix(1.12, 0.35), b: mix(0.92, 0.25), line: mix(0.55, 0.55), no: mix(0.35, 0.35), hi: mix(1.25, 0.75), hiLine: mix(0.4, 0.9) }
        : { a: mix(1.5, 0.3), b: mix(1.25, 0.2), line: mix(2.2, 0.5), no: 'rgba(0,0,0,0.35)', hi: mix(2.4, 0.6), hiLine: mix(3, 0.95) };
    }

    function ghost(state, me, key, gx, gy) {
      const d = D.BY_KEY[key];
      if (!d) return;
      let x = gx, y = gy;
      if (d.type !== 'spell') { x = Math.floor(x) + 0.5; y = Math.floor(y) + 0.5; }
      const ok = E.canPlace(state, me, key, x, y);
      if (d.type !== 'spell') {   // la casella scelta si illumina
        quad(ctx, x - 0.5, y - 0.5, x + 0.5, y + 0.5);
        const g = gridColors();
        ctx.fillStyle = ok ? g.hi : 'rgba(200,40,30,0.45)'; ctx.fill();
        ctx.strokeStyle = ok ? g.hiLine : '#ff6b6b'; ctx.lineWidth = Math.max(1.5, S * 0.07); ctx.stroke();
      }
      const p = proj(x, y), u = S * p.k;
      const r = d.type === 'spell' ? d.radius : (D.BY_KEY[d.unit || key].radius || 0.5) + ((d.count || 1) > 1 ? 0.6 : 0);
      ctx.fillStyle = ok ? 'rgba(255,255,255,0.3)' : 'rgba(255,60,60,0.35)';
      ctx.strokeStyle = ok ? '#fff' : '#ff6b6b';
      ctx.lineWidth = Math.max(1.5, u * 0.08);
      groundCircle(p, r); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 0.85;
      sprite(d.unit || key, 0, p.x, p.y + u * 0.2, u * 2.2, false, d.emoji);
      ctx.globalAlpha = 1;
    }

    // Disegna tutto. ui: { me, dragKey, gx, gy }
    function draw(state, ui) {
      ground(state);
      if (!state) return;
      if (ui && ui.dragKey) placeZone(state, ui.me, ui.dragKey);
      for (const r of state.ruins) ruin(r);
      const t = state.t;
      // Prima chi è più lontano, così chi è davanti lo copre; chi vola sta sopra
      const list = state.ents.slice().sort((a, b) => (flip ? b.y - a.y : a.y - b.y) + (a.flying ? 100 : 0) - (b.flying ? 100 : 0));
      for (const e of list) {
        if (e.cat === 'tower') temple(e); else if (e.cat === 'building') building(e); else unit(e, t);
      }
      // barre della vita e livelli sopra a tutto (non vengono coperte dai templi davanti)
      for (const f of overlay.splice(0)) f();
      if (facing.size > 400) { const alive = new Set(state.ents.map((e) => e.id)); for (const id of facing.keys()) if (!alive.has(id)) facing.delete(id); }
      lastShot.length = Math.min(lastShot.length, state.shots.length);
      state.shots.forEach(shot);
      for (const f of state.fx) effect(f, t);
      if (ui && ui.dragKey && ui.gx != null) { ghost(state, ui.me, ui.dragKey, ui.gx, ui.gy); cardLabel(ui); }
    }

    // Sopra la carta che stai mettendo: nome, livello e (se manca ambrosia) quanta ne hai
    function outlined(text, x, y, size, color) {
      ctx.font = `900 ${Math.round(size)}px "Lilita One", "Trebuchet MS", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(3, size * 0.22); ctx.strokeStyle = '#1a1030'; ctx.strokeText(text, x, y);
      ctx.fillStyle = color; ctx.fillText(text, x, y);
    }
    function cardLabel(ui) {
      const d = D.BY_KEY[ui.dragKey];
      if (!d) return;
      let x = ui.gx, y = ui.gy;
      if (d.type !== 'spell') { x = Math.floor(x) + 0.5; y = Math.floor(y) + 0.5; }
      const p = proj(x, y), u = S * p.k;
      const top = p.y - u * 2.6;
      const cx = Math.min(canvas.width - u * 3, Math.max(u * 3, p.x));
      outlined(d.name, cx, top, u * 0.95, '#ffffff');
      outlined('liv. ' + (ui.level || 1), cx, top + u * 0.9, u * 0.7, '#ffffff');
      if (ui.amb != null && ui.amb < d.cost) outlined(Math.floor(ui.amb) + '/' + d.cost + ' 💧', cx, top - u * 1, u * 0.85, '#ff6ef0');
    }
    // Scudetto con il livello (rosso o blu), a sinistra delle barre della vita
    function levelBadge(x, y, h, lvl, owner) {
      const w = h * 1.05;
      ctx.fillStyle = TEAM[side(owner)];
      ctx.strokeStyle = '#1a1030'; ctx.lineWidth = Math.max(1.5, h * 0.12);
      ctx.beginPath(); (ctx.roundRect ? ctx.roundRect(x - w, y - h / 2, w, h, h * 0.2) : ctx.rect(x - w, y - h / 2, w, h)); ctx.fill(); ctx.stroke();
      outlined(String(lvl), x - w / 2, y + h * 0.04, h * 0.8, '#ffffff');
    }

    return {
      resize, draw, toGame,
      aspect: () => E.W / FIELD_H,
      // Altezza del fiume sullo schermo (in pixel CSS), per metterci sopra corone e tempo
      // Posizione sullo schermo (pixel CSS) di un punto del campo
      toScreen: (x, y) => { const q = proj(x, y); return { x: q.x / dpr, y: q.y / dpr }; },
      riverY: () => proj(E.W / 2, (E.RIVER_TOP + E.RIVER_BOTTOM) / 2).y / dpr,
      setFlip(f) { flip = f; facing.clear(); bg = null; },
      setArena(i) { arena = D.ARENAS[i] || D.ARENAS[0]; bg = null; },
    };
  }

  root.Render = { create, TEAM };
})(typeof self !== 'undefined' ? self : this);
