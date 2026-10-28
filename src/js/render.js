// Disegna il campo di battaglia su un <canvas>: terreno, fiume, templi, truppe ed effetti.
// I personaggi sono i disegni di sprites.js; il terreno è disegnato col codice.
(function (root) {
  'use strict';
  const D = root.GameData, E = root.Engine, SP = root.Sprites;
  const TEAM = ['#3f7fe0', '#e0453a'];
  const TEAM_DARK = ['#22509f', '#9e231b'];
  const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif';

  function create(canvas) {
    const ctx = canvas.getContext('2d');
    let S = 20, ox = 0, oy = 0, flip = false, arena = D.ARENAS[0], dpr = 1;
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
      S = Math.min(canvas.width / E.W, canvas.height / FIELD_H);
      ox = (canvas.width - S * E.W) / 2;
      // Il campo sta in basso (vicino alle carte); lo spazio che avanza in alto diventa cielo
      oy = Math.max((canvas.height - S * FIELD_H) / 2, canvas.height - S * FIELD_H - S * 0.6);
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

    // ---------------------------------------------------------------- terreno
    // Il campo è simmetrico: si disegna una volta sola (anche girato è uguale)
    function buildGround() {
      const c = document.createElement('canvas');
      c.width = canvas.width; c.height = canvas.height;
      const g = c.getContext('2d');
      // cielo e colline dietro il campo
      const sky = g.createLinearGradient(0, 0, 0, c.height);
      sky.addColorStop(0, '#3a5f8f'); sky.addColorStop(0.5, arena.sky); sky.addColorStop(1, '#1b1410');
      g.fillStyle = sky; g.fillRect(0, 0, c.width, c.height);
      // cipressi ai lati, fuori dal campo
      const rnd0 = E.makeRng(11);
      for (let i = 0; i < 26; i++) {
        const yy = rnd0() * E.H, sideL = i % 2 === 0;
        const edge = proj(sideL ? 0 : E.W, yy);
        const k = edge.k, x = edge.x + (sideL ? -1 : 1) * (S * (0.4 + rnd0() * 1.2) * k), h = S * (1.3 + rnd0()) * k;
        if ((sideL && x < 0) || (!sideL && x > c.width)) continue;
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath(); g.ellipse(x, edge.y + h * 0.05, h * 0.25, h * 0.08, 0, 0, 7); g.fill();
        g.fillStyle = i % 3 ? '#2f5a2a' : '#3d6e34';
        g.beginPath(); g.ellipse(x, edge.y - h * 0.45, h * 0.18, h * 0.5, 0, 0, 7); g.fill();
        g.strokeStyle = '#1d3a1a'; g.lineWidth = Math.max(1, S * 0.04); g.stroke();
      }
      // bordo di marmo rialzato (si vede lo spessore sotto il campo)
      const tl = proj(0, 0), tr = proj(E.W, 0), br = proj(E.W, E.H), bl = proj(0, E.H);
      const lip = S * 0.45;
      g.fillStyle = '#b9ad94';
      g.beginPath(); g.moveTo(bl.x - S * 0.3, bl.y); g.lineTo(br.x + S * 0.3, br.y); g.lineTo(br.x + S * 0.3, br.y + lip); g.lineTo(bl.x - S * 0.3, bl.y + lip); g.closePath(); g.fill();
      g.fillStyle = '#e8dfcc';
      g.beginPath(); g.moveTo(tl.x - S * 0.3 * KT, tl.y - S * 0.1); g.lineTo(tr.x + S * 0.3 * KT, tr.y - S * 0.1); g.lineTo(br.x + S * 0.3, br.y + S * 0.08); g.lineTo(bl.x - S * 0.3, bl.y + S * 0.08); g.closePath(); g.fill();
      // erba a scacchi leggeri
      for (let y = 0; y < E.H; y++) {
        for (let x = 0; x < E.W; x++) {
          g.fillStyle = arena.ground[(x + y) % 2];
          quad(g, x, y, x + 1.02, y + 1.02); g.fill();
        }
      }
      // luce: più scuro lontano, più chiaro vicino
      const shade = g.createLinearGradient(0, tl.y, 0, bl.y);
      shade.addColorStop(0, 'rgba(0,0,0,0.18)'); shade.addColorStop(0.5, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(255,255,220,0.06)');
      g.fillStyle = shade; quad(g, 0, 0, E.W, E.H); g.fill();
      // sentieri di terra battuta: le due corsie e il passaggio davanti ai Re
      g.fillStyle = arena.path || 'rgba(222,196,140,0.78)';
      quad(g, 2.6, 4.5, 4.4, 27.5); g.fill(); quad(g, 13.6, 4.5, 15.4, 27.5); g.fill();
      quad(g, 2.6, 1.6, 15.4, 3.4); g.fill(); quad(g, 2.6, 28.6, 15.4, 30.4); g.fill();
      const rnd = E.makeRng(7);
      g.fillStyle = 'rgba(120,90,50,0.22)';
      for (let i = 0; i < 110; i++) {
        const lx = rnd() < 0.5 ? 2.7 + rnd() * 1.6 : 13.7 + rnd() * 1.6, ly = 5 + rnd() * 22;
        const q = proj(lx, ly);
        g.beginPath(); g.ellipse(q.x, q.y, S * 0.06 * q.k, S * 0.04 * q.k, 0, 0, 7); g.fill();
      }
      // ciuffi d'erba e fiorellini
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
      if (!bg || bg.width !== canvas.width || bg.height !== canvas.height) bg = buildGround();
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
    function bar(x, y, w, e, showNum, k) {
      k = k || 1;
      const h = Math.max(4, S * 0.24 * k);
      ctx.fillStyle = 'rgba(30,20,10,0.75)';
      ctx.beginPath(); (ctx.roundRect ? ctx.roundRect(x - w / 2 - 1.5, y - 1.5, w + 3, h + 3, 3) : ctx.rect(x - w / 2 - 1.5, y - 1.5, w + 3, h + 3)); ctx.fill();
      ctx.fillStyle = TEAM[side(e.owner)];
      ctx.fillRect(x - w / 2, y, w * Math.max(0, e.hp / e.max), h);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x - w / 2, y, w * Math.max(0, e.hp / e.max), h * 0.4);
      if (showNum) {
        ctx.font = `bold ${Math.round(Math.max(9, S * 0.42 * k))}px "Trebuchet MS", system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(40,25,10,0.85)';
        ctx.strokeText(Math.ceil(e.hp), x, y + h + 2);
        ctx.fillStyle = '#fff';
        ctx.fillText(Math.ceil(e.hp), x, y + h + 2);
      }
    }

    function stars(x, y, size) {
      ctx.font = `${Math.round(size)}px ${EMOJI_FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💫', x, y);
    }

    // Disegna un'immagine coi piedi in (cx, footY); se non è ancora pronta usa l'emoji
    const FOOT = (SP && SP.FOOT) || 0.94;
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
      ctx.filter = 'none';
      if (e.tower === 'king' && !e.active) {
        ctx.font = `bold ${Math.round(u * 0.6)}px "Trebuchet MS", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.strokeText('z z', p.x + R * 1.1, foot - size * 0.9);
        ctx.fillStyle = '#fff'; ctx.fillText('z z', p.x + R * 1.1, foot - size * 0.9);
      }
      if (e.stun > 0) stars(p.x, foot - size * 0.95, R * 0.6);
      bar(p.x, foot + u * 0.12, R * 1.7, e, true, p.k);
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
      const size = u * (1.45 + e.r * 2.1);
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
      if (e.hp < e.max) bar(p.x, top - u * 0.1, Math.max(u * 0.9, R * 1.8), e, false, p.k);
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
      bar(p.x, foot - R * 3.1, R * 1.8, e, false, p.k);
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
      ctx.fillStyle = 'rgba(150,20,20,0.3)';
      for (let y = 0; y < E.H; y++) {
        for (let x = 0; x < E.W; x++) {
          if (!E.canPlace(state, me, key, x + 0.5, y + 0.5)) { quad(ctx, x, y, x + 1.02, y + 1.02); ctx.fill(); }
        }
      }
    }

    function ghost(state, me, key, gx, gy) {
      const d = D.BY_KEY[key];
      if (!d) return;
      let x = gx, y = gy;
      if (d.type !== 'spell') { x = Math.floor(x) + 0.5; y = Math.floor(y) + 0.5; }
      const ok = E.canPlace(state, me, key, x, y);
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
      if (facing.size > 400) { const alive = new Set(state.ents.map((e) => e.id)); for (const id of facing.keys()) if (!alive.has(id)) facing.delete(id); }
      lastShot.length = Math.min(lastShot.length, state.shots.length);
      state.shots.forEach(shot);
      for (const f of state.fx) effect(f, t);
      if (ui && ui.dragKey && ui.gx != null) ghost(state, ui.me, ui.dragKey, ui.gx, ui.gy);
    }

    return {
      resize, draw, toGame,
      aspect: () => E.W / FIELD_H,
      setFlip(f) { flip = f; facing.clear(); bg = null; },
      setArena(i) { arena = D.ARENAS[i] || D.ARENAS[0]; bg = null; },
    };
  }

  root.Render = { create, TEAM };
})(typeof self !== 'undefined' ? self : this);
