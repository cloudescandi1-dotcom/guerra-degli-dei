// Test del motore e del computer: partite simulate dall'inizio alla fine.
const test = require('node:test');
const assert = require('node:assert');
const D = require('../src/js/cards.js');
const E = require('../src/js/engine.js');
const B = require('../src/js/bot.js');

const allKeys = D.CARDS.map((c) => c.key);

function botMatch(decks, levels, seed) {
  const s = E.createMatch({ decks, seed });
  const bots = [B.createBot(levels[0], seed + 1), B.createBot(levels[1], seed + 2)];
  let plays = 0;
  while (!s.over && s.t < 400) {
    for (let p = 0; p < 2; p++) {
      const a = bots[p].think(s, p, E.TICK);
      if (a && E.play(s, p, a.slot, a.x, a.y)) plays++;
    }
    E.step(s);
  }
  return { s, plays };
}

test('24 carte, 7 arene, ogni carta ha i dati necessari', () => {
  assert.strictEqual(D.CARDS.length, 24);
  assert.strictEqual(D.ARENAS.length, 7);
  for (const c of D.CARDS) {
    assert.ok(c.name && c.emoji && D.RARITY[c.rarity] && c.cost >= 1 && c.cost <= 10, c.key);
    assert.ok(c.arena >= 0 && c.arena < 7, c.key);
    if (c.type === 'spell') assert.ok(c.radius && c.dmg, c.key);
    else { const u = D.BY_KEY[c.unit || c.key]; assert.ok(u && u.hp > 0, c.key); }
  }
  for (const k of D.START_DECK) assert.strictEqual(D.BY_KEY[k].arena, 0);
});

test('si parte con 5 di ambrosia e si ricarica fino a 10', () => {
  const s = E.createMatch({ decks: [D.START_DECK, D.START_DECK], seed: 3 });
  assert.strictEqual(s.players[0].amb, 5);
  for (let i = 0; i < 20 * 30; i++) E.step(s);
  assert.strictEqual(s.players[0].amb, 10);
  assert.strictEqual(s.ents.filter((e) => e.cat === 'tower').length, 6);
});

test('non si può mettere una truppa nella metà avversaria', () => {
  const s = E.createMatch({ decks: [D.START_DECK, D.START_DECK], seed: 3 });
  s.players[0].amb = 10;
  const slot = s.players[0].hand.findIndex((k) => D.BY_KEY[k].type === 'troop');
  assert.strictEqual(E.play(s, 0, slot, 9, 8), false);
  assert.strictEqual(E.play(s, 0, slot, 9, 24), true);
});

test('un Oplita senza difese abbatte il tempio nemico', () => {
  const s = E.createMatch({ decks: [D.START_DECK, D.START_DECK], seed: 5 });
  s.players[0].hand[0] = 'oplita';
  s.players[0].levels.oplita = 9;
  E.play(s, 0, 0, 3.5, 20);
  for (let i = 0; i < 20 * 90 && s.crowns[0] === 0; i++) E.step(s);
  assert.strictEqual(s.crowns[0], 1);
});

test('ogni carta si può giocare senza errori', () => {
  for (const key of allKeys) {
    const s = E.createMatch({ decks: [Array(8).fill(key), D.START_DECK], seed: 9 });
    s.players[0].amb = 10;
    assert.ok(E.play(s, 0, 0, 3.5, 20), key);
    for (let i = 0; i < 20 * 20; i++) E.step(s);
  }
});

test('computer contro computer: le partite finiscono sempre', () => {
  for (let seed = 1; seed <= 6; seed++) {
    const rng = E.makeRng(seed);
    const deck = () => allKeys.slice().sort(() => rng() - 0.5).slice(0, 8);
    const { s, plays } = botMatch([deck(), deck()], ['difficile', 'medio'], seed);
    assert.ok(s.over, 'partita finita');
    assert.ok(plays > 10, 'carte giocate: ' + plays);
    assert.ok([0, 1, -1].includes(s.winner));
  }
});

test('il computer difficile batte spesso quello facile', () => {
  let wins = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const { s } = botMatch([D.START_DECK, D.START_DECK], ['difficile', 'facile'], seed * 11);
    if (s.winner === 0) wins++;
  }
  assert.ok(wins >= 4, 'vittorie: ' + wins);
});
