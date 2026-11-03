// Il computer avversario: guarda il campo e decide quale carta giocare e dove.
// Non bara: usa la stessa mano e la stessa ambrosia di un giocatore vero.
// Nel 2 contro 2 gioca per la sua squadra: amici e nemici si riconoscono dalla squadra (owner), non dal giocatore.
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const D = isNode ? require('./cards.js') : root.GameData;
  const E = isNode ? require('./engine.js') : root.Engine;

  // reaction: secondi tra una decisione e l'altra; noise: imprecisione nel piazzare;
  // attackAt: ambrosia a cui parte all'attacco; skip: probabilità di distrarsi
  const LEVELS = {
    // furbo: 0 = com'era prima; 1 = difesa/incantesimi/lati più intelligenti; 2 = in più aspetta la spinta
    // (il difficile pensa ogni 1.3 s: provato in 400 partite, reagire troppo spesso fa sprecare ambrosia)
    facile: { reaction: 2.2, noise: 2.5, attackAt: 10, skip: 0.35, defend: 0.55, furbo: 0 },
    medio: { reaction: 1.2, noise: 1.2, attackAt: 8.5, skip: 0.12, defend: 0.85, furbo: 1, cambia: 0.25 },
    difficile: { reaction: 1.3, noise: 0.4, attackAt: 9, skip: 0, defend: 1, furbo: 2, cambia: 0.12 },
  };

  function createBot(level, seed) {
    const cfg = LEVELS[level] || LEVELS.medio;
    const rng = E.makeRng(seed || 7);
    let wait = 2 + rng() * 2;
    let corsia = null;          // lato d'attacco scelto (x del tempio nemico)
    let cambiaTra = 0;          // secondi prima di poter cambiare lato

    // Dal punto di vista del bot: "avanti" verso il nemico
    function think(s, p, dt) {
      cambiaTra -= dt;
      wait -= dt;
      if (wait > 0 || s.over) return null;
      wait = cfg.reaction * (0.7 + rng() * 0.6);
      if (rng() < cfg.skip) return null;

      const me = s.players[p];
      const sq = E.squadra(p);   // la squadra del bot: con 2 giocatori è uguale a p
      const mySide = (y) => (sq === 1 ? y < 16 : y > 16);
      const hand = me.hand.map((key, slot) => ({ key, slot, d: D.BY_KEY[key] })).filter((c) => c.d.cost <= me.amb);
      if (!hand.length) return null;

      const enemies = s.ents.filter((e) => e.owner !== sq && e.cat === 'unit');
      const threats = enemies.filter((e) => mySide(e.y) || (sq === 1 ? e.y < 21 : e.y > 11));
      const myTowers = s.ents.filter((e) => e.owner === sq && e.cat === 'tower');
      const enemyTowers = s.ents.filter((e) => e.owner !== sq && e.cat === 'tower');
      const noise = () => (rng() - 0.5) * cfg.noise;

      if (cfg.furbo) return pensaFurbo(s, sq, me, hand, enemies, threats, myTowers, enemyTowers, mySide, noise);

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
        const near = (e) => threats.filter((o) => E.dist(o.x - e.x, o.y - e.y) < 2.5);

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
            const tower = myTowers.reduce((m, t) => (E.dist(t.x - cx, t.y - cy) < E.dist(m.x - cx, m.y - cy) ? t : m), myTowers[0]);
            let x = (tower.x + cx) / 2, y = (tower.y + cy) / 2;
            if (c.d.type === 'building') { x = 9; y = sq === 1 ? 9 : 23; }
            choice = { c, x, y };
          }
        }
        if (choice) return clampPlace(s, sq, choice.c, choice.x + noise(), choice.y + noise());
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
      const y = sq === 1 ? (back ? 3.5 : 13.5) : (back ? 28.5 : 18.5);
      return clampPlace(s, sq, c, lane + noise() * 0.5, y + noise() * 0.5);
    }

    // Valore di un nemico in ambrosia (le unità speciali senza costo valgono poco)
    function valore(e) {
      const c = D.BY_KEY[e.key];
      return c && c.cost ? c.cost / Math.max(1, c.count || 1) : 0.7;
    }

    // Il cervello di medio e difficile (p qui è la SQUADRA del bot)
    function pensaFurbo(s, p, me, hand, enemies, threats, myTowers, enemyTowers, mySide, noise) {
      const furbo = cfg.furbo;
      const finale = s.inOvertime || s.t >= s.duration - 60;   // ultimo minuto: si spende tutto

      // 1) Incantesimi: finire un tempio o colpire tanti nemici insieme
      for (const c of hand) {
        if (c.d.type !== 'spell') continue;
        const dmg = c.d.dmg * D.levelMul(me.levels[c.key] || 1);
        const t = enemyTowers.find((e) => e.hp <= dmg * 0.35);
        if (t) return { slot: c.slot, x: t.x, y: t.y };
        const r = c.d.radius || 2.5;
        let best = null, bestVal = 0;
        for (const e of enemies) {
          if (e.hp <= 0) continue;
          let val = 0, hits = 0;
          for (const o of enemies) {
            if (E.dist(o.x - e.x, o.y - e.y) > r * 0.9) continue;
            hits++;
            val += valore(o) * (o.hp <= dmg ? 1.3 : 0.8);   // meglio se li uccide
          }
          const minimo = c.d.cost * 1.1;
          // se i nemici sono nella mia metà il colpo vale di più
          if (mySide(e.y)) val *= 1.4;
          if (hits >= 2 && val >= minimo && val > bestVal) { bestVal = val; best = e; }
        }
        if (best) return { slot: c.slot, x: best.x, y: best.y };
      }

      // 2) Difesa
      if (threats.length) {
        const power = threats.reduce((a, e) => a + e.max, 0);
        // un nemico piccolo e lontano lo gestisce il tempio da solo
        const debole = furbo >= 2 && power < 450 && me.amb < 8 && !threats.some((e) => mySide(e.y) && e.y > 0 && Math.abs(e.y - 16) > 8);
        if (!debole && rng() < cfg.defend) {
          const flyers = threats.filter((e) => e.flying).length;
          const swarm = threats.length >= 3 && threats.every((e) => e.max < 700);
          const cx = threats.reduce((a, e) => a + e.x, 0) / threats.length;
          const cy = threats.reduce((a, e) => a + e.y, 0) / threats.length;
          // il tempio più vicino al pericolo
          const tower = myTowers.reduce((m, t) => (E.dist(t.x - cx, t.y - cy) < E.dist(m.x - cx, m.y - cy) ? t : m), myTowers[0]);
          let choice = null, best = -99;
          for (const c of hand) {
            if (c.d.type === 'spell') continue;                  // gli incantesimi sono già stati valutati sopra
            const u = D.BY_KEY[c.d.unit || c.key];
            if (u.targets === 'buildings') continue;            // il Ciclope non difende
            if (flyers && !u.hitsAir && flyers === threats.length) continue;
            let score = 1;
            if (flyers && u.hitsAir) score += 2.5;
            if (swarm && (u.splash || u.multi || (c.d.count || 1) >= 3)) score += 2;
            const forza = (u.dmg * (c.d.count || 1)) / (u.hitSpeed || 1);
            const resiste = u.hp * (c.d.count || 1);
            if (power > 2000) { if (forza > 200) score += 2; if (resiste > 1200) score += 1; }
            else if (resiste > 1500) score -= 0.5;               // un tank contro pochi piccoli è uno spreco
            if (c.d.type === 'building') score += 1;
            score -= c.d.cost * 0.2;                             // risparmia ambrosia
            if (score > best) {
              best = score;
              let x = (tower.x + cx) / 2, y = (tower.y + cy) / 2;
              if (c.d.type === 'building') { x = Math.abs(cx - 9) < 3 ? 9 : (cx < 9 ? 6 : 12); y = p === 1 ? 9 : 23; }
              else if (u.range > 3) { y = (tower.y * 2 + cy) / 3; }   // chi spara sta dietro
              choice = { c, x, y };
            }
          }
          if (choice) return clampPlace(s, p, choice.c, choice.x + noise(), choice.y + noise());
        }
        // sotto attacco non si parte all'attacco, a meno di essere pieni
        if (me.amb < 9.5) return null;
      }

      // 3) Attacco: si aspetta di avere abbastanza ambrosia per una spinta
      const troops = hand.filter((c) => c.d.type === 'troop');
      if (!troops.length) return null;
      const soglia = finale ? (furbo >= 2 ? 3.5 : 5.5) : cfg.attackAt;

      // Scegli la corsia: tempio nemico più debole, con qualche cambio di lato
      const lanes = [3.5, 14.5];
      const laneHp = lanes.map((lx) => {
        const t = enemyTowers.find((e) => e.tower === 'princess' && Math.abs(e.x - lx) < 1);
        return t ? t.hp : 0;
      });
      const debolePiu = laneHp[0] === laneHp[1] ? lanes[Math.floor(rng() * 2)] : lanes[laneHp[0] < laneHp[1] ? 0 : 1];
      if (corsia === null) corsia = debolePiu;
      else if (cambiaTra <= 0) {
        // a volte cambia lato (anche per sorprendere), di solito va dove il tempio è più debole
        const r = rng();
        if (r < cfg.cambia && !finale) corsia = lanes[0] === corsia ? lanes[1] : lanes[0];
        else corsia = debolePiu;
        cambiaTra = 8 + rng() * 10;
      }

      // Spinta già partita? Un nostro tank sulla corsia: arrivano i rinforzi con poca ambrosia
      if (furbo >= 2) {
        let tank = null;
        for (const e of s.ents) {
          if (e.owner !== p || e.cat !== 'unit' || e.max < 800 || Math.abs(e.x - corsia) > 4) continue;
          const davanti = p === 1 ? e.y < 20 : e.y > 12;   // non ancora oltre il fiume lontano
          if (davanti && (!tank || (p === 1 ? e.y > tank.y : e.y < tank.y))) tank = e;
        }
        if (tank && me.amb >= 3) {
          const sup = troops.filter((c) => c.d.cost <= me.amb).sort((a, b) => b.d.cost - a.d.cost)[0];
          const us = D.BY_KEY[sup.d.unit || sup.key];
          if (us.targets !== 'buildings' || me.amb >= 5) {
            const y = tank.y + (p === 1 ? -2 : 2);
            return clampPlace(s, p, sup, tank.x + noise() * 0.5, y);
          }
        }
      }

      if (me.amb < soglia) return null;
      // Prima il più resistente, messo dietro così le altre truppe lo seguono
      troops.sort((a, b) => D.BY_KEY[b.d.unit || b.key].hp * (b.d.count || 1) - D.BY_KEY[a.d.unit || a.key].hp * (a.d.count || 1));
      const c = troops[0];
      const u = D.BY_KEY[c.d.unit || c.key];
      const back = u.hp >= 1500;
      const y = p === 1 ? (back ? 3.5 : 13.5) : (back ? 28.5 : 18.5);
      return clampPlace(s, p, c, corsia + noise() * 0.5, y + noise() * 0.5);
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
