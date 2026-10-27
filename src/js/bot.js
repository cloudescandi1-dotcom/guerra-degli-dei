// Il computer avversario: guarda il campo e decide quale carta giocare e dove.
// Non bara: usa la stessa mano e la stessa ambrosia di un giocatore vero.
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const D = isNode ? require('./cards.js') : root.GameData;
  const E = isNode ? require('./engine.js') : root.Engine;

  // reaction: secondi tra una decisione e l'altra; noise: imprecisione nel piazzare;
  // attackAt: ambrosia a cui parte all'attacco; skip: probabilità di distrarsi
  const LEVELS = {
    facile: { reaction: 2.2, noise: 2.5, attackAt: 10, skip: 0.35, defend: 0.55 },
    medio: { reaction: 1.2, noise: 1.2, attackAt: 8.5, skip: 0.12, defend: 0.85 },
    difficile: { reaction: 0.6, noise: 0.4, attackAt: 7, skip: 0, defend: 1 },
  };

  function createBot(level, seed) {
    const cfg = LEVELS[level] || LEVELS.medio;
    const rng = E.makeRng(seed || 7);
    let wait = 2 + rng() * 2;

    // Dal punto di vista del bot: "avanti" verso il nemico
    function think(s, p, dt) {
      wait -= dt;
      if (wait > 0 || s.over) return null;
      wait = cfg.reaction * (0.7 + rng() * 0.6);
      if (rng() < cfg.skip) return null;

      const me = s.players[p];
      const mySide = (y) => (p === 1 ? y < 16 : y > 16);
      const hand = me.hand.map((key, slot) => ({ key, slot, d: D.BY_KEY[key] })).filter((c) => c.d.cost <= me.amb);
      if (!hand.length) return null;

      const enemies = s.ents.filter((e) => e.owner !== p && e.cat === 'unit');
      const threats = enemies.filter((e) => mySide(e.y) || (p === 1 ? e.y < 21 : e.y > 11));
      const myTowers = s.ents.filter((e) => e.owner === p && e.cat === 'tower');
      const enemyTowers = s.ents.filter((e) => e.owner !== p && e.cat === 'tower');
      const noise = () => (rng() - 0.5) * cfg.noise;

      // 1) Colpo finale: un incantesimo che abbatte un tempio quasi distrutto
      for (const c of hand) {
        if (c.d.type !== 'spell') continue;
        const lvl = me.levels[c.key] || 1;
        const dmg = c.d.dmg * D.levelMul(lvl) * 0.35;
        const t = enemyTowers.find((e) => e.hp <= dmg);
        if (t) return { slot: c.slot, x: t.x, y: t.y };
      }

      // 2) Difesa
      if (threats.length && rng() < cfg.defend) {
        const power = threats.reduce((a, e) => a + e.max, 0);
        const flyers = threats.filter((e) => e.flying).length;
        const swarm = threats.length >= 3 && threats.every((e) => e.max < 700);
        const cx = threats.reduce((a, e) => a + e.x, 0) / threats.length;
        const cy = threats.reduce((a, e) => a + e.y, 0) / threats.length;
        const near = (e) => threats.filter((o) => Math.hypot(o.x - e.x, o.y - e.y) < 2.5);

        let choice = null, best = -1;
        for (const c of hand) {
          let score = 0;
          if (c.d.type === 'spell') {
            const cluster = threats.reduce((m, e) => (near(e).length > near(m).length ? e : m), threats[0]);
            const hits = near(cluster).length;
            if (hits >= 3 || (c.d.dmg * D.levelMul(me.levels[c.key] || 1) > 400 && hits >= 2)) score = 3 + hits;
            if (score) { choice = choice && best >= score ? choice : { c, x: cluster.x, y: cluster.y }; best = Math.max(best, score); }
            continue;
          }
          const u = D.BY_KEY[c.d.unit || c.key];
          if (u.targets === 'buildings') continue;              // il Ciclope non difende
          if (flyers && !u.hitsAir && flyers === threats.length) continue;
          score = 1;
          if (flyers && u.hitsAir) score += 2;
          if (swarm && (u.splash || (c.d.count || 1) >= 3)) score += 2;
          if (power > 2000 && (u.dmg * (c.d.count || 1)) / (u.hitSpeed || 1) > 200) score += 2;
          if (c.d.type === 'building') score += 1;
          score -= c.d.cost * 0.15;                          // risparmia ambrosia
          if (score > best) {
            best = score;
            // Davanti alla propria torre, tra lei e il nemico
            const tower = myTowers.reduce((m, t) => (Math.hypot(t.x - cx, t.y - cy) < Math.hypot(m.x - cx, m.y - cy) ? t : m), myTowers[0]);
            let x = (tower.x + cx) / 2, y = (tower.y + cy) / 2;
            if (c.d.type === 'building') { x = 9; y = p === 1 ? 9 : 23; }
            choice = { c, x, y };
          }
        }
        if (choice) return clampPlace(s, p, choice.c, choice.x + noise(), choice.y + noise());
      }

      // 3) Attacco: aspetta di avere abbastanza ambrosia
      if (me.amb < cfg.attackAt) return null;
      const troops = hand.filter((c) => c.d.type === 'troop');
      if (!troops.length) return null;
      // Scegli il lato col tempio nemico più debole
      const lanes = [3.5, 14.5];
      const laneHp = lanes.map((lx) => {
        const t = enemyTowers.find((e) => e.tower === 'princess' && Math.abs(e.x - lx) < 1);
        return t ? t.hp : 0;
      });
      const lane = laneHp[0] === laneHp[1] ? lanes[Math.floor(rng() * 2)] : lanes[laneHp[0] < laneHp[1] ? 0 : 1];
      // Prima il più resistente, messo dietro così le altre truppe lo seguono
      troops.sort((a, b) => D.BY_KEY[b.d.unit || b.key].hp - D.BY_KEY[a.d.unit || a.key].hp);
      const c = troops[0];
      const u = D.BY_KEY[c.d.unit || c.key];
      const back = u.hp >= 1500;
      const y = p === 1 ? (back ? 3.5 : 13.5) : (back ? 28.5 : 18.5);
      return clampPlace(s, p, c, lane + noise() * 0.5, y + noise() * 0.5);
    }

    return { think };
  }

  function clampPlace(s, p, c, x, y) {
    x = Math.min(17.4, Math.max(0.6, x));
    if (c.d.type !== 'spell') y = p === 1 ? Math.min(14.5, Math.max(0.6, y)) : Math.max(17.5, Math.min(31.4, y));
    return { slot: c.slot, x, y };
  }

  const api = { createBot, LEVELS };
  if (isNode) module.exports = api;
  else root.Bot = api;
})(typeof self !== 'undefined' ? self : this);
