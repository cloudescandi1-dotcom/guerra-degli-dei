// Impostazioni di una battaglia contro il computer: mazzi, livelli, nome e seme del bot.
// Le usano sia il gioco sia il server (per rigiocare la partita). Niente Math.random qui:
// tutti i numeri a caso arrivano dalla funzione rnd passata da chi chiama.
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const D = isNode ? require('./cards.js') : root.GameData;
  const P = isNode ? require('./profile.js') : root.Profile;

  const FOE_NAMES = ['Leonida', 'Achille', 'Ettore', 'Aiace', 'Penelope', 'Ulisse', 'Atalanta', 'Pericle', 'Cassandra', 'Teseo', 'Ippolita', 'Spartaco', 'Giulia', 'Cornelia', 'Scipione'];

  // Difficoltà del bot: nella scalata dipende dall'arena, nel torneo dalle vittorie
  function livello(p, mode) {
    if (mode === 'tour') return P.tourDifficulty(p.tour.wins);
    const a = P.arena(p);
    return a <= 1 ? 'facile' : a <= 4 ? 'medio' : 'difficile';
  }

  // rnd() restituisce un numero in [0, 1) come Math.random
  // now (ms): serve per la regola della settimana del torneo
  function prepara(p, mode, level, rnd, now) {
    const a = P.arena(p);
    const pool = D.CARDS.filter((c) => c.arena <= a).map((c) => c.key);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const foeDeck = pool.slice(0, 8);
    let avg = Math.max(1, Math.round(P.avgLevel(p)));
    // nel torneo tutte le carte sono allo stesso livello
    const myLv = mode === 'tour' ? Object.fromEntries(p.deck.map((k) => [k, P.TOUR_LEVEL])) : P.deckLevels(p);
    if (mode === 'tour') avg = P.TOUR_LEVEL;
    const foeLv = {};
    for (const k of foeDeck) foeLv[k] = Math.max(1, Math.min(D.MAX_LEVEL, avg));
    const foeName = FOE_NAMES[Math.floor(rnd() * FOE_NAMES.length)];
    const botSeed = Math.floor(rnd() * 1e9);
    const seed = Math.floor(rnd() * 1e9);
    const match = { decks: [p.deck.slice(), foeDeck], levels: [myLv, foeLv], towerLevels: [avg, avg], seed };
    let regola = null;
    if (mode === 'tour' && Number.isFinite(now)) {
      const r = P.regolaSettimana(now);
      regola = r.id;
      if (r.ambMult) match.ambMult = r.ambMult;
      if (r.duration) match.duration = r.duration;
    }
    return { mode, level, arena: a, foeName, foeLevel: avg, botSeed, regola, match };
  }

  // 2 contro 2 contro il computer (amichevole, senza premi): tu sei il giocatore 0,
  // il compagno computer è il 2 (stessa squadra), gli avversari computer sono 1 e 3.
  // level: difficoltà dei computer (anche il compagno gioca a quel livello)
  function preparaDuo(p, level, rnd) {
    const a = P.arena(p);
    const pool = D.CARDS.filter((c) => c.arena <= a).map((c) => c.key);
    const mazzo = () => {
      const l = pool.slice();
      for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
      return l.slice(0, 8);
    };
    const avg = Math.max(1, Math.min(D.MAX_LEVEL, Math.round(P.avgLevel(p))));
    const livelli = (deck) => Object.fromEntries(deck.map((k) => [k, avg]));
    const decks = [p.deck.slice(), mazzo(), mazzo(), mazzo()];
    // tre nomi diversi: avversario 1, compagno, avversario 2
    const nomi = FOE_NAMES.slice();
    for (let i = nomi.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [nomi[i], nomi[j]] = [nomi[j], nomi[i]]; }
    const names = ['', nomi[0], nomi[1], nomi[2]];   // names[giocatore]; il primo sei tu
    const botSeeds = [0, 1, 2, 3].map(() => Math.floor(rnd() * 1e9));
    const seed = Math.floor(rnd() * 1e9);
    const match = { decks, levels: [P.deckLevels(p), livelli(decks[1]), livelli(decks[2]), livelli(decks[3])], towerLevels: [avg, avg], seed };
    return { mode: 'duo', level, arena: a, names, foeLevel: avg, botSeeds, match };
  }

  // 2 contro 2 online: tu (giocatore 0) e un amico (giocatore 2) contro due computer (1 e 3).
  // È amichevole come le sfide tra amici: tutte le carte e i templi al livello 7.
  // deckAmico: il mazzo che ha mandato l'amico (già controllato da chi chiama)
  const LIVELLO_AMICI = 7;
  function preparaDuoAmico(p, deckAmico, level, rnd) {
    const base = preparaDuo(p, level, rnd);
    const decks = base.match.decks.slice();
    decks[2] = deckAmico.slice();   // al posto del compagno computer c'è l'amico
    const livelli = (deck) => Object.fromEntries(deck.map((k) => [k, LIVELLO_AMICI]));
    base.match = { decks, levels: decks.map(livelli), towerLevels: [LIVELLO_AMICI, LIVELLO_AMICI], seed: base.match.seed };
    base.foeLevel = LIVELLO_AMICI;
    base.names[2] = '';   // il nome dell'amico lo mette chi chiama
    return base;
  }

  const api = { prepara, preparaDuo, preparaDuoAmico, livello, FOE_NAMES, LIVELLO_AMICI };
  if (isNode) module.exports = api; else root.SetupBattaglia = api;
})(typeof self !== 'undefined' ? self : this);
