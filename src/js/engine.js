// Motore della battaglia: simula il campo (truppe, torri, incantesimi) a piccoli passi di tempo.
// Non disegna niente: la grafica legge lo "stato" e lo mostra.
// Giocatore 0 = in basso (blu), giocatore 1 = in alto (rosso).
(function (root) {
  'use strict';
  const D = (typeof module !== 'undefined' && module.exports) ? require('./cards.js') : root.GameData;

  const W = 18, H = 32;
  const RIVER_TOP = 15, RIVER_BOTTOM = 17, MID = 16;
  const BRIDGES = [3.5, 14.5];
  const TICK = 1 / 20;            // 20 passi al secondo
  const SIGHT = 5.5;              // distanza a cui una truppa "vede" i nemici
  const SPELL_TOWER = 0.35;       // gli incantesimi fanno meno danno alle torri
  const AMB_MAX = 10, AMB_RATE = 1 / 2.8;
  const DEPLOY = 1;               // secondi prima che una truppa appena messa si muova

  // Numeri casuali "ripetibili" (stesso seme = stessa partita): utile per i test e per l'online
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const sideOf = (y) => (y < MID ? 1 : 0);   // metà campo: 1 = sopra, 0 = sotto

  // opts: { decks: [[8 chiavi], [8 chiavi]], levels: [{chiave: livello}, ...], towerLevels: [n, n],
  //         seed, duration (s), overtime (s) }
  function createMatch(opts) {
    const rng = makeRng(opts.seed || 1);
    const s = {
      t: 0, over: false, winner: null, crowns: [0, 0],
      duration: opts.duration || 180, overtime: opts.overtime || 120, inOvertime: false,
      players: [], ents: [], shots: [], spells: [], fx: [], ruins: [], events: [],
      nextId: 1, rng,
    };
    for (let p = 0; p < 2; p++) {
      const deck = opts.decks[p].slice();
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      s.players.push({ amb: 5, hand: deck.slice(0, 4), queue: deck.slice(4), levels: (opts.levels && opts.levels[p]) || {} });
    }
    for (let p = 0; p < 2; p++) {
      const lvl = (opts.towerLevels && opts.towerLevels[p]) || 1;
      const yK = p === 0 ? 28.8 : 3.2, yP = p === 0 ? 25.5 : 6.5;
      addTower(s, p, 'king', 9, yK, lvl);
      addTower(s, p, 'princess', 3.5, yP, lvl);
      addTower(s, p, 'princess', 14.5, yP, lvl);
    }
    return s;
  }

  function addTower(s, owner, kind, x, y, lvl) {
    const d = D.TOWERS[kind], m = D.levelMul(lvl);
    s.ents.push({
      id: s.nextId++, cat: 'tower', tower: kind, owner, key: kind, x, y, r: d.radius,
      hp: Math.round(d.hp * m), max: Math.round(d.hp * m), dmg: Math.round(d.dmg * m),
      hitSpeed: d.hitSpeed, range: d.range, hitsAir: true, shot: d.shot,
      active: kind !== 'king', cooldown: 0, stun: 0, flash: 0, level: lvl,
    });
  }

  function spawnUnit(s, owner, key, x, y, level, deploy) {
    const d = D.BY_KEY[key], m = D.levelMul(level);
    const e = {
      id: s.nextId++, cat: d.type === 'building' ? 'building' : 'unit', owner, key, x, y,
      r: d.radius || 0.5, hp: Math.round(d.hp * m), max: Math.round(d.hp * m),
      dmg: Math.round((d.dmg || 0) * m), hitSpeed: d.hitSpeed || 1, range: d.range || 0,
      speed: d.speed || 0, flying: !!d.flying, hitsAir: !!d.hitsAir, targets: d.targets || 'any',
      splash: d.splash || 0, shot: d.shot, level,
      deploy: deploy == null ? DEPLOY : deploy, cooldown: 0, stun: 0, flash: 0,
      targetId: 0, locked: false, run: 0, charging: false, healT: 0, heads: 1, life: d.lifetime || 0,
    };
    s.ents.push(e);
    return e;
  }

  // Dove può mettere una carta il giocatore p?
  function canPlace(s, p, key, x, y) {
    const d = D.BY_KEY[key];
    if (!d || x < 0 || x > W || y < 0 || y > H) return false;
    if (d.type === 'spell') return true;
    if (x < 0.5 || x > W - 0.5 || y < 0.5 || y > H - 0.5) return false;
    const own = p === 0 ? y >= RIVER_BOTTOM : y <= RIVER_TOP;
    if (own) return true;
    if (d.type === 'building') return false;
    // Se hai abbattuto il tempio laterale nemico, puoi mettere truppe anche in quella zona
    const left = x < W / 2;
    const fallen = !s.ents.some((e) => e.cat === 'tower' && e.tower === 'princess' && e.owner !== p && (e.x < W / 2) === left);
    if (!fallen) return false;
    return p === 0 ? y >= 11 : y <= 21;
  }

  // Le coordinate si allineano al centro della casella
  const snap = (v) => Math.floor(v) + 0.5;

  // Gioca la carta in posizione `slot` della mano. Restituisce true se è andata.
  function play(s, p, slot, x, y) {
    if (s.over) return false;
    const pl = s.players[p];
    const key = pl.hand[slot];
    const d = D.BY_KEY[key];
    if (!d || pl.amb < d.cost) return false;
    if (d.type !== 'spell') { x = snap(Math.min(W - 0.01, Math.max(0, x))); y = snap(Math.min(H - 0.01, Math.max(0, y))); }
    if (!canPlace(s, p, key, x, y)) return false;
    pl.amb -= d.cost;
    pl.hand[slot] = pl.queue.shift();
    pl.queue.push(key);
    const level = pl.levels[key] || 1;
    s.events.push({ type: 'play', owner: p, key, x, y });

    if (d.type === 'spell') {
      s.spells.push({ key, owner: p, x, y, level, delay: d.delay || 0, strikes: d.strikes || 1, targets: null, t0: s.t });
      s.fx.push({ type: 'cast', key, owner: p, x, y, t0: s.t, dur: (d.delay || 0) + 0.5, r: d.radius });
      return true;
    }
    const unitKey = d.unit || key;
    const n = d.count || 1;
    for (let i = 0; i < n; i++) {
      // Le truppe di gruppo si dispongono in cerchio
      const a = (i / n) * Math.PI * 2 + (p ? Math.PI : 0);
      const rr = n === 1 ? 0 : 0.35 + 0.12 * n;
      spawnUnit(s, p, unitKey, x + Math.cos(a) * rr, y + Math.sin(a) * rr, level);
    }
    return true;
  }

  function canHit(a, b) {
    if (b.hp <= 0 || b.owner === a.owner) return false;
    if (b.flying && !a.hitsAir) return false;
    if (a.targets === 'buildings' && b.cat === 'unit') return false;
    return true;
  }
  const gap = (a, b) => dist(a, b) - a.r - b.r;
  const inRange = (a, b, extra) => gap(a, b) <= a.range + (extra || 0);

  function findTarget(s, u) {
    let best = null, bestD = Infinity;
    // Il canto delle Sirene: i nemici vicini attaccano prima loro
    if (u.cat === 'unit') {
      for (const e of s.ents) {
        if (e.key !== 'sirene' || !canHit(u, e) || e.deploy > 0) continue;
        const d = dist(u, e);
        if (d <= D.BY_KEY.sirene.taunt && d < bestD) { best = e; bestD = d; }
      }
      if (best) return best;
    }
    if (u.cat !== 'unit') {
      // Torri e costruzioni non si muovono: solo chi è a tiro
      for (const e of s.ents) {
        if (!canHit(u, e) || !inRange(u, e)) continue;
        const d = dist(u, e);
        if (d < bestD) { best = e; bestD = d; }
      }
      return best;
    }
    if (u.targets !== 'buildings') {
      for (const e of s.ents) {
        if (!canHit(u, e)) continue;
        const d = gap(u, e);
        if (d <= SIGHT && d < bestD) { best = e; bestD = d; }
      }
      if (best) return best;
    }
    // Nessuno vicino: si va verso la costruzione nemica più vicina
    for (const e of s.ents) {
      if (e.owner === u.owner || e.hp <= 0 || e.cat === 'unit') continue;
      const d = dist(u, e);
      if (d < bestD) { best = e; bestD = d; }
    }
    return best;
  }

  // Muove una truppa verso (tx, ty). Chi cammina deve passare dai ponti.
  function moveToward(u, tx, ty, step) {
    let gx = tx, gy = ty;
    if (!u.flying && sideOf(u.y) !== sideOf(ty)) {
      const b = BRIDGES.reduce((best, bx) =>
        (Math.abs(u.x - bx) + Math.abs(tx - bx) < Math.abs(u.x - best) + Math.abs(tx - best) ? bx : best));
      const inRiver = u.y > RIVER_TOP - 0.2 && u.y < RIVER_BOTTOM + 0.2;
      if (Math.abs(u.x - b) > 0.5 && !inRiver) {
        gx = b; gy = sideOf(u.y) === 0 ? RIVER_BOTTOM + 0.3 : RIVER_TOP - 0.3;
      } else {
        gx = b; gy = sideOf(u.y) === 0 ? RIVER_TOP - 0.6 : RIVER_BOTTOM + 0.6;
      }
    }
    const dx = gx - u.x, dy = gy - u.y, d = Math.hypot(dx, dy);
    if (d < 1e-6) return 0;
    const k = Math.min(step, d) / d;
    u.x += dx * k; u.y += dy * k;
    return Math.min(step, d);
  }

  function damage(s, e, amount, ranged) {
    if (e.hp <= 0) return;
    if (ranged && D.BY_KEY[e.key] && D.BY_KEY[e.key].shield) amount *= 0.5;
    e.hp -= amount;
    e.flash = 0.12;
    // Il Re si sveglia quando viene colpito
    if (e.cat === 'tower' && e.tower === 'king') e.active = true;
  }

  // Applica un colpo: al bersaglio e, se c'è, a chi gli sta intorno
  function hit(s, src, target, amount, ranged) {
    if (src.splash) {
      for (const e of s.ents) {
        if (e.owner === src.owner || e.hp <= 0) continue;
        if (e.flying && !src.hitsAir) continue;
        if (dist(e, target) <= src.splash + e.r) damage(s, e, amount, ranged);
      }
      s.fx.push({ type: 'splash', x: target.x, y: target.y, r: src.splash, t0: s.t, dur: 0.3, owner: src.owner });
    } else {
      damage(s, target, amount, ranged);
    }
    if (src.stunOnHit && target.cat === 'unit') target.stun = Math.max(target.stun, src.stunOnHit);
  }

  function attack(s, u, t) {
    const d = D.BY_KEY[u.key] || {};
    let amount = u.dmg;
    if (u.charging) { amount *= 2; s.fx.push({ type: 'charge', x: t.x, y: t.y, t0: s.t, dur: 0.4 }); }
    if (d.heads) amount *= u.heads;
    u.charging = false; u.run = 0;
    const src = { owner: u.owner, splash: u.splash, hitsAir: u.hitsAir, stunOnHit: d.stunOnHit || 0 };
    let targets = [t];
    if (d.multi) {
      targets = s.ents.filter((e) => canHit(u, e) && inRange(u, e))
        .sort((a, b) => dist(u, a) - dist(u, b)).slice(0, d.multi);
      if (!targets.includes(t)) targets[targets.length ? targets.length - 1 : 0] = t;
    }
    for (const tg of targets) {
      if (u.range > 2 || u.cat === 'tower') {
        s.shots.push({ x: u.x, y: u.y - (u.cat === 'tower' ? 0.8 : 0), targetId: tg.id, tx: tg.x, ty: tg.y,
          speed: 12, amount, src, owner: u.owner, shot: u.shot || 'freccia' });
      } else {
        hit(s, src, tg, amount, false);
        s.fx.push({ type: 'slash', x: tg.x, y: tg.y, t0: s.t, dur: 0.2, owner: u.owner });
      }
    }
  }

  function updateEnt(s, u, dt) {
    if (u.flash > 0) u.flash -= dt;
    if (u.deploy > 0) { u.deploy -= dt; return; }
    if (u.life) {   // le costruzioni si consumano col tempo
      u.hp -= (u.max / u.life) * dt;
      if (u.hp <= 0) return;
    }
    if (u.stun > 0) { u.stun -= dt; u.charging = false; u.run = 0; return; }
    if (u.cat === 'tower' && !u.active) return;
    const d = D.BY_KEY[u.key] || {};

    if (d.heal) {
      u.healT -= dt;
      if (u.healT <= 0) {
        u.healT = d.heal.every;
        const amt = d.heal.amount * D.levelMul(u.level);
        for (const e of s.ents) {
          if (e.owner === u.owner && e.cat === 'unit' && e.hp > 0 && dist(e, u) <= d.heal.radius) e.hp = Math.min(e.max, e.hp + amt);
        }
        s.fx.push({ type: 'heal', x: u.x, y: u.y, r: d.heal.radius, t0: s.t, dur: 0.6 });
      }
    }
    if (d.heads) u.heads = 1 + Math.min(3, Math.floor((1 - u.hp / u.max) * 4));
    if (u.cooldown > 0) u.cooldown -= dt;
    if (!u.dmg) return;   // es. Cavallo di Troia: non attacca

    let t = s.ents.find((e) => e.id === u.targetId);
    if (!t || !canHit(u, t) || (u.locked && !inRange(u, t, 0.4))) { t = null; u.locked = false; }
    if (!u.locked) {
      const nt = findTarget(s, u);
      if (nt) t = nt;
      u.targetId = t ? t.id : 0;
    }
    if (!t) return;

    if (inRange(u, t)) {
      if (!u.locked) { u.locked = true; u.cooldown = Math.max(u.cooldown, u.hitSpeed * 0.35); }
      if (u.cooldown <= 0) { attack(s, u, t); u.cooldown = u.hitSpeed; }
    } else if (u.cat === 'unit') {
      u.locked = false;
      let speed = u.speed * (u.charging ? 2 : 1);
      const moved = moveToward(u, t.x, t.y, speed * dt);
      if (d.charge) { u.run += moved; if (u.run >= 2.5) u.charging = true; }
    }
  }

  // Le truppe non si sovrappongono, non entrano nelle torri e non attraversano il fiume
  function separate(s) {
    const units = s.ents.filter((e) => e.cat === 'unit' && e.hp > 0);
    for (let i = 0; i < units.length; i++) {
      const a = units[i];
      for (let j = i + 1; j < units.length; j++) {
        const b = units[j];
        if (a.flying !== b.flying) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
        const over = (a.r + b.r) * 0.85 - d;
        if (over > 0) {
          const ma = a.max, mb = b.max, k = over / d;
          a.x -= dx * k * (mb / (ma + mb)); a.y -= dy * k * (mb / (ma + mb));
          b.x += dx * k * (ma / (ma + mb)); b.y += dy * k * (ma / (ma + mb));
        }
      }
      if (!a.flying) {
        for (const o of s.ents) {
          if (o.cat === 'unit' || o.hp <= 0) continue;
          const dx = a.x - o.x, dy = a.y - o.y, d = Math.hypot(dx, dy) || 0.01;
          const min = a.r + o.r * 0.9;
          if (d < min) { a.x = o.x + (dx / d) * min; a.y = o.y + (dy / d) * min; }
        }
        if (a.y > RIVER_TOP && a.y < RIVER_BOTTOM) {
          const b = BRIDGES.reduce((best, bx) => (Math.abs(a.x - bx) < Math.abs(a.x - best) ? bx : best));
          if (Math.abs(a.x - b) > 1) a.x = b + Math.sign(a.x - b) * 1;
        }
      }
      a.x = Math.min(W - 0.4, Math.max(0.4, a.x));
      a.y = Math.min(H - 0.4, Math.max(0.4, a.y));
    }
  }

  function updateShots(s, dt) {
    for (const sh of s.shots) {
      const t = s.ents.find((e) => e.id === sh.targetId && e.hp > 0);
      if (t) { sh.tx = t.x; sh.ty = t.y; }
      const dx = sh.tx - sh.x, dy = sh.ty - sh.y, d = Math.hypot(dx, dy);
      const step = sh.speed * dt;
      if (d <= step + 0.2) {
        sh.done = true;
        if (t) hit(s, sh.src, t, sh.amount, true);
        else if (sh.src.splash) hit(s, sh.src, { x: sh.tx, y: sh.ty }, sh.amount, true);
      } else { sh.x += (dx / d) * step; sh.y += (dy / d) * step; }
    }
    s.shots = s.shots.filter((sh) => !sh.done);
  }

  function updateSpells(s, dt) {
    for (const sp of s.spells) {
      sp.delay -= dt;
      if (sp.delay > 0) continue;
      const d = D.BY_KEY[sp.key], m = D.levelMul(sp.level);
      const amount = d.dmg * m;
      const victims = s.ents.filter((e) => e.owner !== sp.owner && e.hp > 0 && dist(e, sp) <= d.radius + e.r);
      if (d.strikes) {
        // Fulmine: colpisce uno alla volta i nemici con più vita
        if (!sp.targets) sp.targets = victims.sort((a, b) => b.hp - a.hp).slice(0, d.strikes).map((e) => e.id);
        const id = sp.targets.shift();
        const e = s.ents.find((x) => x.id === id && x.hp > 0);
        if (e) {
          damage(s, e, e.cat === 'tower' ? amount * SPELL_TOWER : amount, false);
          if (d.stun) e.stun = Math.max(e.stun, d.stun);
          s.fx.push({ type: 'bolt', x: e.x, y: e.y, t0: s.t, dur: 0.35 });
        }
        if (sp.targets.length) { sp.delay = 0.25; continue; }
      } else {
        for (const e of victims) {
          damage(s, e, e.cat === 'tower' ? amount * SPELL_TOWER : amount, false);
          if (d.stun) e.stun = Math.max(e.stun, d.stun);
        }
        s.fx.push({ type: 'boom', key: sp.key, x: sp.x, y: sp.y, r: d.radius, t0: s.t, dur: 0.5 });
      }
      sp.done = true;
    }
    s.spells = s.spells.filter((sp) => !sp.done);
  }

  function removeDead(s) {
    const dead = s.ents.filter((e) => e.hp <= 0);
    if (!dead.length) return;
    s.ents = s.ents.filter((e) => e.hp > 0);
    for (const e of dead) {
      s.fx.push({ type: 'poof', x: e.x, y: e.y, r: e.r, t0: s.t, dur: 0.5 });
      const d = D.BY_KEY[e.key];
      if (d && d.spawnOnDeath) {
        for (let i = 0; i < d.spawnOnDeath.count; i++) {
          const a = (i / d.spawnOnDeath.count) * Math.PI * 2;
          spawnUnit(s, e.owner, d.spawnOnDeath.key, e.x + Math.cos(a) * 0.7, e.y + Math.sin(a) * 0.7, e.level, 0.3);
        }
      }
      if (e.cat !== 'tower') continue;
      const enemy = 1 - e.owner;
      s.ruins.push({ x: e.x, y: e.y, r: e.r, owner: e.owner });
      s.fx.push({ type: 'collapse', x: e.x, y: e.y, r: e.r, t0: s.t, dur: 1.4, owner: e.owner });
      s.events.push({ type: 'tower', owner: e.owner, king: e.tower === 'king' });
      if (e.tower === 'king') {
        s.crowns[enemy] = 3;
        // Crollato il Re, cade tutto
        for (const o of s.ents) if (o.owner === e.owner && o.cat === 'tower') { o.hp = 0; s.ruins.push({ x: o.x, y: o.y, r: o.r, owner: o.owner }); }
        s.ents = s.ents.filter((o) => o.hp > 0);
      } else {
        s.crowns[enemy] += 1;
        for (const o of s.ents) if (o.owner === e.owner && o.tower === 'king') o.active = true;
      }
    }
  }

  function finish(s, winner) {
    s.over = true;
    s.winner = winner;   // 0, 1, oppure -1 per il pareggio
    s.events.push({ type: 'end', winner });
  }

  function step(s, dt) {
    if (s.over) return;
    dt = dt || TICK;
    s.t += dt;
    // ultimo minuto e inizio dei supplementari: ambrosia doppia; quando mancano 1:30 alla fine dei supplementari: tripla
    const mult = s.inOvertime && s.t >= s.duration + s.overtime - 90 ? 3 : s.t >= s.duration - 60 ? 2 : 1;
    for (const pl of s.players) pl.amb = Math.min(AMB_MAX, pl.amb + AMB_RATE * mult * dt);

    for (const e of s.ents) if (e.hp > 0) updateEnt(s, e, dt);
    updateShots(s, dt);
    updateSpells(s, dt);
    separate(s);
    removeDead(s);
    s.fx = s.fx.filter((f) => s.t - f.t0 < f.dur);

    // Fine partita
    if (s.crowns[0] >= 3 || s.crowns[1] >= 3) return finish(s, s.crowns[0] >= 3 ? 0 : 1);
    if (s.inOvertime && s.crowns[0] !== s.crowns[1]) return finish(s, s.crowns[0] > s.crowns[1] ? 0 : 1);
    if (!s.inOvertime && s.t >= s.duration) {
      if (s.crowns[0] !== s.crowns[1]) return finish(s, s.crowns[0] > s.crowns[1] ? 0 : 1);
      s.inOvertime = true;
      s.events.push({ type: 'overtime' });
    }
    if (s.inOvertime && s.t >= s.duration + s.overtime) {
      // Ancora pari: vince chi ha il tempio messo peggio... dell'avversario
      const low = [0, 1].map((p) => Math.min(...s.ents.filter((e) => e.owner === p && e.cat === 'tower').map((e) => e.hp / e.max)));
      if (Math.abs(low[0] - low[1]) < 0.001) return finish(s, -1);
      return finish(s, low[0] > low[1] ? 0 : 1);
    }
  }

  function timeLeft(s) {
    return s.inOvertime ? Math.max(0, s.duration + s.overtime - s.t) : Math.max(0, s.duration - s.t);
  }

  // Versione compatta dello stato, da spedire all'amico nelle partite online
  function snapshot(s) {
    const r1 = (v) => Math.round(v * 100) / 100;
    return {
      t: r1(s.t), over: s.over, winner: s.winner, crowns: s.crowns, inOvertime: s.inOvertime, duration: s.duration, overtime: s.overtime,
      players: s.players.map((p) => ({ amb: r1(p.amb), hand: p.hand, queue: [p.queue[0]] })),
      ents: s.ents.map((e) => [e.id, e.key, e.owner, r1(e.x), r1(e.y), Math.round(e.hp), e.max, e.cat === 'tower' ? (e.tower === 'king' ? 2 : 1) : 0,
        r1(e.deploy > 0 ? e.deploy : 0), e.stun > 0 ? 1 : 0, e.flash > 0 ? 1 : 0, e.heads || 1, e.charging ? 1 : 0, r1(e.r), e.level || 1, e.active === false ? 0 : 1]),
      shots: s.shots.map((sh) => [r1(sh.x), r1(sh.y), sh.owner, sh.shot]),
      fx: s.fx.map((f) => Object.assign({}, f)),
      ruins: s.ruins,
    };
  }

  // Ricostruisce uno stato "da disegnare" a partire da una snapshot
  function fromSnapshot(sn) {
    return {
      t: sn.t, over: sn.over, winner: sn.winner, crowns: sn.crowns, inOvertime: sn.inOvertime, duration: sn.duration, overtime: sn.overtime,
      players: sn.players, ruins: sn.ruins, fx: sn.fx, events: [], spells: [],
      shots: sn.shots.map((a) => ({ x: a[0], y: a[1], owner: a[2], shot: a[3] })),
      ents: sn.ents.map((a) => ({
        id: a[0], key: a[1], owner: a[2], x: a[3], y: a[4], hp: a[5], max: a[6],
        cat: a[7] ? 'tower' : (D.BY_KEY[a[1]] && D.BY_KEY[a[1]].type === 'building' ? 'building' : 'unit'),
        tower: a[7] === 2 ? 'king' : a[7] === 1 ? 'princess' : undefined,
        deploy: a[8], stun: a[9], flash: a[10] ? 0.1 : 0, heads: a[11], charging: !!a[12], r: a[13], level: a[14] || 1, active: a[15] !== 0,
        flying: !!(D.BY_KEY[a[1]] && D.BY_KEY[a[1]].flying),
      })),
    };
  }

  const api = { W, H, RIVER_TOP, RIVER_BOTTOM, BRIDGES, TICK, AMB_MAX, createMatch, play, step, canPlace, timeLeft, snapshot, fromSnapshot, makeRng };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof self !== 'undefined' ? self : this);
