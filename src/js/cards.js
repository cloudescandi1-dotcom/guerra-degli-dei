// Carte, arene e regole di progressione di "Guerra degli Dèi".
// Solo dati: nessuna grafica. Funziona nel browser (variabili globali) e in Node (test).
(function (root) {
  'use strict';

  // Rarità: colore della cornice e copie necessarie per passare al livello successivo
  const RARITY = {
    comune: { name: 'Comune', color: '#a9bfd4', copies: [2, 4, 10, 20, 50, 100, 200, 400], weight: 72 },
    rara: { name: 'Rara', color: '#f59e0b', copies: [1, 2, 4, 10, 20, 50, 100, 200], weight: 22 },
    epica: { name: 'Epica', color: '#b46cf5', copies: [1, 1, 2, 4, 10, 20, 40, 80], weight: 5 },
    leggendaria: { name: 'Leggendaria', color: '#ffd84a', copies: [1, 1, 1, 2, 4, 8, 12, 20], weight: 1 },
  };
  const UPGRADE_GOLD = [5, 20, 50, 150, 400, 1000, 2000, 4000];
  const MAX_LEVEL = 9;
  // Ogni livello rende la carta più forte del 10%
  const levelMul = (level) => Math.pow(1.1, level - 1);

  // ground: colori del terreno a scacchi; river: colore del fiume
  const ARENAS = [
    { name: 'Sparta', icon: '🏛️', trophies: 0, ground: ['#8fb35a', '#86a952'], river: '#4aa3df', sky: '#5d8a3a' },
    { name: 'Labirinto di Creta', icon: '🌀', trophies: 300, ground: ['#c2b28a', '#b8a77f'], river: '#4aa3df', sky: '#8c7a55' },
    { name: 'Mura di Troia', icon: '🐴', trophies: 600, ground: ['#cdb27c', '#c3a873'], river: '#3f95cf', sky: '#9a7b45' },
    { name: 'Isola dei Ciclopi', icon: '🌊', trophies: 1000, ground: ['#7fb77e', '#76ad75'], river: '#2f86c9', sky: '#3c7a6a' },
    { name: 'Colosseo', icon: '🏟️', trophies: 1400, ground: ['#dcc095', '#d2b58a'], river: '#4aa3df', sky: '#a5784a' },
    { name: 'Inferi di Ade', icon: '🔥', trophies: 1800, ground: ['#5a4a5f', '#524357'], river: '#d9572b', sky: '#2c2030' },
    { name: 'Monte Olimpo', icon: '⚡', trophies: 2300, ground: ['#e3e9f2', '#d7dfea'], river: '#8fc3ef', sky: '#7f9cc4' },
  ];

  // Statistiche al livello 1. Distanze in caselle (il campo è 18 x 32), tempi in secondi.
  // speed: caselle al secondo; range: distanza di attacco dal bordo del bersaglio;
  // hitsAir: può colpire chi vola; targets 'buildings': attacca solo torri e costruzioni.
  const CARDS = [
    // --- Arena 1: Sparta ---
    { key: 'oplita', name: 'Oplita', emoji: '🛡️', rarity: 'comune', arena: 0, type: 'troop', cost: 3,
      desc: 'Soldato spartano con scudo e lancia. Resistente e affidabile.',
      count: 1, hp: 1400, dmg: 160, hitSpeed: 1.2, range: 0.8, speed: 1, radius: 0.5 },
    { key: 'arcieri', name: 'Arcieri cretesi', emoji: '🏹', rarity: 'comune', arena: 0, type: 'troop', cost: 3,
      desc: 'Due arcieri che colpiscono da lontano, anche chi vola.',
      count: 2, hp: 250, dmg: 85, hitSpeed: 0.9, range: 5, speed: 1, radius: 0.4, hitsAir: true, shot: 'freccia' },
    { key: 'frombolieri', name: 'Frombolieri', emoji: '🪨', rarity: 'comune', arena: 0, type: 'troop', cost: 2,
      desc: 'Tre fanti veloci che lanciano pietre con la fionda.',
      count: 3, hp: 110, dmg: 60, hitSpeed: 1.7, range: 5, speed: 1.5, radius: 0.35, hitsAir: true, shot: 'pietra' },
    { key: 'arpie', name: 'Arpie', emoji: '🦅', rarity: 'comune', arena: 0, type: 'troop', cost: 3,
      desc: 'Tre creature alate: volano sopra il fiume e attaccano tutto.',
      count: 3, hp: 190, dmg: 80, hitSpeed: 1, range: 1.6, speed: 1.5, radius: 0.4, flying: true, hitsAir: true },
    { key: 'scheletri', name: 'Scheletri di Ade', emoji: '💀', rarity: 'comune', arena: 0, type: 'troop', cost: 1,
      desc: 'Tre scheletri fragili ma veloci. Ottimi per distrarre.',
      count: 3, hp: 70, dmg: 70, hitSpeed: 1, range: 0.6, speed: 1.5, radius: 0.35 },
    { key: 'legionari', name: 'Legionari', emoji: '⚔️', rarity: 'comune', arena: 0, type: 'troop', cost: 5,
      desc: 'Cinque soldati romani: un muro di spade.',
      count: 5, hp: 520, dmg: 140, hitSpeed: 1.4, range: 0.7, speed: 1, radius: 0.45 },
    { key: 'lancia', name: 'Lancia di Atena', emoji: '🦉', rarity: 'comune', arena: 0, type: 'spell', cost: 2,
      desc: 'Un lampo della dea: piccoli danni in un\'area e blocca i nemici per un attimo.',
      radius: 2.5, dmg: 200, stun: 0.5, delay: 0.2 },
    { key: 'centauro', name: 'Centauro', emoji: '🏇', rarity: 'rara', arena: 0, type: 'troop', cost: 4,
      desc: 'Dopo una breve corsa parte alla carica: il primo colpo fa danno doppio.',
      count: 1, hp: 1150, dmg: 230, hitSpeed: 1.5, range: 0.9, speed: 1.5, radius: 0.6, charge: true },
    { key: 'fuoco', name: 'Fuoco greco', emoji: '🔥', rarity: 'rara', arena: 0, type: 'spell', cost: 4,
      desc: 'Una palla di fuoco che brucia tutto in un\'area.',
      radius: 2.5, dmg: 520, delay: 0.8 },

    // --- Arena 2: Labirinto di Creta ---
    { key: 'minotauro', name: 'Minotauro', emoji: '🐂', rarity: 'rara', arena: 1, type: 'troop', cost: 5,
      desc: 'Lento ma fortissimo: incassa e restituisce colpi pesanti.',
      count: 1, hp: 2600, dmg: 320, hitSpeed: 1.8, range: 0.9, speed: 0.75, radius: 0.75 },
    { key: 'testuggine', name: 'Testuggine romana', emoji: '🐢', rarity: 'rara', arena: 1, type: 'troop', cost: 4,
      desc: 'Quattro legionari con gli scudi: frecce e torri fanno metà danno.',
      count: 4, hp: 430, dmg: 100, hitSpeed: 1.2, range: 0.7, speed: 0.75, radius: 0.45, shield: true },
    { key: 'gladiatore', name: 'Gladiatore', emoji: '🔱', rarity: 'rara', arena: 1, type: 'troop', cost: 4,
      desc: 'Il campione del Colosseo: pochi colpi ma devastanti.',
      count: 1, hp: 900, dmg: 380, hitSpeed: 1.6, range: 0.8, speed: 1, radius: 0.5 },

    // --- Arena 3: Mura di Troia ---
    { key: 'cavallo', name: 'Cavallo di Troia', emoji: '🐴', rarity: 'epica', arena: 2, type: 'building', cost: 5,
      desc: 'Un enorme cavallo di legno. Quando si rompe escono quattro guerrieri achei.',
      hp: 1600, lifetime: 25, radius: 1, spawnOnDeath: { key: 'acheo', count: 4 } },
    { key: 'balista', name: 'Balista romana', emoji: '🎯', rarity: 'rara', arena: 2, type: 'building', cost: 4,
      desc: 'Difesa fissa che scaglia grandi dardi su terra e aria.',
      hp: 900, dmg: 120, hitSpeed: 0.9, range: 6.5, lifetime: 30, radius: 0.9, hitsAir: true, shot: 'dardo' },
    { key: 'vaso', name: 'Vaso di Pandora', emoji: '🏺', rarity: 'rara', arena: 2, type: 'troop', cost: 3,
      desc: 'Aprilo e liberi sei piccoli mali volanti, velocissimi.',
      unit: 'male', count: 6 },

    // --- Arena 4: Isola dei Ciclopi ---
    { key: 'ciclope', name: 'Ciclope', emoji: '👁️', rarity: 'epica', arena: 3, type: 'troop', cost: 5,
      desc: 'Gigante con un occhio solo: ignora le truppe e punta dritto alle torri.',
      count: 1, hp: 3400, dmg: 210, hitSpeed: 1.5, range: 0.9, speed: 0.75, radius: 0.85, targets: 'buildings' },
    { key: 'sirene', name: 'Sirene', emoji: '🧜‍♀️', rarity: 'epica', arena: 3, type: 'troop', cost: 4,
      desc: 'Due sirene: col loro canto attirano i nemici vicini, che attaccano solo loro.',
      count: 2, hp: 450, dmg: 70, hitSpeed: 1.2, range: 5, speed: 1, radius: 0.45, hitsAir: true, taunt: 4, shot: 'nota' },
    { key: 'satiro', name: 'Satiro guaritore', emoji: '🐐', rarity: 'rara', arena: 3, type: 'troop', cost: 3,
      desc: 'Suona il flauto e cura le truppe amiche vicine.',
      count: 1, hp: 600, dmg: 70, hitSpeed: 1.2, range: 0.7, speed: 1, radius: 0.45, heal: { radius: 3, amount: 70, every: 1 } },

    // --- Arena 5: Colosseo ---
    { key: 'medusa', name: 'Medusa', emoji: '🐍', rarity: 'epica', arena: 4, type: 'troop', cost: 4,
      desc: 'Il suo sguardo pietrifica: ogni colpo blocca il nemico per un secondo.',
      count: 1, hp: 700, dmg: 120, hitSpeed: 1.5, range: 5, speed: 1, radius: 0.5, hitsAir: true, stunOnHit: 1, shot: 'sguardo' },
    { key: 'pegaso', name: 'Pegaso', emoji: '🐎', rarity: 'epica', arena: 4, type: 'troop', cost: 4,
      desc: 'Il cavallo alato: vola sopra il fiume e colpisce terra e aria.',
      count: 1, hp: 1000, dmg: 170, hitSpeed: 1.2, range: 0.9, speed: 1.5, radius: 0.6, flying: true, hitsAir: true, wings: true },

    // --- Arena 6: Inferi di Ade ---
    { key: 'cerbero', name: 'Cerbero', emoji: '🐺', rarity: 'epica', arena: 5, type: 'troop', cost: 5,
      desc: 'Il cane a tre teste: ogni colpo morde fino a tre nemici.',
      count: 1, hp: 2000, dmg: 130, hitSpeed: 1.1, range: 1.2, speed: 1, radius: 0.7, multi: 3 },
    { key: 'idra', name: 'Idra di Lerna', emoji: '🐉', rarity: 'leggendaria', arena: 5, type: 'troop', cost: 6,
      desc: 'Più la ferisci, più teste le crescono (fino a 4): e ogni testa fa danno.',
      count: 1, hp: 1900, dmg: 90, hitSpeed: 1.2, range: 4, speed: 0.75, radius: 0.75, splash: 1, hitsAir: true, heads: true, shot: 'fiamma' },

    // --- Arena 7: Monte Olimpo ---
    { key: 'ercole', name: 'Ercole', emoji: '💪', rarity: 'leggendaria', arena: 6, type: 'troop', cost: 5,
      desc: 'L\'eroe delle dodici fatiche: la sua clava colpisce tutti i nemici intorno.',
      count: 1, hp: 2400, dmg: 380, hitSpeed: 1.4, range: 0.9, speed: 1, radius: 0.6, splash: 1.3 },
    { key: 'fulmine', name: 'Fulmine di Zeus', emoji: '⚡', rarity: 'leggendaria', arena: 6, type: 'spell', cost: 6,
      desc: 'Tre fulmini colpiscono i tre nemici più forti nell\'area e li bloccano.',
      radius: 3.5, dmg: 860, stun: 0.5, delay: 0.3, strikes: 3 },
  ];

  // Creature che non sono carte ma escono da altre carte
  const EXTRA = [
    { key: 'male', name: 'Male di Pandora', emoji: '🦇', type: 'troop',
      hp: 80, dmg: 45, hitSpeed: 1, range: 0.6, speed: 2, radius: 0.3, flying: true, hitsAir: true },
    { key: 'acheo', name: 'Guerriero acheo', emoji: '🗡️', type: 'troop',
      hp: 420, dmg: 110, hitSpeed: 1.1, range: 0.7, speed: 1, radius: 0.45 },
  ];

  // Torri (anche loro crescono di livello)
  const TOWERS = {
    princess: { name: 'Tempio', hp: 1400, dmg: 90, hitSpeed: 0.8, range: 7.5, radius: 1.5, hitsAir: true, shot: 'freccia' },
    king: { name: 'Tempio del Re', hp: 2400, dmg: 100, hitSpeed: 1, range: 7, radius: 2, hitsAir: true, shot: 'freccia' },
  };

  const BY_KEY = {};
  for (const c of CARDS.concat(EXTRA)) BY_KEY[c.key] = c;

  const START_DECK = ['oplita', 'arcieri', 'frombolieri', 'arpie', 'scheletri', 'legionari', 'lancia', 'fuoco'];

  function arenaFor(trophies) {
    let a = 0;
    for (let i = 0; i < ARENAS.length; i++) if (trophies >= ARENAS[i].trophies) a = i;
    return a;
  }

  // Bauli: tempo di apertura (secondi), monete e carte (moltiplicati per l'arena)
  const CHESTS = {
    legno: { name: 'Baule di legno', icon: '📦', time: 30, gold: [18, 30], cards: 4 },
    argento: { name: 'Baule d\'argento', icon: '🪙', time: 120, gold: [40, 60], cards: 10 },
    oro: { name: 'Baule d\'oro', icon: '💰', time: 300, gold: [120, 180], cards: 24, minRarity: 'rara' },
    magico: { name: 'Baule magico', icon: '🔮', time: 600, gold: [300, 420], cards: 50, minRarity: 'epica' },
    dono: { name: 'Dono degli dèi', icon: '🎁', time: 0, gold: [20, 40], cards: 3 },
  };
  // Ordine fisso dei bauli vinti, come un giro che ricomincia
  const CHEST_CYCLE = ['legno', 'legno', 'argento', 'legno', 'argento', 'oro', 'legno', 'argento', 'legno', 'magico'];

  const api = { RARITY, UPGRADE_GOLD, MAX_LEVEL, levelMul, ARENAS, CARDS, EXTRA, TOWERS, BY_KEY, START_DECK, arenaFor, CHESTS, CHEST_CYCLE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameData = api;
})(typeof self !== 'undefined' ? self : this);
