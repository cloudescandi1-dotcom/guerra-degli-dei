// Test della progressione: coppe, arene, bauli, potenziamenti, mazzo e clan.
const test = require('node:test');
const assert = require('node:assert');
const D = require('../src/js/cards.js');
const P = require('../src/js/profile.js');

test('profilo nuovo: mazzo da 8 con carte possedute, un baule di benvenuto', () => {
  const p = P.fresh();
  assert.strictEqual(p.deck.length, 8);
  for (const k of p.deck) assert.ok(p.cards[k]);
  assert.strictEqual(p.chests.filter(Boolean).length, 1);
  assert.match(p.id, /^[A-Z0-9]{6}$/);
});

test('vincere dà coppe e bauli; perdere non fa scendere sotto la soglia dell\'arena', () => {
  const p = P.fresh();
  const r = P.applyResult(p, 0, 2);
  assert.strictEqual(p.trophies, 30);
  assert.ok(r.chest);
  P.applyResult(p, 1, 0);
  P.applyResult(p, 1, 0);
  assert.strictEqual(p.trophies, 0);
  p.trophies = 290; p.best = 290;
  const up = P.applyResult(p, 0, 1);
  assert.strictEqual(up.newArena, 1);
  assert.deepStrictEqual(up.newCards.sort(), ['gladiatore', 'minotauro', 'testuggine']);
  P.applyResult(p, 1, 0);
  assert.strictEqual(p.trophies, 300);
});

test('al massimo 4 bauli', () => {
  const p = P.fresh();
  for (let i = 0; i < 6; i++) P.applyResult(p, 0, 1);
  assert.strictEqual(p.chests.filter(Boolean).length, 4);
});

test('i bauli si aprono uno alla volta, dopo il tempo giusto', () => {
  const p = P.fresh();
  P.applyResult(p, 0, 1);
  const t0 = 1000000;
  assert.ok(P.startUnlock(p, 0, t0));
  assert.ok(!P.startUnlock(p, 1, t0), 'uno alla volta');
  assert.strictEqual(P.openChest(p, 0, t0 + 1000), null);
  const gold = p.gold;
  const r = P.openChest(p, 0, t0 + 31000);
  assert.ok(r && r.gold > 0 && Object.keys(r.cards).length > 0);
  assert.strictEqual(p.gold, gold + r.gold);
  for (const k of Object.keys(r.cards)) assert.ok(D.BY_KEY[k].arena <= 0, 'solo carte delle arene raggiunte');
});

test('potenziare consuma copie e monete', () => {
  const p = P.fresh();
  p.cards.oplita.count = 2;
  p.gold = 100;
  assert.ok(P.upgrade(p, 'oplita'));
  assert.strictEqual(p.cards.oplita.level, 2);
  assert.strictEqual(p.cards.oplita.count, 0);
  assert.strictEqual(p.gold, 95);
  assert.ok(!P.upgrade(p, 'oplita'), 'senza copie non si può');
});

test('cambiare carta nel mazzo: se c\'è già, si scambia', () => {
  const p = P.fresh();
  const before = p.deck.slice();
  assert.ok(P.setDeckCard(p, 0, 'centauro'));
  assert.strictEqual(p.deck[0], 'centauro');
  assert.ok(P.setDeckCard(p, 1, 'centauro'));
  assert.strictEqual(p.deck[1], 'centauro');
  assert.strictEqual(p.deck[0], before[1]);
  assert.strictEqual(new Set(p.deck).size, 8);
  assert.ok(!P.setDeckCard(p, 0, 'ercole'), 'carta non ancora trovata');
});

test('clan: le versioni di due membri si uniscono e le donazioni arrivano una volta sola', () => {
  const a = P.fresh(), b = P.fresh();
  P.createClan(a, 'Spartani', '⚡');
  b.clan = JSON.parse(JSON.stringify(a.clan));
  b.clan.members.push({ id: b.id, name: b.name, trophies: 0, role: 'membro', at: 5 });
  b.clan.chat.push({ id: 'r1', type: 'request', from: b.id, card: 'oplita', max: 10, donations: [], at: 10 });
  assert.ok(P.mergeClan(a, b.clan));
  assert.strictEqual(a.clan.members.length, 2);
  // a dona
  const req = a.clan.chat.find((m) => m.id === 'r1');
  req.donations.push({ id: 'd1', from: a.id });
  assert.ok(P.mergeClan(b, a.clan));
  const before = b.cards.oplita.count;
  assert.strictEqual(P.creditDonations(b), 1);
  assert.strictEqual(P.creditDonations(b), 0, 'non due volte');
  assert.strictEqual(b.cards.oplita.count, before + 1);
  assert.ok(!P.mergeClan(b, a.clan), 'niente di nuovo');
});

test('il profilo si salva e si ricarica', () => {
  const mem = {};
  const storage = { getItem: (k) => mem[k] || null, setItem: (k, v) => { mem[k] = v; } };
  const p = P.fresh();
  p.gold = 777;
  P.save(p, storage);
  assert.strictEqual(P.load(storage).gold, 777);
  mem[P.KEY] = '{rotto';
  assert.strictEqual(P.load(storage).gold, 100);
});
