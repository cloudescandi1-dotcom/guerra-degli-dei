// Disegna il campo di battaglia su un <canvas>: terreno, fiume, templi, truppe ed effetti.
// Tutto è disegnato col codice (nessuna immagine da scaricare); i personaggi sono emoji.
(function (root) {
  'use strict';
  const D = root.GameData, E = root.Engine;
  const TEAM = ['#3b82f6', '#ef4444'];
  const TEAM_DARK = ['#1d4ed8', '#b91c1c'];

  // view: { flip: true se il giocatore locale è il numero 1 (va mostrato in basso) }
  function create(canvas) {
    const ctx = canvas.getContext('2d');
    let S = 20, ox = 0, oy = 0, flip = false, arena = D.ARENAS[0], dpr = 1;

    function resize() {
      dpr = Math.min(2, root.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      S = Math.min(canvas.width / E.W, canvas.height / E.H);
      ox = (canvas.width - S * E.W) / 2;
      oy = (canvas.height - S * E.H) / 2;
    }

    // Colore: chi guarda si vede sempre blu, l'avversario rosso
    const side = (owner) => (flip ? 1 - owner : owner);

    // Da coordinate di gioco a pixel, e ritorno
    const px = (x) => ox + (flip ? E.W - x : x) * S;
    const py = (y) => oy + (flip ? E.H - y : y) * S;
    function toGame(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      const x = ((clientX - r.left) * dpr - ox) / S, y = ((clientY - r.top) * dpr - oy) / S;
      return flip ? { x: E.W - x, y: E.H - y } : { x, y };
    }

    function ground(state) {
      ctx.fillStyle = arena.sky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < E.H; y++) {
        for (let x = 0; x < E.W; x++) {
          ctx.fillStyle = arena.ground[(x + y) % 2];
          ctx.fillRect(ox + x * S, oy + y * S, S + 0.5, S + 0.5);
        }
      }
      // Bordi del campo
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(ox, oy, S * E.W, S * 0.5);
      ctx.fillRect(ox, oy + S * (E.H - 0.5), S * E.W, S * 0.5);
      // Fiume con onde
      const ry = oy + E.RIVER_TOP * S;
      ctx.fillStyle = arena.river;
      ctx.fillRect(ox, ry, S * E.W, S * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = Math.max(1, S * 0.06);
      const t = state ? state.t : 0;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        for (let x = 0; x <= E.W; x += 0.25) {
          const yy = ry + S * (0.6 + i * 0.8) + Math.sin(x * 1.6 + t * 2 + i) * S * 0.08;
          if (x === 0) ctx.moveTo(ox + x * S, yy); else ctx.lineTo(ox + x * S, yy);
        }
        ctx.stroke();
      }
      // Ponti di legno
      for (const bx of E.BRIDGES) {
        const x0 = ox + (bx - 1.1) * S;
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(x0, ry - S * 0.25, S * 2.2, S * 2.5);
        ctx.strokeStyle = '#6b4320';
        ctx.lineWidth = Math.max(1, S * 0.05);
        for (let k = 0; k < 6; k++) {
          const yy = ry - S * 0.25 + (k + 0.5) * (S * 2.5 / 6);
          ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + S * 2.2, yy); ctx.stroke();
        }
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(x0 - S * 0.1, ry - S * 0.25, S * 0.2, S * 2.5);
        ctx.fillRect(x0 + S * 2.1, ry - S * 0.25, S * 0.2, S * 2.5);
      }
    }

    function ruin(r) {
      const x = px(r.x), y = py(r.y), R = r.r * S;
      ctx.fillStyle = 'rgba(80,70,60,0.55)';
      ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#9b9384';
      for (let i = 0; i < 6; i++) {
        const a = i * 1.1, d = R * (0.2 + (i % 3) * 0.2);
        ctx.fillRect(x + Math.cos(a) * d - R * 0.15, y + Math.sin(a) * d - R * 0.1, R * 0.3, R * 0.2);
      }
    }

    // Tempio greco: basamento, colonne, frontone col colore della squadra
    function temple(e) {
      const x = px(e.x), y = py(e.y), R = e.r * S;
      const king = e.tower === 'king';
      const w = R * 1.9, h = R * 1.7;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(x, y + h * 0.42, w * 0.6, R * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#e9e2d0';
      ctx.fillRect(x - w / 2, y + h * 0.25, w, h * 0.2);
      ctx.fillStyle = '#d8cfb8';
      ctx.fillRect(x - w / 2 + w * 0.04, y + h * 0.18, w * 0.92, h * 0.09);
      const cols = king ? 5 : 4;
      for (let i = 0; i < cols; i++) {
        const cx = x - w * 0.4 + (i * w * 0.8) / (cols - 1);
        ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#f6f1e4';
        ctx.fillRect(cx - w * 0.05, y - h * 0.25, w * 0.1, h * 0.45);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(cx + w * 0.01, y - h * 0.25, w * 0.04, h * 0.45);
      }
      ctx.fillStyle = '#efe8d6';
      ctx.fillRect(x - w / 2, y - h * 0.33, w, h * 0.09);
      ctx.fillStyle = TEAM[side(e.owner)];
      ctx.beginPath();
      ctx.moveTo(x - w * 0.55, y - h * 0.33);
      ctx.lineTo(x + w * 0.55, y - h * 0.33);
      ctx.lineTo(x, y - h * 0.62);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = TEAM_DARK[side(e.owner)]; ctx.lineWidth = Math.max(1, S * 0.08); ctx.stroke();
      if (king) {
        // La corona sta nel frontone; è sbiadita finché il Re dorme
        ctx.font = `${Math.round(R * 0.55)}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = e.active ? 1 : 0.55;
        ctx.fillText('👑', x, y - h * 0.43);
        ctx.globalAlpha = 1;
      }
      if (e.stun > 0) stars(x, y - h * 0.5, R * 0.6);
      bar(x, y + h * 0.62, w * 0.9, e, true);
    }

    function bar(x, y, w, e, showNum) {
      const h = Math.max(4, S * 0.22);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = TEAM[side(e.owner)];
      ctx.fillRect(x - w / 2, y, w * Math.max(0, e.hp / e.max), h);
      if (showNum) {
        ctx.font = `bold ${Math.round(Math.max(9, S * 0.42))}px system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeText(Math.ceil(e.hp), x, y + h + 1);
        ctx.fillStyle = '#fff';
        ctx.fillText(Math.ceil(e.hp), x, y + h + 1);
      }
    }

    function stars(x, y, size) {
      ctx.font = `${Math.round(size)}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💫', x, y);
    }

    function unit(e, t) {
      const d = D.BY_KEY[e.key] || {};
      const x = px(e.x);
      const lift = e.flying ? S * 0.9 : 0;
      const bob = e.deploy > 0 || e.stun > 0 ? 0 : Math.sin(t * 8 + e.id) * S * 0.05;
      const y = py(e.y) - lift + bob;
      const R = e.r * S;
      // ombra
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(x, py(e.y) + R * 0.5, R * 0.9, R * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = e.deploy > 0 ? 0.55 : 1;
      // base col colore della squadra
      ctx.fillStyle = TEAM[side(e.owner)];
      ctx.beginPath(); ctx.arc(x, y, R * 0.95, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = e.flash > 0 ? '#fff' : TEAM_DARK[side(e.owner)];
      ctx.lineWidth = Math.max(1.5, S * 0.08); ctx.stroke();
      if (d.wings) {
        ctx.fillStyle = '#ffffff';
        for (const sgn of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(x + sgn * R * 1.05, y - R * 0.3 + Math.sin(t * 12) * R * 0.15, R * 0.55, R * 0.25, sgn * -0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (e.charging) { ctx.strokeStyle = '#ffe066'; ctx.lineWidth = S * 0.12; ctx.beginPath(); ctx.arc(x, y, R * 1.15, 0, Math.PI * 2); ctx.stroke(); }
      ctx.font = `${Math.round(R * 1.35)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(d.emoji || '?', x, y + R * 0.05);
      if (d.heads && e.heads > 1) {
        ctx.font = `bold ${Math.round(S * 0.45)}px system-ui`;
        ctx.fillStyle = '#fff';
        ctx.fillText('×' + e.heads, x + R, y - R);
      }
      ctx.globalAlpha = 1;
      if (e.stun > 0) { ctx.fillStyle = 'rgba(160,160,160,0.45)'; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill(); stars(x, y - R * 1.2, R * 0.9); }
      if (e.deploy > 0) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.5, S * 0.07);
        ctx.beginPath(); ctx.arc(x, y, R * 1.2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - Math.min(1, e.deploy))); ctx.stroke();
      }
      if (e.hp < e.max || e.cat === 'building') bar(x, y - R * 1.45, Math.max(S * 0.9, R * 1.8), e, false);
    }

    function shot(sh) {
      const x = px(sh.x), y = py(sh.y);
      const colors = { freccia: '#5b3a1a', pietra: '#6b6b6b', dardo: '#3b2a1a', nota: '#ff7ad9', sguardo: '#4ade80', fiamma: '#ff7b1a' };
      ctx.fillStyle = colors[sh.shot] || '#333';
      ctx.beginPath(); ctx.arc(x, y, S * (sh.shot === 'dardo' || sh.shot === 'fiamma' ? 0.22 : 0.14), 0, Math.PI * 2); ctx.fill();
    }

    function effect(f, t) {
      const k = Math.min(1, (t - f.t0) / f.dur);
      const x = px(f.x), y = py(f.y);
      ctx.save();
      switch (f.type) {
        case 'cast': {   // area dell'incantesimo in arrivo
          ctx.globalAlpha = 0.35 * (1 - k);
          ctx.fillStyle = f.key === 'fuoco' ? '#ff7b1a' : f.key === 'fulmine' ? '#fff27a' : '#a5d8ff';
          ctx.beginPath(); ctx.arc(x, y, (f.r || 2) * S, 0, Math.PI * 2); ctx.fill();
          if (f.key === 'fuoco') {   // la palla di fuoco cade dal cielo
            ctx.globalAlpha = 1;
            ctx.font = `${Math.round(S * 1.6)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('🔥', x, y - (1 - k) * S * 8);
          }
          break;
        }
        case 'boom':
          ctx.globalAlpha = 0.7 * (1 - k);
          ctx.fillStyle = f.key === 'fuoco' ? '#ff9d2e' : '#bfe3ff';
          ctx.beginPath(); ctx.arc(x, y, f.r * S * (0.6 + 0.4 * k), 0, Math.PI * 2); ctx.fill();
          if (f.key === 'lancia') {
            ctx.globalAlpha = 1 - k;
            ctx.font = `${Math.round(S * 1.4)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('🦉', x, y);
          }
          break;
        case 'bolt':
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = '#fff27a'; ctx.lineWidth = S * 0.25;
          ctx.beginPath(); ctx.moveTo(x, y - S * 10);
          for (let i = 1; i <= 5; i++) ctx.lineTo(x + (i % 2 ? 1 : -1) * S * 0.5, y - S * 10 + i * S * 2);
          ctx.stroke();
          break;
        case 'splash':
          ctx.globalAlpha = 0.5 * (1 - k);
          ctx.strokeStyle = '#fff'; ctx.lineWidth = S * 0.12;
          ctx.beginPath(); ctx.arc(x, y, f.r * S * (0.5 + 0.5 * k), 0, Math.PI * 2); ctx.stroke();
          break;
        case 'heal':
          ctx.globalAlpha = 0.4 * (1 - k);
          ctx.strokeStyle = '#86efac'; ctx.lineWidth = S * 0.15;
          ctx.beginPath(); ctx.arc(x, y, f.r * S * k, 0, Math.PI * 2); ctx.stroke();
          break;
        case 'slash':
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = '#fff'; ctx.lineWidth = S * 0.1;
          ctx.beginPath(); ctx.moveTo(x - S * 0.4, y - S * 0.4); ctx.lineTo(x + S * 0.4, y + S * 0.4); ctx.stroke();
          break;
        case 'charge':
          ctx.globalAlpha = 1 - k;
          ctx.font = `${Math.round(S)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('💥', x, y);
          break;
        case 'poof':
          ctx.globalAlpha = 0.6 * (1 - k);
          ctx.fillStyle = '#ddd';
          for (let i = 0; i < 5; i++) {
            const a = i * 1.26;
            ctx.beginPath(); ctx.arc(x + Math.cos(a) * S * f.r * k * 1.5, y + Math.sin(a) * S * f.r * k * 1.5, S * 0.25 * (1 - k * 0.5), 0, Math.PI * 2); ctx.fill();
          }
          break;
      }
      ctx.restore();
    }

    // Zona dove si può mettere la carta scelta (il resto viene scurito)
    function placeZone(state, me, key) {
      const d = D.BY_KEY[key];
      if (!d || d.type === 'spell') return;
      ctx.fillStyle = 'rgba(180,30,30,0.28)';
      for (let y = 0; y < E.H; y++) {
        for (let x = 0; x < E.W; x++) {
          if (!E.canPlace(state, me, key, x + 0.5, y + 0.5)) ctx.fillRect(px(flip ? x + 1 : x), py(flip ? y + 1 : y), S + 0.5, S + 0.5);
        }
      }
    }

    function ghost(state, me, key, gx, gy) {
      const d = D.BY_KEY[key];
      if (!d) return;
      let x = gx, y = gy;
      if (d.type !== 'spell') { x = Math.floor(x) + 0.5; y = Math.floor(y) + 0.5; }
      const ok = E.canPlace(state, me, key, x, y);
      const R = (d.type === 'spell' ? d.radius : (D.BY_KEY[d.unit || key].radius || 0.5) + ((d.count || 1) > 1 ? 0.6 : 0)) * S;
      ctx.fillStyle = ok ? 'rgba(255,255,255,0.35)' : 'rgba(255,60,60,0.35)';
      ctx.strokeStyle = ok ? '#fff' : '#ff6b6b';
      ctx.lineWidth = Math.max(1.5, S * 0.08);
      ctx.beginPath(); ctx.arc(px(x), py(y), R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 0.8;
      ctx.font = `${Math.round(S * 1.1)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(d.emoji, px(x), py(y));
      ctx.globalAlpha = 1;
    }

    // Disegna tutto. ui: { me, dragKey, gx, gy }
    function draw(state, ui) {
      ground(state);
      if (!state) return;
      if (ui && ui.dragKey) placeZone(state, ui.me, ui.dragKey);
      for (const r of state.ruins) ruin(r);
      const t = state.t;
      // Prima chi sta "più in alto" sullo schermo, così chi è davanti copre chi è dietro
      const list = state.ents.slice().sort((a, b) => (flip ? b.y - a.y : a.y - b.y) + (a.flying ? 100 : 0) - (b.flying ? 100 : 0));
      for (const e of list) {
        if (e.cat === 'tower') temple(e); else if (e.cat === 'building') building(e); else unit(e, t);
      }
      for (const sh of state.shots) shot(sh);
      for (const f of state.fx) effect(f, t);
      if (ui && ui.dragKey && ui.gx != null) ghost(state, ui.me, ui.dragKey, ui.gx, ui.gy);
    }

    function building(e) {
      const d = D.BY_KEY[e.key];
      const x = px(e.x), y = py(e.y), R = e.r * S;
      ctx.globalAlpha = e.deploy > 0 ? 0.55 : 1;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(x, y + R * 0.6, R, R * 0.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = e.flash > 0 ? '#fff' : '#a07a4f';
      ctx.fillRect(x - R * 0.9, y - R * 0.2, R * 1.8, R * 0.8);
      ctx.fillStyle = TEAM[side(e.owner)];
      ctx.fillRect(x - R * 0.9, y + R * 0.45, R * 1.8, R * 0.15);
      ctx.font = `${Math.round(R * 1.6)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(d.emoji, x, y - R * 0.3);
      ctx.globalAlpha = 1;
      if (e.stun > 0) stars(x, y - R, R * 0.8);
      bar(x, y - R * 1.3, R * 1.8, e, false);
    }

    return {
      resize, draw, toGame,
      setFlip(f) { flip = f; },
      setArena(i) { arena = D.ARENAS[i] || D.ARENAS[0]; },
    };
  }

  root.Render = { create, TEAM };
})(typeof self !== 'undefined' ? self : this);
