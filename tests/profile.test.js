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

test('vittorie, sconfitte e bauli vengono contati per arena', () => {
  const p = P.fresh();
  P.applyResult(p, 0, 1);
  P.applyResult(p, 1, 0);
  P.applyResult(p, -1, 0);
  assert.deepStrictEqual(p.arenaStats[0], { w: 1, l: 1, d: 1, chests: 1 });
});

test('il giorno cambia a mezzanotte ora di Roma (anche con l\'ora legale)', () => {
  // 22:59:59 UTC del 27/10/2026 = 23:59:59 a Roma (ora solare, UTC+1)
  const before = Date.UTC(2026, 9, 27, 22, 59, 59);
  assert.strictEqual(P.romeDay(before), '2026-10-27');
  assert.strictEqual(P.romeDay(before + 1000), '2026-10-28');
  assert.strictEqual(P.msToRomeMidnight(before), 1000);
  // d'estate Roma è UTC+2: 21:30 UTC = 23:30 a Roma
  assert.strictEqual(P.msToRomeMidnight(Date.UTC(2026, 6, 1, 21, 30, 0)), 30 * 60 * 1000);
});

test('baule del giorno: uno solo al giorno, poi torna dopo mezzanotte', () => {
  const p = P.fresh();
  const t = Date.UTC(2026, 9, 27, 10, 0, 0);
  const r = P.openGift(p, t);
  assert.ok(r && (r.gems === 0 || r.gems >= 5));
  assert.strictEqual(P.openGift(p, t + 3600e3), null);
  assert.ok(P.openGift(p, Date.UTC(2026, 9, 27, 23, 0, 1)), 'dopo mezzanotte di Roma');
});

test('negozio: 6 offerte di carte trovate, uguali per tutto il giorno, nuove il giorno dopo', () => {
  const p = P.fresh();
  for (const c of D.CARDS) p.cards[c.key] = { level: 1, count: 0 };
  const t = Date.UTC(2026, 9, 27, 9, 0, 0);
  const a = P.shopOffers(p, t).map((o) => o.key);
  assert.strictEqual(a.length, 6);
  assert.strictEqual(new Set(a).size, 6);
  assert.deepStrictEqual(P.shopOffers(p, t + 5 * 3600e3).map((o) => o.key), a);
  const days = new Set();
  for (let d = 0; d < 5; d++) days.add(P.shopOffers(p, t + d * 86400e3).map((o) => o.key).join());
  assert.ok(days.size > 1, 'le offerte cambiano');
  const fresh = P.fresh();
  for (const o of P.shopOffers(fresh, t)) assert.ok(fresh.cards[o.key], 'solo carte già trovate');
});

test('comprare una carta con le monete, una volta sola al giorno', () => {
  const p = P.fresh();
  p.gold = 10000;
  const t = Date.UTC(2026, 9, 27, 9, 0, 0);
  const o = P.shopOffers(p, t)[0];
  const before = p.cards[o.key].count;
  assert.ok(P.buyOffer(p, o.key, t));
  assert.strictEqual(p.cards[o.key].count, before + o.n);
  assert.strictEqual(p.gold, 10000 - o.price);
  assert.ok(!P.buyOffer(p, o.key, t), 'già comprata oggi');
  assert.ok(P.buyOffer(p, P.shopOffers(p, t + 86400e3)[0].key, t + 86400e3), 'il giorno dopo si può di nuovo');
  p.gold = 0;
  assert.ok(!P.buyOffer(p, P.shopOffers(p, t + 86400e3)[1].key, t + 86400e3), 'senza monete no');
});

