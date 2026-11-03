// Rigioco di una battaglia: rifà la partita passo per passo con le mosse registrate
// del giocatore 0 e dice com'è finita. Serve al server per controllare le vittorie.
// Niente Math.random né Date qui: il risultato dipende solo da setup e mosse.
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const E = isNode ? require('./engine.js') : root.Engine;
  const Bot = isNode ? require('./bot.js') : root.Bot;

  const MAX_MOSSE = 400;

  const no = (motivo) => ({ ok: false, motivo });

  // Controlla le mosse (dati non fidati): ognuna è [n, slot, x, y]
  function controllaMosse(mosse) {
    if (!Array.isArray(mosse)) return 'mosse non valide';
    if (mosse.length > MAX_MOSSE) return 'troppe mosse';
    let prec = 0;
    for (const m of mosse) {
      if (!Array.isArray(m) || m.length !== 4) return 'mossa malformata';
      for (const v of m) if (typeof v !== 'number' || !Number.isFinite(v)) return 'numero non valido';
      const [n, slot] = m;
      if (!Number.isInteger(n) || n < 0) return 'passo non valido';
      if (n < prec) return 'passi non in ordine';
      if (!Number.isInteger(slot) || slot < 0 || slot > 3) return 'carta non valida';
      prec = n;
    }
    return null;
  }

  // Fa al massimo `quanti` passi della partita: prima il computer pensa e gioca, poi il passo.
  // Le mosse del giocatore si mettono PRIMA di chiamarla (col numero del passo attuale):
  // è lo stesso ordine del rigioco qui sotto. La usa anche il telefono per recuperare il tempo
  // passato con l'app in background. Restituisce quanti passi ha fatto.
  function avanza(s, bot, quanti) {
    let fatti = 0;
    while (fatti < quanti && !s.over) {
      const a = bot.think(s, 1, E.TICK);
      if (a) E.play(s, 1, a.slot, a.x, a.y);
      E.step(s);
      fatti++;
    }
    return fatti;
  }

  // Un passo della partita che gira sul telefono (allenamento, 2 contro 2, sfide tra amici):
  // prima pensa e gioca il computer (bot = giocatore 1), poi gli altri computer (bots = [{ p, bot }]),
  // poi le giocate arrivate dall'amico online (remote = [{ slot, x, y }]) come giocatore `remoto`,
  // infine il passo. Restituisce le carte giocate davvero: [{ p, key }] (per gli avvisi del compagno).
  function passo(s, o) {
    const giocate = [];
    const gioca = (p, slot, x, y) => {
      const key = s.players[p] && s.players[p].hand[slot];
      if (E.play(s, p, slot, x, y)) giocate.push({ p, key });
    };
    if (o.bot) { const a = o.bot.think(s, 1, E.TICK); if (a) gioca(1, a.slot, a.x, a.y); }
    for (const b of o.bots || []) { const a = b.bot.think(s, b.p, E.TICK); if (a) gioca(b.p, a.slot, a.x, a.y); }
    for (const m of o.remote || []) gioca(o.remoto, m.slot, m.x, m.y);
    E.step(s);
    return giocate;
  }

  // Quanti passi devono essere stati fatti dopo `ms` millisecondi di tempo vero (20 al secondo)
  const MS_PASSO = Math.round(E.TICK * 1000);
  function passiDovuti(ms) {
    return Number.isFinite(ms) && ms > 0 ? Math.floor(ms / MS_PASSO) : 0;
  }

  function esegui(setup, mosse) {
    try {
      const err = controllaMosse(mosse);
      if (err) return no(err);
      if (!setup || typeof setup !== 'object' || !setup.match) return no('impostazioni mancanti');
      const s = E.createMatch(setup.match);
      const bot = Bot.createBot(setup.level, setup.botSeed);
      const maxPassi = Math.ceil((s.duration + s.overtime) / E.TICK) + 20;
      let i = 0;
      while (!s.over && s.n < maxPassi) {
        // prima le mosse del giocatore con questo passo, poi il bot, poi il passo
        while (i < mosse.length && mosse[i][0] === s.n) {
          const m = mosse[i++];
          if (!E.play(s, 0, m[1], m[2], m[3])) return no('mossa non giocabile');
        }
        avanza(s, bot, 1);
      }
      if (i < mosse.length) return no('mosse oltre la fine');
      return { ok: true, winner: s.winner, crowns: s.crowns.slice(), passi: s.n, secondi: s.t };
    } catch (e) {
      return no('rigioco non riuscito');
    }
  }

  const api = { esegui, avanza, passo, passiDovuti, MAX_MOSSE };
  if (isNode) module.exports = api; else root.Rigioco = api;
})(typeof self !== 'undefined' ? self : this);
