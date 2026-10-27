// Il profilo del giocatore: coppe, monete, carte, mazzo, bauli, amici e clan.
// Viene salvato nel dispositivo (localStorage).
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const D = isNode ? require('./cards.js') : root.GameData;

  const KEY = 'guerra-dei-profilo-v1';
  const WIN_TROPHIES = 30, LOSS_TROPHIES = 20;
  const GIFT_EVERY = 2 * 3600 * 1000;   // un Dono degli dèi ogni 2 ore

  const randomId = (n) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };

  function fresh() {
    const cards = {};
    for (const c of D.CARDS) if (c.arena === 0) cards[c.key] = { level: 1, count: 0 };
    return {
      id: randomId(6), name: 'Eroe' + Math.floor(100 + Math.random() * 900),
      trophies: 0, best: 0, gold: 100, wins: 0, losses: 0, draws: 0,
      cards, deck: D.START_DECK.slice(),
      chests: [{ type: 'legno', arena: 0, unlockAt: null }, null, null, null],
      chestIndex: 0, giftAt: 0,
      friends: [], chats: {}, clan: null, lastRequest: 0, credited: [],
      sound: true, seen: {},
    };
  }

  function load(storage) {
    try {
      const raw = storage && storage.getItem(KEY);
      if (raw) {
        const p = Object.assign(fresh(), JSON.parse(raw));
        // Se in un aggiornamento sono comparse nuove carte di arene già raggiunte, aggiungile
        unlockArenaCards(p);
        return p;
      }
    } catch (e) { /* profilo rovinato: si riparte */ }
    return fresh();
  }

  function save(p, storage) {
    try { storage && storage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* spazio pieno o modalità privata */ }
  }

  const arena = (p) => D.arenaFor(p.best);

  // Le carte delle arene raggiunte entrano nella collezione
  function unlockArenaCards(p) {
    const found = [];
    for (const c of D.CARDS) {
      if (c.arena <= arena(p) && !p.cards[c.key]) { p.cards[c.key] = { level: 1, count: 0 }; found.push(c.key); }
    }
    return found;
  }

  function avgLevel(p) {
    return p.deck.reduce((a, k) => a + (p.cards[k] ? p.cards[k].level : 1), 0) / p.deck.length;
  }
  const deckLevels = (p) => {
    const lv = {};
    for (const k of p.deck) lv[k] = p.cards[k] ? p.cards[k].level : 1;
    return lv;
  };

  // Copie necessarie e costo in monete per il prossimo livello (null = già al massimo)
  function upgradeInfo(p, key) {
    const c = p.cards[key];
    if (!c || c.level >= D.MAX_LEVEL) return null;
    const r = D.RARITY[D.BY_KEY[key].rarity];
    return { copies: r.copies[c.level - 1], gold: D.UPGRADE_GOLD[c.level - 1] };
  }
  function canUpgrade(p, key) {
    const u = upgradeInfo(p, key);
    return !!u && p.cards[key].count >= u.copies && p.gold >= u.gold;
  }
  function upgrade(p, key) {
    if (!canUpgrade(p, key)) return false;
    const u = upgradeInfo(p, key);
    p.cards[key].count -= u.copies;
    p.gold -= u.gold;
    p.cards[key].level++;
    return true;
  }

  function setDeckCard(p, slot, key) {
    if (!p.cards[key] || slot < 0 || slot > 7) return false;
    const other = p.deck.indexOf(key);
    if (other >= 0) p.deck[other] = p.deck[slot];   // se era già nel mazzo, scambia
    p.deck[slot] = key;
    return true;
  }

  // Esito di una partita in classifica: coppe, statistiche e (se c'è posto) un baule
  function applyResult(p, winner, crowns) {
    const before = arena(p);
    const out = { trophies: 0, chest: null, gold: 0, newArena: null, newCards: [] };
    if (winner === 0) {
      p.wins++;
      out.trophies = WIN_TROPHIES;
      out.gold = 5 + 5 * crowns;
      p.gold += out.gold;
      const slot = p.chests.findIndex((c) => !c);
      if (slot >= 0) {
        const type = D.CHEST_CYCLE[p.chestIndex % D.CHEST_CYCLE.length];
        p.chestIndex++;
        p.chests[slot] = { type, arena: arena(p), unlockAt: null };
        out.chest = type;
      } else out.chestsFull = true;
    } else if (winner === 1) {
      p.losses++;
      // Non si scende sotto la soglia dell'arena raggiunta
      const floor = D.ARENAS[D.arenaFor(p.trophies)].trophies;
      out.trophies = -Math.min(LOSS_TROPHIES, p.trophies - floor);
    } else p.draws++;
    p.trophies += out.trophies;
    p.best = Math.max(p.best, p.trophies);
    if (arena(p) > before) {
      out.newArena = arena(p);
      out.newCards = unlockArenaCards(p);
    }
    return out;
  }

  // ---- Bauli ----
  function chestState(chest, now) {
    if (!chest) return 'vuoto';
    if (chest.unlockAt == null) return 'chiuso';
    return now >= chest.unlockAt ? 'pronto' : 'in apertura';
  }
  function startUnlock(p, slot, now) {
    if (p.chests.some((c) => c && c.unlockAt != null && now < c.unlockAt)) return false;   // uno alla volta
    const c = p.chests[slot];
    if (!c || c.unlockAt != null) return false;
    c.unlockAt = now + D.CHESTS[c.type].time * 1000;
    return true;
  }

  // Estrae carte a caso tra quelle sbloccate, rispettando le rarità
  function rollCards(p, type, arenaIdx, rnd) {
    rnd = rnd || Math.random;
    const info = D.CHESTS[type];
    const pool = D.CARDS.filter((c) => c.arena <= arenaIdx);
    const byRarity = (r) => pool.filter((c) => c.rarity === r);
    const order = ['comune', 'rara', 'epica', 'leggendaria'];
    const total = Math.round(info.cards * (1 + arenaIdx * 0.25));
    const result = {};
    // Le carte arrivano in 1-4 "mucchietti"
    const stacks = Math.min(4, Math.max(1, Math.ceil(total / 8)));
    let left = total;
    for (let i = 0; i < stacks; i++) {
      let rarity = 'comune';
      const x = rnd() * 100;
      if (x < 1) rarity = 'leggendaria'; else if (x < 6) rarity = 'epica'; else if (x < 28) rarity = 'rara';
      if (i === 0 && info.minRarity && order.indexOf(rarity) < order.indexOf(info.minRarity)) rarity = info.minRarity;
      while (!byRarity(rarity).length) rarity = order[order.indexOf(rarity) - 1];
      const list = byRarity(rarity);
      const card = list[Math.floor(rnd() * list.length)];
      // Le carte rare valgono di più: se ne trovano meno
      const share = i === stacks - 1 ? left : Math.ceil(left / (stacks - i));
      const n = Math.max(1, Math.round(share / ({ comune: 1, rara: 3, epica: 10, leggendaria: 30 })[rarity]));
      left -= share;
      result[card.key] = (result[card.key] || 0) + n;
    }
    return result;
  }

  function addCards(p, cards) {
    for (const [key, n] of Object.entries(cards)) {
      if (!p.cards[key]) p.cards[key] = { level: 1, count: 0 };
      p.cards[key].count += n;
    }
  }

  function openChest(p, slot, now, rnd) {
    const c = p.chests[slot];
    if (chestState(c, now) !== 'pronto') return null;
    p.chests[slot] = null;
    return openContents(p, c.type, c.arena, rnd);
  }
  function openContents(p, type, arenaIdx, rnd) {
    rnd = rnd || Math.random;
    const info = D.CHESTS[type];
    const gold = Math.round((info.gold[0] + rnd() * (info.gold[1] - info.gold[0])) * (1 + arenaIdx * 0.3));
    const cards = rollCards(p, type, arenaIdx, rnd);
    p.gold += gold;
    addCards(p, cards);
    return { type, gold, cards };
  }

  const giftReady = (p, now) => now >= p.giftAt;
  function openGift(p, now, rnd) {
    if (!giftReady(p, now)) return null;
    p.giftAt = now + GIFT_EVERY;
    return openContents(p, 'dono', arena(p), rnd);
  }

  // ---- Amici e clan (i dati: la parte "online" è in social.js) ----
  function addFriend(p, info) {
    if (!info || !info.id || info.id === p.id) return null;
    let f = p.friends.find((x) => x.id === info.id);
    if (!f) { f = { id: info.id, name: info.name || info.id, trophies: 0, wins: 0, losses: 0 }; p.friends.push(f); }
    if (info.name) f.name = info.name;
    if (info.trophies != null) f.trophies = info.trophies;
    if (info.clan !== undefined) f.clan = info.clan;
    f.seen = info.seen || f.seen;
    return f;
  }
  function removeFriend(p, id) {
    p.friends = p.friends.filter((f) => f.id !== id);
    delete p.chats[id];
  }
  function addChat(p, withId, msg) {
    const list = p.chats[withId] || (p.chats[withId] = []);
    if (list.some((m) => m.id === msg.id)) return false;
    list.push(msg);
    list.sort((a, b) => a.at - b.at);
    if (list.length > 100) list.splice(0, list.length - 100);
    return true;
  }

  function createClan(p, name, badge) {
    p.clan = {
      id: randomId(8), name: name.trim().slice(0, 24) || 'Clan', badge: badge || '🏛️',
      leader: p.id, members: [{ id: p.id, name: p.name, trophies: p.trophies, role: 'capo' }],
      chat: [], updated: Date.now(),
    };
    return p.clan;
  }
  // Unisce due versioni dello stesso clan (quella di un altro membro e la nostra)
  function mergeClan(p, other) {
    if (!other || !p.clan || other.id !== p.clan.id) return false;
    const c = p.clan;
    let changed = false;
    for (const m of other.members || []) {
      const mine = c.members.find((x) => x.id === m.id);
      if (!mine) { c.members.push(Object.assign({}, m)); changed = true; }
      else if ((m.at || 0) > (mine.at || 0)) { Object.assign(mine, m); changed = true; }
    }
    // Chi esce resta in elenco con left = true (così lo sanno anche gli altri): vince l'informazione più recente
    for (const msg of other.chat || []) {
      const mine = c.chat.find((x) => x.id === msg.id);
      if (!mine) { c.chat.push(JSON.parse(JSON.stringify(msg))); changed = true; }
      else if (msg.donations && msg.donations.length > (mine.donations || []).length) {
        const ids = new Set((mine.donations || []).map((d) => d.id));
        mine.donations = (mine.donations || []).concat(msg.donations.filter((d) => !ids.has(d.id)));
        changed = true;
      }
    }
    if ((other.updated || 0) > (c.updated || 0)) { c.name = other.name; c.badge = other.badge; c.leader = other.leader; c.updated = other.updated; }
    c.chat.sort((a, b) => a.at - b.at);
    if (c.chat.length > 150) c.chat.splice(0, c.chat.length - 150);
    return changed;
  }

  // Richiesta di carte nel clan: una ogni ora
  const REQUEST_EVERY = 3600 * 1000;
  function canRequest(p, now) { return !!p.clan && now - p.lastRequest >= REQUEST_EVERY; }
  function requestMax(key) { return ({ comune: 10, rara: 3, epica: 1, leggendaria: 0 })[D.BY_KEY[key].rarity]; }

  // Le donazioni ricevute si aggiungono una volta sola
  function creditDonations(p) {
    if (!p.clan) return 0;
    let got = 0;
    for (const m of p.clan.chat) {
      if (m.type !== 'request' || m.from !== p.id) continue;
      for (const d of m.donations || []) {
        if (p.credited.includes(d.id)) continue;
        p.credited.push(d.id);
        addCards(p, { [m.card]: 1 });
        got++;
      }
    }
    if (p.credited.length > 500) p.credited.splice(0, p.credited.length - 500);
    return got;
  }

  const api = {
    KEY, fresh, load, save, arena, avgLevel, deckLevels, upgradeInfo, canUpgrade, upgrade, setDeckCard,
    applyResult, chestState, startUnlock, openChest, rollCards, addCards, giftReady, openGift, unlockArenaCards,
    addFriend, removeFriend, addChat, createClan, mergeClan, canRequest, requestMax, creditDonations, randomId,
    WIN_TROPHIES, LOSS_TROPHIES, REQUEST_EVERY,
  };
  if (isNode) module.exports = api;
  else root.Profile = api;
})(typeof self !== 'undefined' ? self : this);