test('gemme: si spendono per bauli e per aprire subito, non si comprano', () => {
  const p = P.fresh();
  assert.strictEqual(p.gems, 50);
  const r = P.buyGemItem(p, 'argento');
  assert.ok(r && Object.keys(r.cards).length);
  assert.strictEqual(p.gems, 50 - 30 + r.gems);
  assert.strictEqual(P.buyGemItem(p, 'magico'), null, 'gemme insufficienti');
  // il baule di benvenuto (30 s) si apre subito per 1 gemma
  assert.strictEqual(P.skipCost(p.chests[0], Date.now()), 1);
  const g = p.gems;
  assert.ok(P.skipChest(p, 0, Date.now()));
  assert.strictEqual(p.chests[0], null);
  assert.ok(p.gems >= g - 1);
  assert.ok(!D.GEM_SHOP.some((x) => x.kind === 'gems'), 'nessun modo di comprare gemme');
});

test('le gemme non sono in tutti i bauli e monete e gemme non sono mai sempre uguali', () => {
  const open = (type) => {
    const p = P.fresh();
    p.chests[0] = { type, arena: 0, unlockAt: 0 };
    return P.openChest(p, 0, 1);
  };
  const legno = Array.from({ length: 400 }, () => open('legno'));
  const magico = Array.from({ length: 400 }, () => open('magico'));
  const conGemme = legno.filter((r) => r.gems > 0).length / 400;
  assert.ok(conGemme > 0.05 && conGemme < 0.3, 'legno con gemme: ' + conGemme);
  assert.ok(magico.every((r) => r.gems >= 12 && r.gems <= 20));
  assert.ok(new Set(legno.map((r) => r.gold)).size > 5, 'monete diverse');
  assert.ok(new Set(magico.map((r) => r.gems)).size > 5, 'gemme diverse');
});

test('cammino dei trofei: premi ogni 50 coppe, si ritirano una volta sola', () => {
  for (let i = 0; i < D.ARENAS.length; i++) {
    const r = P.road(i);
    assert.ok(r.length >= 5, 'arena ' + i);
    for (const x of r) assert.ok(x.t > D.ARENAS[i].trophies);
  }
  const p = P.fresh();
  assert.strictEqual(P.roadPending(p), 0);
  p.best = 120; p.trophies = 120;
  assert.strictEqual(P.roadPending(p), 2);
  const g = p.gold;
  assert.ok(P.claimRoad(p, 0, 50));
  assert.ok(p.gold > g);
  assert.strictEqual(P.claimRoad(p, 0, 50), null, 'già ritirato');
  assert.strictEqual(P.claimRoad(p, 0, 150), null, 'coppe non ancora raggiunte');
  assert.ok(P.claimRoad(p, 0, 100).cards, 'baule');
  assert.strictEqual(P.roadPending(p), 0);
});

test('torneo: gratis una volta al giorno, finisce a 3 sconfitte o 12 vittorie, premi crescenti', () => {
  const p = P.fresh();
  const t0 = Date.UTC(2026, 9, 28, 10, 0, 0);
  assert.ok(P.tourStart(p, t0));
  assert.strictEqual(p.gems, 50, 'la prima volta è gratis');
  P.tourResult(p, 0); P.tourResult(p, 0); P.tourResult(p, 1); P.tourResult(p, 1); P.tourResult(p, 0); P.tourResult(p, 1);
  assert.ok(p.tour.done);
  assert.strictEqual(p.tour.wins, 3);
  const r = P.tourClaim(p, 0);
  assert.strictEqual(r.wins, 3);
  assert.ok(r.chest && r.gold > 0);
  assert.strictEqual(p.tour, null);
  assert.ok(P.tourStart(p, t0 + 3600e3));
  assert.strictEqual(p.gems, 50 + (r.chest.gems || 0) - P.TOUR_RETRY_GEMS, 'il secondo nello stesso giorno costa gemme');
  for (let i = 0; i < 12; i++) P.tourResult(p, 0);
  assert.ok(p.tour.done && p.tour.wins === 12);
  assert.ok(P.tourPrize(12).gold > P.tourPrize(3).gold);
  assert.strictEqual(P.tourDifficulty(0), 'facile');
  assert.strictEqual(P.tourDifficulty(10), 'difficile');
});
