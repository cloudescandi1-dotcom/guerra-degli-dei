// Interfaccia di "Guerra degli Dèi": menu, battaglia, carte, bauli, arene, amici e clan.
(function () {
  'use strict';
  const D = GameData, E = Engine, P = Profile;
  const $ = (s) => document.querySelector(s);
  const store = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  let profile = P.load(store);
  const save = () => P.save(profile, store);
  Sound.setOn(profile.sound);

  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmtClock = (s) => { s = Math.ceil(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function fmtWait(ms) {
    const s = Math.ceil(ms / 1000);
    if (s >= 3600) return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
    if (s >= 60) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
    return s + 's';
  }
  const fmtHour = (t) => new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const FOE_NAMES = ['Leonida', 'Achille', 'Ettore', 'Aiace', 'Penelope', 'Ulisse', 'Atalanta', 'Pericle', 'Cassandra', 'Teseo', 'Ippolita', 'Spartaco', 'Giulia', 'Cornelia', 'Scipione'];
  const EMOTES = ['😀', '😂', '😡', '👍', '😱', '😴', '😭', '🤩'];
  const PHRASES = ['Buona fortuna!', 'Bella giocata!', 'Wow!', 'Grazie!', 'Bella partita!', 'Ops'];
  const BADGES = ['🏛️', '⚡', '🔱', '🦉', '🐺', '🐉', '🛡️', '🦅', '🌿', '☀️', '🌊', '🔥'];

  // ---------------------------------------------------------------- finestre e avvisi
  let modalClose = null;
  function modal(html, onClose) {
    $('#modal-body').innerHTML = html;
    $('#modal').hidden = false;
    modalClose = onClose || null;
    return $('#modal-body');
  }
  function closeModal() {
    if ($('#modal').hidden) return;
    $('#modal').hidden = true;
    $('#modal-body').innerHTML = '';
    const f = modalClose; modalClose = null;
    if (f) f();
  }
  $('#modal .close').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

  let toastTimer = null;
  function toast(text, ms) {
    const t = $('#toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms || 2200);
  }

  // Disegno del personaggio (immagine); se manca, l'emoji
  const art = (key, cls) => (Sprites.has(key) ? `<img class="${cls || 'art'}" src="${Sprites.url(key, 0)}" alt="" draggable="false">` : D.BY_KEY[key].emoji);

  const chestArt = (type, cls) => art('ch_' + type, cls || 'chest-art');

  // Disegno di una carta (HTML)
  function cardHtml(key, o) {
    o = o || {};
    const d = D.BY_KEY[key];
    const c = profile.cards[key];
    let extra = '';
    if (o.level !== false && c) {
      const up = P.upgradeInfo(profile, key);
      extra += `<span class="lv">Liv. ${c.level}</span>`;
      if (o.progress && up) extra += `<div class="prog"><div style="width:${Math.min(100, (c.count / up.copies) * 100)}%"></div></div>`;
    }
    if (o.count != null) extra += `<span class="n">×${o.count}</span>`;
    const cls = ['card', o.cls || '', !c && o.lockable ? 'locked' : '', o.progress && P.canUpgrade(profile, key) ? 'can-up' : ''].join(' ');
    return `<button type="button" class="${cls}" data-key="${key}" ${o.attrs || ''} style="--rc:${D.RARITY[d.rarity].color}">
      <span class="cost"><span>${d.cost}</span></span><span class="em">${art(key)}</span><span class="nm">${esc(d.name)}</span>${extra}</button>`;
  }

  // ---------------------------------------------------------------- barra in alto e schede
  let tab = 'battaglia';
  function renderTop() {
    $('#top-name').textContent = profile.name;
    $('#top-trophies').textContent = profile.trophies;
    $('#top-gold').textContent = profile.gold;
    $('#top-gems').textContent = profile.gems || 0;
    $('#top-level').textContent = Math.max(1, Math.round(P.avgLevel(profile)));
  }
  function render() {
    renderTop();
    if (tab === 'battaglia') renderBattleTab();
    else if (tab === 'carte') renderCards();
    else if (tab === 'clan') renderClan();
    else if (tab === 'negozio') renderShop();
    else if (tab === 'eventi') renderEvents();
  }

  // ---------------------------------------------------------------- scheda Negozio
  function renderShop() {
    const now = Date.now();
    const offers = P.shopOffers(profile, now);
    save();
    const offerHtml = offers.map((o) => {
      const d = D.BY_KEY[o.key];
      const afford = o.cur === 'gold' ? profile.gold >= o.price : profile.gems >= o.price;
      return `<div class="offer ${o.bought ? 'sold' : ''}">${cardHtml(o.key, { level: false, count: o.n })}
        <button class="btn small ${o.bought ? 'grey' : afford ? 'gold' : 'grey'}" data-buy="${o.key}" type="button" ${o.bought ? 'disabled' : ''}>
          ${o.bought ? 'Comprata' : (o.cur === 'gold' ? '🪙 ' : '💎 ') + o.price}</button>
        <small>${esc(D.RARITY[d.rarity].name)}</small></div>`;
    }).join('');
    const gemHtml = D.GEM_SHOP.map((it) => {
      const icon = it.kind === 'chest' ? chestArt(it.chest) : it.icon;
      const name = it.kind === 'chest' ? D.CHESTS[it.chest].name : it.name;
      const what = it.kind === 'chest' ? 'Si apre subito' : `🪙 ${it.amount} monete`;
      return `<div class="gem-item"><span class="ci">${icon}</span><div><b>${name}</b><small>${what}</small></div>
        <button class="btn small ${profile.gems >= it.price ? 'gold' : 'grey'}" data-gem="${it.id}" type="button">💎 ${it.price}</button></div>`;
    }).join('');
    $('#tab-negozio').innerHTML = `
      <h2>Offerte del giorno</h2>
      <p class="muted">Cambiano ogni giorno a mezzanotte (ora di Roma): nuove offerte tra <b>${fmtWait(P.msToRomeMidnight(now))}</b>.</p>
      <div class="offers">${offerHtml}</div>
      <h2>Con le gemme 💎 <small>— hai ${profile.gems || 0} gemme</small></h2>
      <div class="box">${gemHtml}</div>
      <p class="muted">Le gemme non si comprano: le trovi nei bauli e nel baule del giorno.</p>`;
    for (const b of document.querySelectorAll('[data-buy]')) b.onclick = () => {
      const o = offers.find((x) => x.key === b.dataset.buy);
      if (P.buyOffer(profile, b.dataset.buy, Date.now())) {
        save(); Sound.play('chest');
        toast(`Hai comprato ${o.n} × ${D.BY_KEY[o.key].name}!`);
        render();
      } else toast(o.cur === 'gold' ? 'Non hai abbastanza monete' : 'Non hai abbastanza gemme');
    };
    for (const b of document.querySelectorAll('[data-gem]')) b.onclick = () => {
      const it = D.GEM_SHOP.find((x) => x.id === b.dataset.gem);
      if (profile.gems < it.price) { toast('Non hai abbastanza gemme: le trovi nei bauli'); return; }
      const body = modal(`<div class="center"><h3>Comprare?</h3><p>Spendi <b>💎 ${it.price}</b> gemme.</p>
        <div class="row"><button class="btn grey" id="no" type="button">No</button><button class="btn gold" id="yes" type="button">Sì</button></div></div>`);
      body.querySelector('#no').onclick = closeModal;
      body.querySelector('#yes').onclick = () => {
        const r = P.buyGemItem(profile, it.id);
        save();
        if (r && r.cards) showReward(r);
        else { closeModal(); Sound.play('chest'); toast(`🪙 +${it.amount} monete`); }
        render();
      };
    };
  }
  for (const b of document.querySelectorAll('[data-go]')) b.onclick = () => document.querySelector(`.tabbar [data-tab=${b.dataset.go}]`).click();
  for (const b of document.querySelectorAll('.tabbar button')) {
    b.addEventListener('click', () => {
      Sound.unlock(); Sound.play('tap');
      tab = b.dataset.tab;
      pickKey = null;
      document.querySelectorAll('.tabbar button').forEach((x) => x.classList.toggle('active', x === b));
      document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x.id === 'tab-' + tab));
      if (tab === 'clan') { unread = 0; updateBadge(); }
      render();
    });
  }

  // ---------------------------------------------------------------- scheda Battaglia
  function renderBattleTab() {
    const a = P.arena(profile), ar = D.ARENAS[a], next = D.ARENAS[a + 1];
    const pct = next ? ((profile.trophies - ar.trophies) / (next.trophies - ar.trophies)) * 100 : 100;
    const now = Date.now();
    const chests = profile.chests.map((c, i) => {
      const st = P.chestState(c, now);
      if (st === 'vuoto') return `<div class="chest">Spazio<br>baule</div>`;
      const info = D.CHESTS[c.type];
      const label = st === 'pronto' ? '<b>APRI!</b>' : st === 'in apertura' ? `<b>${fmtWait(c.unlockAt - now)}</b>` : `<b>${fmtWait(info.time * 1000)}</b>`;
      return `<button type="button" class="chest full ${st === 'pronto' ? 'ready' : ''}" data-slot="${i}"><span class="ci">${chestArt(c.type)}</span>${label}<small>${D.ARENAS[c.arena].name.split(' ')[0]}</small></button>`;
    }).join('');
    const giftOk = P.giftReady(profile, now);
    const pend = P.roadPending(profile);
    $('#tab-battaglia').innerHTML = `
      <div id="arena-open" class="arena-cover c${a}" role="button" tabindex="0" style="--g1:${COVER_SKY[a][0]};--g2:${COVER_SKY[a][1]};--fl:${ar.ground[0]}">
        <div class="cover-rays"></div>
        <div class="cover-temple">${art('king', 'cover-king')}</div>
        <div class="cover-floor"></div>
        <div class="cover-chars">${D.CARDS.filter((c) => c.arena === a && c.type !== 'spell').slice(0, 3).map((c, i) => `<span class="cc cc${i}">${art(c.unit || c.key, 'cover-char')}</span>`).join('')}</div>
        ${pend ? `<span class="road-badge">🎁 ${pend}</span>` : ''}
        <div class="arena-tag">
          <h3>Arena ${a + 1} · ${esc(ar.name)}</h3>
          <p>🏆 ${profile.trophies}${next ? ' / ' + next.trophies : ''}</p>
          <div class="trophy-bar"><div style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>
        </div>
        <span class="arena-tap">Cammino degli Eroi ›</span>
      </div>
      <div class="battle-row">
        <button id="go-battle" class="btn gold battle-btn" type="button">Battaglia</button>
        <button id="go-friend" class="btn green side-btn" type="button"><span class="si">🤝</span>Amico</button>
      </div>
      <div class="chests">${chests}</div>
      <button type="button" class="gift" id="gift">
        <span class="gi">${chestArt('dono')}</span>
        <div><b>Baule del giorno</b><small>${giftOk ? 'Pronto: toccalo per aprirlo!' : 'Il prossimo a mezzanotte (ora di Roma), tra ' + fmtWait(P.msToRomeMidnight(now))}</small></div>
        <span class="btn small ${giftOk ? 'gold' : 'grey'}">${giftOk ? 'Apri' : '⏳'}</span>
      </button>`;
    $('#arena-open').onclick = () => { Sound.play('tap'); openRoad(); };
    $('#go-battle').onclick = () => startLadder();
    $('#go-friend').onclick = () => { tab = 'clan'; document.querySelector('[data-tab=clan]').click(); };
    $('#gift').onclick = () => {
      const r = P.openGift(profile, Date.now());
      if (!r) { toast('Il baule del giorno torna a mezzanotte'); return; }
      save(); showReward(r); render();
    };
    for (const el of document.querySelectorAll('.chest.full')) el.onclick = () => chestDialog(+el.dataset.slot);
  }

  // Colori del cielo della copertina di ogni arena (in alto e verso l'orizzonte)
  const COVER_SKY = [['#7fc4ff', '#ffe3a3'], ['#f2c98a', '#a8d77a'], ['#ffb36b', '#ffe0a8'], ['#5fc8ff', '#c9f1ff'],
    ['#ffcf8a', '#ffeacc'], ['#3a0c10', '#ff7a2a'], ['#cfe6ff', '#fff6d6']];
  const home = { canvas: null, r: null, key: '' };
  function homeArena(a) {
    const box = $('#arena-view');
    if (!box) return;
    if (!home.canvas) {
      home.canvas = document.createElement('canvas');
      home.r = Render.create(home.canvas, { top: 5.4, bot: 1.6 });
      home.state = Engine.createMatch({ decks: [D.START_DECK, D.START_DECK], seed: 1 });
    }
    box.replaceWith(home.canvas);
    home.canvas.id = 'arena-view';
    const rect = home.canvas.getBoundingClientRect();
    const key = a + ':' + Math.round(rect.width) + 'x' + Math.round(rect.height);
    if (key === home.key || !rect.width) return;
    home.key = key;
    home.r.setArena(a);
    home.r.resize();
    home.r.draw(home.state);
    // i disegni potrebbero non essere ancora pronti: si ridisegna poco dopo
    setTimeout(() => { home.r.draw(home.state); }, 600);
    setTimeout(() => { home.r.draw(home.state); }, 2000);
  }
  window.addEventListener('resize', () => { home.key = ''; if (tab === 'battaglia' && !B) renderBattleTab(); });

  function chestDialog(slot) {
    const now = Date.now();
    const c = profile.chests[slot];
    const st = P.chestState(c, now);
    const info = D.CHESTS[c.type];
    if (st === 'pronto') {
      const r = P.openChest(profile, slot, now);
      save(); showReward(r); render();
      return;
    }
    const busy = profile.chests.some((x) => P.chestState(x, now) === 'in apertura');
    const body = modal(`<div class="center"><div>${chestArt(c.type, 'chest-big')}</div><h3>${info.name}</h3>
      <p>Arena: ${esc(D.ARENAS[c.arena].name)}<br>Contiene circa ${Math.round(info.cards * (1 + c.arena * 0.25))} carte e delle monete.</p>
      ${st === 'in apertura' ? `<p>Si apre tra <b>${fmtWait(c.unlockAt - now)}</b></p>`
        : busy ? '<p class="muted">Stai già aprendo un altro baule: uno alla volta!</p>'
          : `<p>Tempo di apertura: <b>${fmtWait(info.time * 1000)}</b></p><button id="unlock" class="btn gold full" type="button">Inizia ad aprire</button>`}
      <button id="skip" class="btn full" type="button">Apri subito per 💎 ${P.skipCost(c, now)}</button></div>`);
    const u = body.querySelector('#unlock');
    if (u) u.onclick = () => { P.startUnlock(profile, slot, Date.now()); save(); closeModal(); render(); };
    body.querySelector('#skip').onclick = () => {
      const r = P.skipChest(profile, slot, Date.now());
      if (!r) { toast('Non hai abbastanza gemme: le trovi nei bauli'); return; }
      save(); showReward(r); render();
    };
  }

  function showReward(r) {
    Sound.play('chest');
    const cards = Object.entries(r.cards).map(([k, n]) => cardHtml(k, { count: n, level: false, cls: '' })).join('');
    const body = modal(`<div class="center"><div class="chest-pop">${chestArt(r.type, 'chest-big')}</div><h3>${D.CHESTS[r.type].name}</h3>
      <p>🪙 <b>+${r.gold}</b> monete${r.gems ? ` &nbsp; 💎 <b>+${r.gems}</b> gemme` : ''}</p></div><div class="reward">${cards}</div>
      <button class="btn gold full" type="button" id="reward-ok" style="width:100%">Fantastico!</button>`);
    body.querySelector('#reward-ok').onclick = closeModal;
    renderTop();
  }

  function trainDialog() {
    const body = modal(`<h3>🎯 Allenamento</h3><p>Una battaglia di prova contro il computer: non si vincono né si perdono coppe.</p>
      <div class="row"><button class="btn green" data-l="facile" type="button">Facile</button>
      <button class="btn" data-l="medio" type="button">Medio</button>
      <button class="btn red" data-l="difficile" type="button">Difficile</button></div>`);
    for (const b of body.querySelectorAll('[data-l]')) b.onclick = () => { closeModal(); startVsBot('train', b.dataset.l); };
  }

  function startLadder() {
    const a = P.arena(profile);
    const level = a <= 1 ? 'facile' : a <= 4 ? 'medio' : 'difficile';
    startVsBot('ladder', level);
  }

  function startTour() {
    if (!profile.tour || profile.tour.done) {
      if (!P.tourStart(profile, Date.now())) { toast(`Servono 💎 ${P.TOUR_RETRY_GEMS} gemme per rientrare oggi`); return; }
      save();
    }
    startVsBot('tour', P.tourDifficulty(profile.tour.wins));
  }

  function startVsBot(mode, level) {
    const a = P.arena(profile);
    const pool = D.CARDS.filter((c) => c.arena <= a).map((c) => c.key);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const foeDeck = pool.slice(0, 8);
    let avg = Math.max(1, Math.round(P.avgLevel(profile)));
    // nel torneo tutte le carte sono allo stesso livello
    const myLv = mode === 'tour' ? Object.fromEntries(profile.deck.map((k) => [k, P.TOUR_LEVEL])) : P.deckLevels(profile);
    if (mode === 'tour') avg = P.TOUR_LEVEL;
    const foeLv = {};
    for (const k of foeDeck) foeLv[k] = Math.max(1, Math.min(D.MAX_LEVEL, avg + (level === 'difficile' && mode === 'ladder' ? 0 : 0)));
    startBattle({
      mode, me: 0, role: 'local', arena: a,
      foeName: FOE_NAMES[Math.floor(Math.random() * FOE_NAMES.length)], foeLevel: avg,
      foeSub: mode === 'tour' ? 'Torneo degli Dèi' : mode === 'ladder' ? 'Arena ' + (a + 1) + ' · ' + D.ARENAS[a].name : 'Allenamento',
      bot: Bot.createBot(level, Math.floor(Math.random() * 1e9)),
      match: { decks: [profile.deck.slice(), foeDeck], levels: [myLv, foeLv], towerLevels: [avg, avg], seed: Math.floor(Math.random() * 1e9) },
    });
  }

  // ---------------------------------------------------------------- scheda Eventi
  // Le 12 caselle delle vittorie del torneo e le 3 delle sconfitte
  function tourTrack(t) {
    t = t || { wins: 0, losses: 0 };
    let w = '';
    for (let i = 0; i < P.TOUR_MAX_WINS; i++) w += `<span class="tw ${i < t.wins ? 'on' : ''}">${i < t.wins ? '🏆' : i + 1}</span>`;
    let l = '';
    for (let i = 0; i < P.TOUR_MAX_LOSSES; i++) l += `<span class="tl ${i < t.losses ? 'on' : ''}">✕</span>`;
    return `<div class="tour-wins">${w}</div><div class="tour-losses">${l}</div>`;
  }
  function renderEvents() {
    const now = Date.now(), t = profile.tour;
    const prize = P.tourPrize(t ? t.wins : 0);
    const best = P.tourPrize(P.TOUR_MAX_WINS);
    const prizeHtml = (pr) => `🪙 ${pr.gold}${pr.gems ? ` · 💎 ${pr.gems}` : ''}${pr.chest ? ` · ${D.CHESTS[pr.chest].name}` : ''}`;
    let action;
    if (t && t.done) action = `<button id="tour-claim" class="btn green full" type="button">Ritira i premi</button>`;
    else if (t) action = `<div class="row"><button id="tour-play" class="btn gold" type="button">Gioca (${t.wins} vittorie)</button><button id="tour-claim" class="btn grey" type="button">Ritira ora</button></div>`;
    else action = `<button id="tour-play" class="btn gold full" type="button">${P.tourFree(profile, now) ? 'Entra gratis' : `Entra per 💎 ${P.TOUR_RETRY_GEMS}`}</button>`;
    $('#tab-eventi').innerHTML = `
      <div class="event-card tour">
        <div class="event-head"><span class="ev-ico">🏆</span><div><h3>Torneo degli Dèi</h3><small>Carte tutte al livello ${P.TOUR_LEVEL} · avversari sempre più forti</small></div></div>
        ${tourTrack(t)}
        <p class="ev-text">Vinci fino a <b>${P.TOUR_MAX_WINS}</b> battaglie prima di perderne <b>${P.TOUR_MAX_LOSSES}</b>. Più vinci, più ricchi sono i premi.</p>
        <div class="ev-prize"><span>Premio adesso</span><b>${prizeHtml(prize)}</b></div>
        <div class="ev-prize max"><span>Con 12 vittorie</span><b>${prizeHtml(best)}</b></div>
        ${action}
        <small class="ev-note">Un ingresso gratis al giorno (si rinnova a mezzanotte, ora di Roma).</small>
      </div>
      <div class="event-card train">
        <div class="event-head"><span class="ev-ico">🎯</span><div><h3>Allenamento</h3><small>Prova i mazzi: niente coppe, niente rischi</small></div></div>
        <div class="row">
          <button class="btn green" data-l="facile" type="button">Facile</button>
          <button class="btn" data-l="medio" type="button">Medio</button>
          <button class="btn red" data-l="difficile" type="button">Difficile</button>
        </div>
      </div>`;
    for (const b of document.querySelectorAll('#tab-eventi [data-l]')) b.onclick = () => startVsBot('train', b.dataset.l);
    const play = $('#tour-play');
    if (play) play.onclick = () => { startTour(); };
    const claim = $('#tour-claim');
    if (claim) claim.onclick = () => {
      const r = P.tourClaim(profile, P.arena(profile));
      save();
      if (r.chest) showReward(Object.assign({}, r.chest, { gold: r.chest.gold + r.gold, gems: (r.chest.gems || 0) + r.gems }));
      else { Sound.play('chest'); toast(`🪙 +${r.gold}${r.gems ? `  💎 +${r.gems}` : ''}`); }
      render();
    };
  }

  // ---------------------------------------------------------------- Cammino degli Eroi
  function openRoad() {
    $('#road').hidden = false;
    renderRoad(true);
  }
  $('#road-close').onclick = () => { $('#road').hidden = true; render(); };
  // Colori delle "piattaforme" dei premi in ogni arena (piano e bordo) e oggetti decorativi
  const SLAB = [['#d8c39a', '#9c8258'], ['#efe8d8', '#b7a98c'], ['#d6a56a', '#93622e'], ['#a9d8e6', '#5f98ad'],
    ['#ecd6a6', '#b4955c'], ['#7a5560', '#46293a'], ['#f6f1e4', '#c9b98f']];
  // Oggetti decorativi accanto ai premi: tutte le carte del gioco, in un ordine fisso mescolato,
  // così due piattaforme vicine non hanno mai lo stesso disegno
  const PROPS = D.CARDS.map((c) => c.key).sort((a, b) => ((a.length * 7 + a.charCodeAt(0)) % 11) - ((b.length * 7 + b.charCodeAt(0)) % 11) || (a < b ? -1 : 1));
  function renderRoad(scroll) {
    const cur = P.arena(profile), list = $('#road-list');
    // in cima: il monte Olimpo tra le nuvole, per le arene che arriveranno
    let html = `<div class="rwrap"><div class="rbar"><div class="rbar-fill"></div></div>
      <div class="rsummit"><img class="summit-art" alt="" src="${ArenaArt.summitUrl()}">
        <div class="summit-ribbon"><b>Nuove arene</b><small>In arrivo a breve!</small></div></div>`;
    let n = 0;
    // dall'alto (Olimpo) al basso (Sparta): si sale verso gli dèi
    for (let i = D.ARENAS.length - 1; i >= 0; i--) {
      const a = D.ARENAS[i];
      for (const r of P.road(i).slice().reverse()) {
        const got = profile.roadClaimed.includes(r.t), ready = P.roadReady(profile, r);
        const pic = r.kind === 'chest' ? chestArt(r.chest) : `<span class="pico">${r.kind === 'gold' ? '🪙' : '💎'}</span>`;
        const amount = r.kind === 'chest' ? '' : `<b class="pamt">${r.amount}</b>`;
        const title = r.kind === 'chest' ? D.CHESTS[r.chest].name : r.kind === 'gold' ? `${r.amount} monete` : `${r.amount} gemme`;
        const prize = `<button class="prize ${ready ? 'ready' : ''} ${got ? 'got' : ''}" type="button" title="${esc(title)}" ${ready ? `data-road="${i}:${r.t}"` : `data-info="${esc(title)}"`}>
          ${amount}${pic}${got ? '<i class="chk">✔</i>' : ''}${ready ? '<em class="tap">Ritira!</em>' : ''}</button>`;
        const prop = `<span class="prop">${art(PROPS[(r.t / 50) % PROPS.length], 'prop-art')}</span>`;   // r.t/50 = numero della piattaforma
        const side = n++ % 2 === 0;
        html += `<div class="rrow" data-t="${r.t}"><span class="rt">${r.t}</span>
          <div class="slab" style="--s1:${SLAB[i][0]};--s2:${SLAB[i][1]}">${side ? prop : prize}<span class="carpet"></span>${side ? prize : prop}</div></div>`;
      }
      const cards = D.CARDS.filter((c) => c.arena === i).map((c) => `<span class="shield" style="--rc:${D.RARITY[c.rarity].color}">${art(c.key, 'shield-art')}</span>`).join('');
      html += `<div class="rarena ${i === cur ? 'current' : ''}">
        <button class="diorama" type="button" data-detail="${i}" aria-label="Dettagli dell'arena ${i + 1}"><span class="dio-view"><img alt="" src="${ArenaArt.url(i, a)}"></span></button>
        <h3 class="rname">${esc(a.name)}</h3>
        <div class="rbanner-row" data-t="${a.trophies}"><span class="rt">${a.trophies}</span>
          <div class="rbanner"><span class="crownlv">${i + 1}</span><b>ARENA ${i + 1}</b><span class="rtro">🏆 ${a.trophies}</span></div></div>
        <p class="unl">Carte sbloccate:</p><div class="unl-cards">${cards}</div>
      </div>`;
    }
    html += `<div class="you-tag">🏆 ${profile.trophies}</div></div>`;
    list.innerHTML = html;
    for (const b of list.querySelectorAll('[data-road]')) b.onclick = () => {
      const [i, t] = b.dataset.road.split(':').map(Number);
      const r = P.claimRoad(profile, i, t);
      if (!r) return;
      save();
      if (r.cards) showReward(r); else { Sound.play('chest'); toast(r.gold ? `🪙 +${r.gold} monete` : `💎 +${r.gems} gemme`); }
      renderRoad(false); renderTop();
    };
    for (const b of list.querySelectorAll('[data-info]')) b.onclick = () => toast(b.dataset.info);
    for (const b of list.querySelectorAll('[data-detail]')) b.onclick = () => arenaDialog(+b.dataset.detail);
    requestAnimationFrame(() => { placeYou(); if (scroll) scrollToYou(false); });
  }
  // Etichetta delle coppe sulla barra a sinistra, tra il premio sotto e quello sopra
  function placeYou() {
    const wrap = $('#road-list .rwrap');
    if (!wrap) return;
    const top0 = wrap.getBoundingClientRect().top;
    const pts = [...wrap.querySelectorAll('[data-t]')].map((el) => {
      const r = el.querySelector('.rt').getBoundingClientRect();
      return { t: +el.dataset.t, y: r.top + r.height / 2 - top0 };
    }).sort((a, b) => a.t - b.t);
    const T = profile.trophies;
    let lo = pts[0], hi = null;
    for (const p of pts) { if (p.t <= T) lo = p; else { hi = p; break; } }
    const y = hi ? lo.y + ((T - lo.t) / (hi.t - lo.t)) * (hi.y - lo.y) : lo.y;
    const bottom = pts[0].y, top = pts[pts.length - 1].y;
    const bar = wrap.querySelector('.rbar');
    bar.style.top = top + 'px'; bar.style.height = (bottom - top) + 'px';
    wrap.querySelector('.rbar-fill').style.height = Math.max(0, bottom - y) + 'px';
    const tag = wrap.querySelector('.you-tag');
    tag.style.top = y + 'px';
  }
  function scrollToYou(smooth) {
    const list = $('#road-list'), tag = list.querySelector('.you-tag');
    if (tag) list.scrollTo({ top: tag.offsetTop - list.clientHeight * 0.6, behavior: smooth ? 'smooth' : 'auto' });
  }
  $('#road-me').onclick = () => scrollToYou(true);
  window.addEventListener('resize', () => { if (!$('#road').hidden) placeYou(); });

  // ---------------------------------------------------------------- scheda Carte
  let pickKey = null;   // carta scelta da mettere nel mazzo
  function renderCards() {
    const deck = profile.deck;
    const avg = deck.reduce((s, k) => s + D.BY_KEY[k].cost, 0) / 8;
    const owned = D.CARDS.filter((c) => profile.cards[c.key] && !deck.includes(c.key)).sort((a, b) => a.cost - b.cost);
    const locked = D.CARDS.filter((c) => !profile.cards[c.key]);
    const found = D.CARDS.length - locked.length;
    $('#tab-carte').innerHTML = `
      <h2>Il tuo mazzo</h2>
      ${pickKey ? `<p class="muted">Tocca la carta del mazzo da sostituire con <b>${esc(D.BY_KEY[pickKey].name)}</b>. <button class="btn small grey" id="pick-cancel" type="button">Annulla</button></p>` : ''}
      <div class="deck-grid">${deck.map((k, i) => cardHtml(k, { progress: true, cls: pickKey ? 'pick' : '', attrs: `data-slot="${i}"` })).join('')}</div>
      <p class="avg">Costo medio in ambrosia: <b>${avg.toFixed(1)}</b></p>
      <h2>Collezione <small>— ${found}/${D.CARDS.length} carte trovate</small></h2>
      <div class="card-grid">${owned.map((c) => cardHtml(c.key, { progress: true })).join('') || '<p class="muted">Tutte le tue carte sono nel mazzo.</p>'}</div>
      ${locked.length ? `<h2>Da scoprire</h2><div class="card-grid">${locked.map((c) => cardHtml(c.key, { level: false, lockable: true, attrs: `title="Arena ${c.arena + 1}"` })).join('')}</div>` : ''}`;
    const cancel = $('#pick-cancel');
    if (cancel) cancel.onclick = () => { pickKey = null; renderCards(); };
    for (const el of document.querySelectorAll('#tab-carte .card')) {
      el.onclick = () => {
        Sound.play('tap');
        if (pickKey && el.dataset.slot != null) {
          P.setDeckCard(profile, +el.dataset.slot, pickKey);
          pickKey = null; save(); renderCards();
          return;
        }
        cardDialog(el.dataset.key);
      };
    }
  }

  function statsHtml(key, level) {
    const d = D.BY_KEY[key], m = D.levelMul(level || 1);
    const rows = [];
    const add = (label, value) => rows.push(`<div>${label}<b>${value}</b></div>`);
    if (d.type === 'spell') {
      add('Danno', Math.round(d.dmg * m));
      add('Raggio', d.radius + ' caselle');
      add('Danno ai templi', '35%');
      if (d.stun) add('Blocca per', d.stun + ' s');
      return rows.join('');
    }
    const u = D.BY_KEY[d.unit || key];
    add('Vita', Math.round(u.hp * m));
    if (u.dmg) add('Danno', Math.round(u.dmg * m) + (d.multi ? ' ×3 bersagli' : '') + (u.splash ? ' (ad area)' : ''));
    if (u.dmg) add('Colpisce ogni', u.hitSpeed + ' s');
    if (u.dmg) add('Gittata', u.range < 2 ? 'Corpo a corpo' : u.range + ' caselle');
    if (u.speed) add('Velocità', u.speed <= 0.75 ? 'Lenta' : u.speed <= 1 ? 'Media' : u.speed <= 1.5 ? 'Veloce' : 'Velocissima');
    if ((d.count || 1) > 1) add('Quantità', '×' + d.count);
    if (u.dmg) add('Bersagli', u.targets === 'buildings' ? 'Solo templi e costruzioni' : u.hitsAir ? 'Terra e aria' : 'Solo terra');
    if (u.flying) add('Movimento', 'Vola');
    if (d.lifetime) add('Durata', d.lifetime + ' s');
    return rows.join('');
  }

  function cardDialog(key) {
    const d = D.BY_KEY[key], c = profile.cards[key], r = D.RARITY[d.rarity];
    const up = c && P.upgradeInfo(profile, key);
    const inDeck = profile.deck.includes(key);
    const body = modal(`<div class="card-detail">
      <div class="big">${art(key, 'art big-art')}</div><h3>${esc(d.name)}</h3>
      <span class="rar" style="background:${r.color}">${r.name}</span>
      <span class="rar" style="background:#f0abfc">💧 ${d.cost}</span>
      ${c ? `<span class="rar" style="background:var(--gold)">Livello ${c.level}</span>` : `<span class="rar" style="background:#999">Arena ${d.arena + 1}</span>`}
      <p>${esc(d.desc)}</p>
      <div class="stats">${statsHtml(key, c ? c.level : 1)}</div>
      ${!c ? `<p class="muted">Si sblocca raggiungendo l'arena ${d.arena + 1}: ${esc(D.ARENAS[d.arena].name)}.</p>`
        : up ? `<p>Copie: <b>${c.count}/${up.copies}</b> · Costo: 🪙 <b>${up.gold}</b></p>
          <button id="up" class="btn green full" type="button" ${P.canUpgrade(profile, key) ? '' : 'disabled'}>⬆️ Potenzia al livello ${c.level + 1}</button>`
          : '<p><b>Livello massimo!</b></p>'}
      ${c && !inDeck ? '<button id="use" class="btn gold full" type="button">Metti nel mazzo</button>' : ''}
      </div>`);
    const upb = body.querySelector('#up');
    if (upb) upb.onclick = () => {
      if (P.upgrade(profile, key)) { save(); Sound.play('chest'); toast(`${d.name} è ora al livello ${profile.cards[key].level}!`); closeModal(); render(); }
      else toast(c.count < up.copies ? 'Servono altre copie: le trovi nei bauli' : 'Non hai abbastanza monete');
    };
    const use = body.querySelector('#use');
    if (use) use.onclick = () => { pickKey = key; closeModal(); renderCards(); window.scrollTo(0, 0); $('#tab-carte').scrollTop = 0; };
  }

  // Scheda di un'arena: ricompense del cammino dei trofei, carte che sblocca, bauli e le tue battaglie
  function arenaDialog(i) {
    const a = D.ARENAS[i], cur = P.arena(profile);
    const st = (profile.arenaStats || {})[i] || { w: 0, l: 0, d: 0, chests: 0 };
    const played = st.w + st.l + st.d;
    const status = i < cur ? '✅ Superata' : i === cur ? '📍 Sei qui' : `🔒 Mancano ${a.trophies - profile.trophies} coppe`;
    const cards = D.CARDS.filter((c) => c.arena === i);
    const road = P.road(i).map((r) => {
      const got = profile.roadClaimed.includes(r.t), ready = P.roadReady(profile, r);
      const pic = r.kind === 'chest' ? chestArt(r.chest) : r.kind === 'gold' ? '<span class="big-ico">🪙</span>' : '<span class="big-ico">💎</span>';
      const what = r.kind === 'chest' ? D.CHESTS[r.chest].name : r.kind === 'gold' ? `${r.amount} monete` : `${r.amount} gemme`;
      return `<div class="road-step ${got ? 'got' : ready ? 'ready' : ''}"><div class="road-t">🏆 ${r.t}</div>${pic}<small>${what}</small>
        ${got ? '<span class="road-ok">✔ Ritirato</span>' : ready ? `<button class="btn small gold" data-road="${r.t}" type="button">Ritira</button>` : '<span class="road-lock">🔒</span>'}</div>`;
    }).join('');
    const chests = ['legno', 'argento', 'oro', 'magico'].map((t) => {
      const info = D.CHESTS[t];
      const n = Math.round(info.cards * (1 + i * 0.25));
      const g = info.gold.map((x) => Math.round(x * (1 + i * 0.3)));
      return `<div class="chest-row"><span class="ci">${chestArt(t)}</span><div><b>${info.name}</b>
        <small>${n} carte · 🪙 ${g[0]}–${g[1]}${info.gems ? ' · a volte 💎' : ''} · si apre in ${fmtWait(info.time * 1000)}${info.minRarity ? ' · almeno una ' + D.RARITY[info.minRarity].name.toLowerCase() : ''}</small></div></div>`;
    }).join('');
    const pending = P.road(i).filter((r) => P.roadReady(profile, r)).length;
    const body = modal(`<div class="arena-detail" style="background:linear-gradient(${a.sky}, ${a.ground[0]})">
        <button class="nav prev" type="button" ${i === 0 ? 'disabled' : ''}>‹</button>
        <button class="nav next" type="button" ${i === D.ARENAS.length - 1 ? 'disabled' : ''}>›</button>
        <div class="icon">${a.icon}</div><h3>Arena ${i + 1}: ${esc(a.name)}</h3><p>🏆 da ${a.trophies} coppe · ${status}</p></div>
      <h2>Ricompense delle coppe ${pending ? `<small>— ${pending} da ritirare!</small>` : ''}</h2>
      <div class="road">${road}</div>
      <h2>Carte che sblocca</h2>
      <div class="card-grid unlocks">${cards.map((c) => cardHtml(c.key, { level: !!profile.cards[c.key], cls: profile.cards[c.key] ? '' : 'to-unlock' })).join('')}</div>
      <h2>Le tue battaglie qui</h2>
      ${played ? `<div class="stats"><div>Vittorie<b>✅ ${st.w}</b></div><div>Sconfitte<b>❌ ${st.l}</b></div>
        <div>Pareggi<b>🤝 ${st.d}</b></div><div>Bauli vinti<b>📦 ${st.chests}</b></div></div>`
        : `<p class="muted">${i > cur ? 'Non sei ancora arrivato in quest\'arena.' : 'Nessuna battaglia con le coppe giocata qui.'}</p>`}
      <h2>Bauli di quest'arena</h2>${chests}
      <p class="muted">Nei bauli escono le carte di quest'arena e di tutte quelle prima.</p>`);
    for (const el of body.querySelectorAll('.card')) el.onclick = () => cardDialog(el.dataset.key);
    body.querySelector('.prev').onclick = () => arenaDialog(i - 1);
    body.querySelector('.next').onclick = () => arenaDialog(i + 1);
    for (const b of body.querySelectorAll('[data-road]')) b.onclick = () => {
      const r = P.claimRoad(profile, i, +b.dataset.road);
      if (!r) return;
      save(); render();
      if (r.cards) showReward(r);
      else { Sound.play('chest'); toast(r.gold ? `🪙 +${r.gold} monete` : `💎 +${r.gems} gemme`); arenaDialog(i); }
    };
    // la prima ricompensa da ritirare (o l'ultima ritirata) in vista
    const target = body.querySelector('.road-step.ready') || [...body.querySelectorAll('.road-step.got')].pop();
    if (target) target.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  // ---------------------------------------------------------------- scheda Clan e amici
  let unread = 0, chatWith = null;
  function updateBadge() {
    const b = $('#clan-badge');
    b.hidden = !unread;
    b.textContent = unread;
  }
  const statusText = {
    online: '🟢 Online: i tuoi amici possono trovarti',
    connessione: '🟠 Collegamento in corso...',
    offline: '⚪ Offline: serve internet per amici e clan',
    doppio: '🟠 Il gioco è aperto anche in un\'altra finestra: chiudila',
  };

  function renderClan() {
    const st = Social.status();
    const friends = profile.friends.slice().sort((a, b) => (Social.isOnline(b.id) - Social.isOnline(a.id)) || b.trophies - a.trophies);
    const clan = profile.clan;
    const members = clan ? clan.members.filter((m) => !m.left) : [];
    const memberIds = new Set(members.map((m) => m.id));
    const now = Date.now();
    const friendRows = friends.map((f) => {
      const on = Social.isOnline(f.id);
      return `<div class="friend"><span class="dot ${on ? 'on' : ''}"></span>
        <div class="who"><b>${esc(f.name)}</b><small>🏆 ${f.trophies} · ${on ? 'online' : 'offline'} · tu ${f.wins || 0} – ${f.losses || 0} lui</small></div>
        <button class="btn small grey" data-chat="${f.id}" type="button">💬</button>
        <button class="btn small ${on ? 'gold' : 'grey'}" data-fight="${f.id}" type="button" ${on ? '' : 'disabled'}>⚔️</button>
        ${clan && !memberIds.has(f.id) ? `<button class="btn small" data-invite="${f.id}" type="button" ${on ? '' : 'disabled'} title="Invita nel clan">🛡️+</button>` : ''}
      </div>`;
    }).join('');

    let clanHtml;
    if (!clan) {
      clanHtml = `<div class="box"><p>Non sei in un clan. Creane uno e invita i tuoi amici, oppure fatti invitare nel loro.</p>
        <div class="field-row"><input id="clan-name" type="text" maxlength="24" placeholder="Nome del clan"></div>
        <div class="badges">${BADGES.map((b, i) => `<button type="button" data-badge="${b}" class="${i === 0 ? 'on' : ''}">${b}</button>`).join('')}</div>
        <button id="clan-create" class="btn gold full" type="button" style="width:100%;margin-top:10px">Crea il clan</button></div>`;
    } else {
      const online = members.filter((m) => m.id === profile.id || Social.isOnline(m.id)).length;
      const reqWait = profile.lastRequest + P.REQUEST_EVERY - now;
      const chat = clan.chat.slice(-80).map((m) => {
        if (m.type === 'info') return `<div class="msg info">${esc(m.text)}</div>`;
        const mine = m.from === profile.id;
        const who = `<small>${esc(mine ? 'Tu' : m.name || '?')} · ${fmtHour(m.at)}</small>`;
        if (m.type === 'request') {
          const d = D.BY_KEY[m.card];
          if (!d) return '';
          const got = (m.donations || []).length;
          const mineCard = profile.cards[m.card];
          const canGive = !mine && got < m.max && mineCard && mineCard.count > 0;
          return `<div class="msg req ${mine ? 'mine' : ''}">${who}<div class="rq"><span class="em">${art(m.card)}</span>
            <div>Chiede <b>${esc(d.name)}</b><br>${got}/${m.max | 0} ricevute</div>
            ${mine ? '' : `<button class="btn small ${canGive ? 'green' : 'grey'}" data-donate="${esc(m.id)}" type="button" ${canGive ? '' : 'disabled'}>Dona</button>`}</div></div>`;
        }
        return `<div class="msg ${mine ? 'mine' : ''}">${who}${esc(m.text)}</div>`;
      }).join('');
      clanHtml = `<div class="box">
        <div class="clan-head"><span class="cb">${esc(clan.badge)}</span><div><h3>${esc(clan.name)}</h3>
          <span class="muted">${members.length} membri · ${online} online</span></div></div>
        <h2>Membri</h2>
        ${members.sort((a, b) => b.trophies - a.trophies).map((m) => `<div class="friend"><span class="dot ${m.id === profile.id || Social.isOnline(m.id) ? 'on' : ''}"></span>
          <div class="who"><b>${esc(m.id === profile.id ? profile.name + ' (tu)' : m.name)}</b><small>🏆 ${m.id === profile.id ? profile.trophies : (m.trophies | 0)} · ${m.role === 'capo' ? '👑 capo' : 'membro'}</small></div></div>`).join('')}
        <h2>Chat del clan</h2>
        <div class="chat" id="clan-chat">${chat || '<p class="muted">Nessun messaggio. Saluta il tuo clan!</p>'}</div>
        <div class="field-row"><input id="clan-msg" type="text" maxlength="200" placeholder="Scrivi al clan..."><button id="clan-send" class="btn small gold" type="button">Invia</button></div>
        <div class="row" style="margin-top:10px">
          <button id="clan-request" class="btn small green" type="button" ${reqWait > 0 ? 'disabled' : ''}>🃏 Chiedi carte${reqWait > 0 ? ' (' + fmtWait(reqWait) + ')' : ''}</button>
          <button id="clan-leave" class="btn small red" type="button">Esci dal clan</button>
        </div>
        <p class="muted">I messaggi arrivano ai membri online; gli altri li ricevono appena aprono il gioco e si collegano con qualcuno del clan.</p>
      </div>`;
    }

    $('#tab-clan').innerHTML = `
      <h2>Il tuo codice amico</h2>
      <div class="box"><div class="row" style="align-items:center"><span class="code">${profile.id}</span>
        <button id="share" class="btn small" type="button" style="flex:none">📤 Condividi</button></div>
        <p class="muted">${statusText[st] || ''}</p></div>
      <h2>Amici <small>— ${friends.length}</small></h2>
      <div class="box">
        <div class="field-row"><input id="friend-code" type="text" maxlength="6" placeholder="Codice amico (6 caratteri)" autocapitalize="characters"><button id="friend-add" class="btn small gold" type="button">Aggiungi</button></div>
        ${friendRows || '<p class="muted">Ancora nessun amico. Scambiatevi il codice: basta che uno dei due aggiunga l\'altro.</p>'}
      </div>
      <h2>Clan</h2>${clanHtml}`;

    $('#share').onclick = shareCode;
    $('#friend-add').onclick = addFriendFromInput;
    $('#friend-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') addFriendFromInput(); });
    for (const b of document.querySelectorAll('[data-chat]')) b.onclick = () => openChat(b.dataset.chat);
    for (const b of document.querySelectorAll('[data-fight]')) b.onclick = () => challenge(b.dataset.fight);
    for (const b of document.querySelectorAll('[data-invite]')) b.onclick = () => {
      if (Social.inviteToClan(b.dataset.invite)) toast('Invito mandato!'); else toast('L\'amico non è online');
    };
    if (!clan) {
      let badge = BADGES[0];
      for (const b of document.querySelectorAll('[data-badge]')) b.onclick = () => {
        badge = b.dataset.badge;
        document.querySelectorAll('[data-badge]').forEach((x) => x.classList.toggle('on', x === b));
      };
      $('#clan-create').onclick = () => {
        const name = $('#clan-name').value.trim();
        if (name.length < 3) { toast('Scegli un nome di almeno 3 lettere'); return; }
        P.createClan(profile, name, badge);
        profile.clan.chat.push({ id: P.randomId(10), type: 'info', from: profile.id, text: 'Clan fondato da ' + profile.name, at: Date.now() });
        save(); Sound.play('chest'); renderClan();
      };
    } else {
      const chatEl = $('#clan-chat');
      chatEl.scrollTop = chatEl.scrollHeight;
      const send = () => {
        const v = $('#clan-msg').value.trim();
        if (!v) return;
        Social.clanPost({ type: 'text', text: v.slice(0, 200) });
        renderClan();
        $('#clan-msg').focus();
      };
      $('#clan-send').onclick = send;
      $('#clan-msg').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
      $('#clan-request').onclick = requestDialog;
      $('#clan-leave').onclick = () => {
        const body = modal(`<h3>Uscire dal clan?</h3><p>Potrai rientrare solo se qualcuno ti invita di nuovo.</p>
          <div class="row"><button class="btn grey" id="no" type="button">Resta</button><button class="btn red" id="yes" type="button">Esci</button></div>`);
        body.querySelector('#no').onclick = closeModal;
        body.querySelector('#yes').onclick = () => { Social.leaveClan(); closeModal(); renderClan(); };
      };
      for (const b of document.querySelectorAll('[data-donate]')) b.onclick = () => donate(b.dataset.donate);
    }
  }

  function shareCode() {
    const text = `Sfidami a Guerra degli Dèi! Il mio codice amico è ${profile.id}\n${location.href.split('#')[0]}`;
    if (navigator.share) navigator.share({ text }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('Copiato! Incollalo in un messaggio'), () => toast(text, 5000));
    else toast(text, 5000);
  }

  function addFriendFromInput() {
    const code = $('#friend-code').value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) { toast('Il codice ha 6 caratteri, lettere e numeri'); return; }
    if (code === profile.id) { toast('Questo è il tuo codice!'); return; }
    P.addFriend(profile, { id: code, name: 'Amico ' + code });
    save();
    Social.connect(code);
    toast('Amico aggiunto! Quando è online vedrai il pallino verde', 3000);
    renderClan();
  }

  function openChat(id) {
    const f = profile.friends.find((x) => x.id === id);
    if (!f) return;
    chatWith = id;
    const draw = () => {
      const list = (profile.chats[id] || []).map((m) => `<div class="msg ${m.from === profile.id ? 'mine' : ''}"><small>${fmtHour(m.at)}</small>${esc(m.text)}</div>`).join('');
      const el = $('#fchat');
      if (!el) return;
      el.innerHTML = list || '<p class="muted">Scrivi il primo messaggio!</p>';
      el.scrollTop = el.scrollHeight;
    };
    const body = modal(`<h3>💬 ${esc(f.name)}</h3>
      <p class="muted">${Social.isOnline(id) ? '🟢 Online' : '⚪ Offline: riceverà il messaggio solo se siete online insieme'}</p>
      <div class="chat" id="fchat"></div>
      <div class="field-row"><input id="fmsg" type="text" maxlength="200" placeholder="Messaggio..."><button id="fsend" class="btn small gold" type="button">Invia</button></div>
      <div class="row" style="margin-top:12px"><button id="fremove" class="btn small red" type="button">Rimuovi amico</button></div>`, () => { chatWith = null; });
    draw();
    const send = () => {
      const v = body.querySelector('#fmsg').value.trim();
      if (!v) return;
      if (!Social.isOnline(id)) { toast('L\'amico è offline: il messaggio non può arrivare adesso'); return; }
      Social.sendChat(id, v);
      body.querySelector('#fmsg').value = '';
      draw();
    };
    body.querySelector('#fsend').onclick = send;
    body.querySelector('#fmsg').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    body.querySelector('#fremove').onclick = () => { P.removeFriend(profile, id); save(); closeModal(); renderClan(); };
    openChat.redraw = draw;
  }

  function requestDialog() {
    const keys = Object.keys(profile.cards).filter((k) => P.requestMax(k) > 0);
    const body = modal(`<h3>🃏 Chiedi carte al clan</h3><p>Scegli quale carta ti serve: i compagni potranno donartene alcune copie.</p>
      <div class="card-grid">${keys.map((k) => cardHtml(k)).join('')}</div>`);
    for (const el of body.querySelectorAll('.card')) el.onclick = () => {
      const k = el.dataset.key;
      profile.lastRequest = Date.now();
      Social.clanPost({ type: 'request', card: k, max: P.requestMax(k), donations: [] });
      closeModal(); renderClan();
      toast('Richiesta mandata al clan');
    };
  }

  function donate(reqId) {
    const m = profile.clan && profile.clan.chat.find((x) => x.id === reqId);
    if (!m) return;
    const c = profile.cards[m.card];
    if (!c || c.count <= 0 || (m.donations || []).length >= m.max) { toast('Non puoi donare questa carta'); return; }
    c.count--;
    const reward = ({ comune: 5, rara: 25, epica: 100, leggendaria: 0 })[D.BY_KEY[m.card].rarity];
    profile.gold += reward;
    m.donations = (m.donations || []).concat([{ id: P.randomId(10), from: profile.id, name: profile.name }]);
    save();
    Social.broadcastClan();
    Sound.play('chest');
    toast(`Grazie! Hai ricevuto 🪙 ${reward}`);
    render();
  }

  // ---------------------------------------------------------------- sfide tra amici
  let outgoing = null;     // id dell'amico che stiamo sfidando
  let awaitingStart = null;
  function challenge(id) {
    if (!Social.isOnline(id)) { toast('L\'amico non è online'); return; }
    const f = profile.friends.find((x) => x.id === id);
    outgoing = id;
    Social.send(id, { t: 'invite', name: profile.name });
    modal(`<div class="center"><div style="font-size:3rem">⚔️</div><h3>Sfida mandata</h3><p>Aspettiamo che <b>${esc(f ? f.name : id)}</b> accetti...</p></div>`,
      () => { if (outgoing) { Social.send(outgoing, { t: 'cancel' }); outgoing = null; } });
  }

  function friendLevels(deck) {
    const lv = {};
    for (const k of deck) lv[k] = 7;   // nelle sfide tra amici tutte le carte sono allo stesso livello
    return lv;
  }

  function onBattleMsg(id, msg) {
    const f = profile.friends.find((x) => x.id === id);
    const name = f ? f.name : id;
    switch (msg.t) {
      case 'invite': {
        if (B || awaitingStart || outgoing) { Social.send(id, { t: 'busy' }); return; }
        Sound.play('msg');
        const body = modal(`<div class="center"><div style="font-size:3rem">⚔️</div><h3>${esc(name)} ti sfida!</h3>
          <p>Sfida amichevole: niente coppe, carte tutte al livello 7.</p>
          <div class="row"><button class="btn grey" id="no" type="button">Rifiuta</button><button class="btn gold" id="yes" type="button">Accetta</button></div></div>`,
        () => { if (!awaitingStart && !B) Social.send(id, { t: 'decline' }); });
        body.querySelector('#no').onclick = closeModal;
        body.querySelector('#yes').onclick = () => {
          awaitingStart = id;
          Social.send(id, { t: 'accept', deck: profile.deck, name: profile.name });
          modal('<div class="center"><h3>Si parte!</h3><p>Preparazione della battaglia...</p></div>', () => { awaitingStart = null; });
        };
        break;
      }
      case 'cancel':
        if (!B && !awaitingStart) { closeModal(); toast(name + ' ha annullato la sfida'); }
        break;
      case 'decline':
      case 'busy':
        if (outgoing === id) { outgoing = null; closeModal(); toast(msg.t === 'busy' ? name + ' è occupato' : name + ' ha rifiutato'); }
        break;
      case 'accept': {
        if (outgoing !== id || B) return;
        outgoing = null;
        const deck = Array.isArray(msg.deck) && msg.deck.length === 8 && msg.deck.every((k) => D.BY_KEY[k] && D.BY_KEY[k].cost) ? msg.deck : D.START_DECK;
        const seed = Math.floor(Math.random() * 1e9);
        const arena = P.arena(profile);
        Social.send(id, { t: 'start', seed, arena, names: [profile.name, name] });
        closeModal();
        startBattle({
          mode: 'friend', role: 'host', me: 0, friendId: id, arena, foeName: name, foeSub: 'Amichevole',
          match: { decks: [profile.deck.slice(), deck], levels: [friendLevels(profile.deck), friendLevels(deck)], towerLevels: [7, 7], seed },
        });
        break;
      }
      case 'start':
        if (awaitingStart !== id) return;
        awaitingStart = null;
        closeModal();
        startBattle({ mode: 'friend', role: 'guest', me: 1, friendId: id, arena: msg.arena | 0, foeName: name, foeSub: 'Amichevole' });
        break;
      case 'snap':
        if (B && B.cfg.role === 'guest' && B.cfg.friendId === id && msg.s) guestSnap(msg.s);
        break;
      case 'play':
        if (B && B.cfg.role === 'host' && B.cfg.friendId === id && Number.isInteger(msg.slot) && isFinite(msg.x) && isFinite(msg.y)) B.remote.push(msg);
        break;
      case 'emote':
        if (B && B.cfg.friendId === id && (EMOTES.includes(msg.e) || PHRASES.includes(msg.e))) bubble('#emote-foe', msg.e);
        break;
      case 'gone':
        if (outgoing === id) { outgoing = null; closeModal(); }
        if (awaitingStart === id) { awaitingStart = null; closeModal(); }
        if (B && B.cfg.friendId === id && !B.ended) { toast(name + ' si è disconnesso', 3500); exitBattle(); }
        break;
    }
  }

  // ---------------------------------------------------------------- battaglia
  const canvas = $('#canvas');
  // Spazio da lasciare sopra il campo: la fascia dell'avversario in alto (più alta sugli iPhone con la tacca)
  const ROPTS = { topPx: 0 };
  let B = null;
  const R = Render.create(canvas, ROPTS);
  // Altezza della parte di schermo davvero visibile (senza le barre del browser):
  // così le carte e l'ambrosia non finiscono mai sotto la barra di Safari
  function appHeight() {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-h', Math.round(h) + 'px');
    if (B) fitCanvas();
  }
  appHeight();
  window.addEventListener('resize', appHeight);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', appHeight);
  window.addEventListener('orientationchange', () => setTimeout(appHeight, 300));
  function fitCanvas() {
    const f = $('#field').getBoundingClientRect();
    // Il canvas riempie tutta la zona: il campo in prospettiva sta al centro, ai lati cielo e cipressi
    canvas.style.width = Math.floor(f.width) + 'px';
    canvas.style.height = Math.floor(f.height) + 'px';
    const hud = document.querySelector('.hud-top').getBoundingClientRect();
    ROPTS.topPx = Math.max(0, hud.bottom - f.top - 10);
    R.resize();
    $('#crown-side').style.top = R.riverY() + 'px';
  }
  window.addEventListener('resize', () => { if (B) fitCanvas(); });

  function startBattle(cfg) {
    closeModal();
    B = {
      cfg, me: cfg.me, state: null, view: null, selected: -1, drag: null, gx: null, gy: null,
      acc: 0, last: performance.now(), sendT: 0, remote: [], ended: false, handKey: '',
      snaps: { prev: null, cur: null, at: 0, prevMap: null }, ruins: 0, doubleShown: false, otShown: false,
    };
    if (cfg.role !== 'guest') B.state = E.createMatch(cfg.match);
    $('#home').hidden = true;
    $('#battle').hidden = false;
    $('#foe-name').textContent = cfg.foeName;
    $('#foe-level').textContent = cfg.foeLevel || 7;
    $('#foe-sub').textContent = cfg.foeSub || '';
    $('#emote-bar').hidden = true;
    $('#end-vs').hidden = true;
    $('#btn-emote').style.visibility = cfg.mode === 'friend' ? 'visible' : 'hidden';
    $('#crown-side').hidden = true;
    $('#crown-banner').hidden = true;
    $('#x2').hidden = true;
    R.setArena(cfg.arena || 0);
    R.setFlip(cfg.me === 1);
    fitCanvas();
    banner('⚔️ Battaglia!');
    requestAnimationFrame(loop);
  }

  function exitBattle() {
    B = null;
    $('#battle').hidden = true;
    $('#home').hidden = false;
    render();
  }

  // Stato da disegnare con le posizioni a metà strada tra il passo precedente e quello attuale
  function smoothView(s, prev, k) {
    if (!prev) return s;
    k = Math.max(0, Math.min(1, k));
    return Object.assign({}, s, {
      t: s.t - (1 - k) * E.TICK,
      ents: s.ents.map((e) => {
        const p = prev.get(e.id);
        if (!p || e.cat === 'tower' || (p.x === e.x && p.y === e.y)) return e;
        return Object.assign({}, e, { x: p.x + (e.x - p.x) * k, y: p.y + (e.y - p.y) * k });
      }),
    });
  }

  function guestSnap(sn) {
    const S = B.snaps;
    S.prev = S.cur;
    S.prevMap = S.prev ? new Map(S.prev.ents.map((e) => [e.id, e])) : null;
    S.cur = E.fromSnapshot(sn);
    S.at = performance.now();
  }
  function guestView(now) {
    const S = B.snaps;
    if (!S.cur) return null;
    const k = Math.min(1, (now - S.at) / 100);
    if (!S.prev || k >= 1) return S.cur;
    return Object.assign({}, S.cur, {
      t: S.prev.t + (S.cur.t - S.prev.t) * k,
      ents: S.cur.ents.map((e) => {
        const p = S.prevMap.get(e.id);
        return p ? Object.assign({}, e, { x: p.x + (e.x - p.x) * k, y: p.y + (e.y - p.y) * k }) : e;
      }),
    });
  }

  let bannerTimer = null;
  function banner(text) {
    const b = $('#banner');
    b.textContent = text;
    b.classList.remove('big');
    b.hidden = false;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { b.hidden = true; }, 1600);
  }
  const bubbleTimers = {};
  function bubble(sel, e) {
    const el = $(sel);
    el.textContent = e;
    el.hidden = false;
    clearTimeout(bubbleTimers[sel]);
    bubbleTimers[sel] = setTimeout(() => { el.hidden = true; }, 2200);
  }

  function loop(now) {
    if (!B) return;
    const dt = Math.min(0.25, (now - B.last) / 1000);
    B.last = now;
    if (B.cfg.role !== 'guest') {
      B.acc += dt;
      while (B.acc >= E.TICK) {
        B.acc -= E.TICK;
        // posizioni prima del passo: servono per disegnare i movimenti in modo continuo
        B.prevPos = new Map(B.state.ents.map((e) => [e.id, e.x, e.y]).map((a) => [a[0], { x: a[1], y: a[2] }]));
        if (B.cfg.bot) {
          const a = B.cfg.bot.think(B.state, 1, E.TICK);
          if (a) E.play(B.state, 1, a.slot, a.x, a.y);
        }
        for (const m of B.remote.splice(0)) E.play(B.state, 1, m.slot, m.x, m.y);
        E.step(B.state);
      }
      B.view = smoothView(B.state, B.prevPos, B.acc / E.TICK);
      if (B.cfg.role === 'host') {
        B.sendT -= dt;
        if (B.sendT <= 0) { B.sendT = 0.1; Social.send(B.cfg.friendId, { t: 'snap', s: E.snapshot(B.state) }); }
      }
    } else {
      B.view = guestView(now);
    }
    const v = B.view;
    if (v) {
      events(v);
      const pl = v.players[B.me], hand = pl.hand;
      const dragKey = B.selected >= 0 ? hand[B.selected] : null;
      const lv = dragKey ? (B.cfg.match && B.cfg.match.levels ? B.cfg.match.levels[B.me][dragKey] : null) || (profile.cards[dragKey] && profile.cards[dragKey].level) || 1 : 1;
      R.draw(v, { me: B.me, dragKey, gx: B.gx, gy: B.gy, level: lv, amb: pl.amb, name: dragKey ? D.BY_KEY[dragKey].name : '' });
      hud(v);
      if (v.over && !B.ended) { B.ended = true; showVs(v); setTimeout(() => endBattle(v), 2600); }
    } else {
      R.draw(null);
    }
    requestAnimationFrame(loop);
  }

  // Suoni e scritte per ciò che succede sul campo
  function events(v) {
    if (v.ruins.length > B.ruins) {
      const fresh = v.ruins.slice(B.ruins);
      B.ruins = v.ruins.length;
      Sound.play('tower');
      if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
      // il campo trema, compaiono le corone di chi ha abbattuto il tempio e una corona vola verso il contatore a destra
      const field = $('#field');
      field.classList.remove('shake'); void field.offsetWidth; field.classList.add('shake');
      showCrownSide();
      const foeScored = fresh.some((r) => r.owner === B.me);
      crownBanner(foeScored, v.crowns[foeScored ? 1 - B.me : B.me]);
      for (const r of fresh) crownFly(r, r.owner === B.me ? '#foe-crowns' : '#my-crowns');
    }
    if (!B.doubleShown && !v.inOvertime && v.t >= v.duration - 60) { B.doubleShown = true; bigBanner('<b>60</b><span>secondi<br>restanti</span>'); }
    if (!B.otShown && v.inOvertime) { B.otShown = true; banner('⏱️ Supplementari: chi abbatte un tempio vince!'); }
    if (B.state) B.state.events.length = 0;
  }

  // Scritta con le corone a centro campo (nella metà di chi ha fatto corona), poi sparisce
  let crownTimer = null, sideTimer = null;
  // Contatore delle corone sul lato: compare quando cade un tempio e sparisce dopo qualche secondo
  function showCrownSide() {
    const el = $('#crown-side');
    el.hidden = false;
    clearTimeout(sideTimer);
    sideTimer = setTimeout(() => { el.hidden = true; }, 4500);
  }
  function crownBanner(foe, n) {
    const el = $('#crown-banner');
    let crowns = '';
    for (let i = 0; i < 3; i++) crowns += `<span class="${i < n ? 'on' : ''}">👑</span>`;
    el.className = 'crown-banner ' + (foe ? 'foe' : 'me');
    el.innerHTML = `<b>${foe ? 'Nemico' : 'Tu'}</b><div>${crowns}</div>`;
    el.hidden = false;
    clearTimeout(crownTimer);
    crownTimer = setTimeout(() => { el.hidden = true; }, 2400);
  }
  function bigBanner(html) {
    const el = $('#banner');
    el.innerHTML = html;
    el.classList.add('big');
    el.hidden = false;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { el.hidden = true; el.classList.remove('big'); }, 2200);
  }

  // Fine partita: corone dei due giocatori una contro l'altra, prima della schermata del risultato
  function showVs(v) {
    const row = (n, cls) => [0, 1, 2].map((i) => `<span class="${i < n ? 'on ' + cls : ''}">👑</span>`).join('');
    const el = $('#end-vs');
    el.innerHTML = `<div class="vs-row foe">${row(v.crowns[1 - B.me], 'red')}</div><b>VS</b><div class="vs-row me">${row(v.crowns[B.me], 'blue')}</div>`;
    el.hidden = false;
    $('#emote-bar').hidden = true;
  }

  function crownFly(ruin, target) {
    const field = $('#field'), fr = field.getBoundingClientRect();
    const cv = canvas.getBoundingClientRect();
    const from = R.toScreen(ruin.x, ruin.y);
    const x0 = cv.left - fr.left + from.x - 28, y0 = cv.top - fr.top + from.y - 70;
    const el = document.createElement('div');
    el.className = 'crown-fly';
    el.innerHTML = '👑<b>+1</b>';
    el.style.left = x0 + 'px';
    el.style.top = y0 + 'px';
    field.appendChild(el);
    setTimeout(() => {
      const t = $(target).getBoundingClientRect();
      el.style.transform = `translate(${t.left + t.width / 2 - (fr.left + x0 + 28)}px, ${t.top + t.height / 2 - (fr.top + y0 + 28)}px) scale(.45)`;
      el.style.opacity = '0.2';
    }, 700);
    setTimeout(() => {
      el.remove();
      const c = $(target);
      c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    }, 1650);
  }

  function hud(v) {
    const me = B.me, pl = v.players[me];
    const left = v.inOvertime ? Math.max(0, v.duration + v.overtime - v.t) : Math.max(0, v.duration - v.t);
    $('#clock').textContent = fmtClock(left);
    $('#clock-label').textContent = v.inOvertime ? 'Supplem.' : 'Termina tra:';
    $('#clock-box').classList.toggle('over', v.inOvertime);
    $('#clock-box').classList.toggle('last', !v.inOvertime && left <= 10);
    $('#x2').hidden = !(v.t >= v.duration - 60);
    const triple = v.inOvertime && v.t >= v.duration + v.overtime - 90;
    $('#x2').dataset.x = triple ? 'x3' : 'x2';
    if (triple && !B.tripleShown) { B.tripleShown = true; banner('💧 Ambrosia ×3!'); }
    // Conto alla rovescia grande negli ultimi 10 secondi
    const cd = $('#countdown');
    const n = Math.ceil(left);
    if (!v.over && left > 0 && n <= 10) {
      if (cd.dataset.n !== String(n)) {
        cd.dataset.n = n;
        cd.textContent = n;
        cd.hidden = false;
        cd.classList.toggle('red', v.inOvertime || n <= 3);
        cd.style.animation = 'none'; void cd.offsetWidth; cd.style.animation = '';
        Sound.play('tick');
      }
    } else if (!cd.hidden) { cd.hidden = true; cd.dataset.n = ''; }
    $('#foe-crowns').textContent = v.crowns[1 - me];
    $('#my-crowns').textContent = v.crowns[me];
    $('#amb-num').dataset.n = Math.floor(pl.amb);
    $('#amb-fill').style.width = (pl.amb / E.AMB_MAX) * 100 + '%';
    const key = pl.hand.join() + '|' + pl.queue[0];
    if (key !== B.handKey) {
      B.handKey = key;
      $('#hand').innerHTML = pl.hand.map((k, i) => {
        const d = D.BY_KEY[k];
        return `<div class="card ${i === B.selected ? 'sel' : ''}" data-slot="${i}" style="--rc:${D.RARITY[d.rarity].color}">
          <span class="cost"><span>${d.cost}</span></span><span class="em">${art(k)}</span><span class="nm">${esc(d.name)}</span><span class="wait"></span></div>`;
      }).join('');
      const nx = D.BY_KEY[pl.queue[0]];
      $('#next-card').innerHTML = nx ? art(pl.queue[0]) : '';
    }
    document.querySelectorAll('#hand .card').forEach((el, i) => {
      const cost = D.BY_KEY[pl.hand[i]].cost;
      el.classList.toggle('poor', pl.amb < cost);
      el.classList.toggle('sel', i === B.selected);
      el.querySelector('.wait').style.height = pl.amb < cost ? (1 - pl.amb / cost) * 100 + '%' : '0';
    });
  }

  // --- tocco e trascinamento delle carte
  function overCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }
  function tryPlay(slot, x, y) {
    const v = B && B.view;
    if (!v || v.over || slot < 0) return false;
    const key = v.players[B.me].hand[slot];
    const d = D.BY_KEY[key];
    if (v.players[B.me].amb < d.cost) { Sound.play('no'); toast('💧 Ambrosia insufficiente', 1200); return false; }
    if (!E.canPlace(v, B.me, key, x, y)) { Sound.play('no'); toast('Non puoi metterla qui: solo nella tua metà', 1500); return false; }
    if (B.cfg.role === 'guest') Social.send(B.cfg.friendId, { t: 'play', slot, x, y });
    else if (!E.play(B.state, B.me, slot, x, y)) return false;
    Sound.play(d.type === 'spell' ? 'spell' : 'play');
    B.selected = -1; B.gx = null;
    return true;
  }
  $('#hand').addEventListener('pointerdown', (e) => {
    const c = e.target.closest('.card');
    if (!c || !B) return;
    e.preventDefault();
    Sound.unlock();
    const slot = +c.dataset.slot;
    B.selected = B.selected === slot && !B.drag ? -1 : slot;
    if (B.selected >= 0) Sound.play('tap');
    B.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!B) return;
    if (B.drag && e.pointerId === B.drag.id) {
      if (Math.hypot(e.clientX - B.drag.x0, e.clientY - B.drag.y0) > 12) B.drag.moved = true;
      if (B.selected < 0 && B.drag.moved) B.selected = +(document.elementFromPoint(B.drag.x0, B.drag.y0)?.closest('.card')?.dataset.slot ?? -1);
    }
    if (B.selected >= 0 && overCanvas(e)) { const g = R.toGame(e.clientX, e.clientY); B.gx = g.x; B.gy = g.y; }
    else if (B.drag) B.gx = null;
  });
  window.addEventListener('pointerup', (e) => {
    if (!B) return;
    if (B.drag && e.pointerId === B.drag.id) {
      const moved = B.drag.moved;
      B.drag = null;
      if (moved) {
        if (overCanvas(e)) { const g = R.toGame(e.clientX, e.clientY); tryPlay(B.selected, g.x, g.y); }
        else { B.selected = -1; B.gx = null; }
      }
      return;
    }
    if (B.selected >= 0 && overCanvas(e)) { const g = R.toGame(e.clientX, e.clientY); tryPlay(B.selected, g.x, g.y); }
  });
  window.addEventListener('pointercancel', () => { if (B) { B.drag = null; } });

  // Pannello delle emoticon e delle frasi (al posto delle carte, come in Clash)
  $('#btn-emote').onclick = () => {
    const bar = $('#emote-bar');
    if (!bar.hidden) { bar.hidden = true; $('#btn-emote').textContent = '💬'; return; }
    bar.innerHTML = `<div class="emo-row">${EMOTES.map((x) => `<button type="button" class="emo">${x}</button>`).join('')}</div>
      <div class="ph-row">${PHRASES.map((x) => `<button type="button" class="ph">${x}</button>`).join('')}</div>`;
    bar.hidden = false;
    $('#btn-emote').textContent = '⛔';
    for (const b of bar.querySelectorAll('button')) b.onclick = () => {
      bar.hidden = true;
      $('#btn-emote').textContent = '💬';
      bubble('#emote-me', b.textContent);
      if (B && B.cfg.friendId) Social.send(B.cfg.friendId, { t: 'emote', e: b.textContent });
    };
  };

  function endBattle(v) {
    if (!B) return;
    const me = B.me, cfg = B.cfg;
    const res = v.winner === -1 ? 'draw' : v.winner === me ? 'win' : 'lose';
    const mine = v.crowns[me], foe = v.crowns[1 - me];
    let extra = '';
    if (cfg.mode === 'ladder') {
      const out = P.applyResult(profile, res === 'win' ? 0 : res === 'lose' ? 1 : -1, mine);
      extra += `<p class="center" style="font-size:1.3rem">🏆 <b>${out.trophies >= 0 ? '+' : ''}${out.trophies}</b>${out.gold ? ` &nbsp; 🪙 <b>+${out.gold}</b>` : ''}</p>`;
      if (out.chest) extra += `<p class="center">Hai vinto un <b>${D.CHESTS[out.chest].name}</b>!</p><div class="center">${chestArt(out.chest, 'chest-big')}</div>`;
      if (out.chestsFull) extra += '<p class="center muted">Spazi per i bauli pieni: aprine qualcuno!</p>';
      if (out.newArena != null) {
        const a = D.ARENAS[out.newArena];
        extra += `<div class="box center"><div style="font-size:3rem">${a.icon}</div><b>Nuova arena: ${esc(a.name)}!</b>
          <p>Carte sbloccate: ${out.newCards.map((k) => esc(D.BY_KEY[k].name)).join(', ')}</p></div>`;
      }
    } else if (cfg.mode === 'tour') {
      const t = P.tourResult(profile, res === 'win' ? 0 : res === 'lose' ? 1 : -1);
      extra += `<div class="tour-mini">${tourTrack(t)}</div><p class="center">Vittorie <b>${t.wins}</b>/${P.TOUR_MAX_WINS} · Sconfitte <b>${t.losses}</b>/${P.TOUR_MAX_LOSSES}</p>`;
      if (t.done) extra += '<p class="center"><b>Torneo finito!</b> Ritira i premi nella scheda Eventi.</p>';
    } else if (cfg.mode === 'friend') {
      const f = profile.friends.find((x) => x.id === cfg.friendId);
      if (f) { if (res === 'win') f.wins = (f.wins || 0) + 1; else if (res === 'lose') f.losses = (f.losses || 0) + 1; }
      extra += '<p class="center muted">Sfida amichevole: niente coppe in gioco.</p>';
    } else extra += '<p class="center muted">Allenamento: niente coppe in gioco.</p>';
    save();
    Sound.play(res === 'win' ? 'win' : 'lose');
    const title = res === 'win' ? '🏆 Vittoria!' : res === 'lose' ? 'Sconfitta' : 'Pareggio';
    const body = modal(`<div class="result-title">${title}</div>
      <div class="result-crowns"><span style="color:#93c5fd">${'👑'.repeat(mine) || '–'}</span> : <span style="color:#fca5a5">${'👑'.repeat(foe) || '–'}</span></div>
      ${extra}<button id="ok" class="btn gold full" type="button" style="width:100%">Continua</button>`, () => exitBattle());
    body.querySelector('#ok').onclick = closeModal;
  }

  // ---------------------------------------------------------------- profilo e impostazioni
  $('#btn-profile').onclick = () => {
    const found = Object.keys(profile.cards).length;
    const body = modal(`<h3>👤 Il tuo profilo</h3>
      <div class="field-row"><input id="pname" type="text" maxlength="16" value="${esc(profile.name)}"><button id="psave" class="btn small gold" type="button">Salva</button></div>
      <div class="stats">
        <div>Coppe<b>🏆 ${profile.trophies}</b></div><div>Record<b>🏆 ${profile.best}</b></div>
        <div>Vittorie<b>${profile.wins}</b></div><div>Sconfitte<b>${profile.losses}</b></div>
        <div>Carte trovate<b>${found}/${D.CARDS.length}</b></div><div>Codice amico<b>${profile.id}</b></div>
      </div>`);
    body.querySelector('#psave').onclick = () => {
      const n = body.querySelector('#pname').value.trim().slice(0, 16);
      if (n.length < 2) { toast('Almeno 2 lettere'); return; }
      profile.name = n; save(); closeModal(); render(); toast('Nome salvato');
    };
  };

  $('#btn-settings').onclick = () => {
    const body = modal(`<h3>⚙️ Impostazioni</h3>
      <button id="snd" class="btn full ${profile.sound ? 'green' : 'grey'}" type="button" style="width:100%">${profile.sound ? '🔊 Suoni attivi' : '🔇 Suoni spenti'}</button>
      <button id="howto" class="btn full" type="button" style="width:100%">📖 Come si gioca</button>
      <button id="legal" class="btn full grey" type="button" style="width:100%">🔒 Privacy e diritti</button>
      <p class="muted">© 2026 ${COPYRIGHT}. Tutti i diritti riservati.</p>`);
    body.querySelector('#snd').onclick = () => { profile.sound = !profile.sound; Sound.setOn(profile.sound); save(); $('#btn-settings').click(); };
    body.querySelector('#howto').onclick = howTo;
    body.querySelector('#legal').onclick = legal;
  };

  // Titolare dei diritti: cambia qui il nome se vuoi che compaia il tuo nome vero
  const COPYRIGHT = 'cloudescandi1-dotcom';
  function legal() {
    modal(`<h3>🔒 Privacy e diritti</h3>
      <p><b>© 2026 ${COPYRIGHT}. Tutti i diritti riservati.</b> Guerra degli Dèi, i suoi disegni, i nomi e i testi delle carte e il codice
      sono opere originali di proprietà esclusiva del titolare: è vietato copiarli, ripubblicarli o usarli altrove senza permesso scritto.
      La libreria PeerJS (licenza MIT) appartiene ai suoi autori.</p>
      <p><b>Privacy in breve:</b> niente account, email, pubblicità, cookie o statistiche. I tuoi progressi restano <b>solo su questo dispositivo</b>.</p>
      <p><b>Amici e clan:</b> per collegare i telefoni si usa il servizio gratuito PeerJS, che vede il tuo codice amico e il tuo indirizzo IP.
      Gli amici e i membri del clan con cui ti colleghi vedono il tuo nome nel gioco, le coppe, i messaggi e il tuo indirizzo IP.
      Se non vuoi, non aggiungere amici: il resto del gioco funziona lo stesso.</p>
      <p><b>Consiglio:</b> in chat non scrivere il tuo nome vero, l'indirizzo o altri dati personali.</p>
      <p class="muted">Il sito è ospitato da GitHub Pages, che può registrare dati tecnici delle visite. Per cancellare i tuoi dati, cancella i dati del sito dal browser.</p>`);
  }

  function howTo() {
    modal(`<h3>📖 Come si gioca</h3>
      <p><b>Obiettivo:</b> abbattere i templi nemici. Ogni tempio laterale vale una 👑, il Tempio del Re le vale tutte e tre e vince subito.</p>
      <p><b>Ambrosia 💧:</b> ogni carta costa ambrosia, che si ricarica da sola (fino a 10). Nell'ultimo minuto si ricarica il doppio più veloce.</p>
      <p><b>Giocare una carta:</b> trascinala sul campo, oppure toccala e poi tocca il punto del campo. Le truppe si mettono solo nella tua metà; gli incantesimi ovunque.</p>
      <p><b>Le truppe</b> camminano da sole e attaccano il nemico più vicino; chi cammina passa dai ponti, chi vola no.</p>
      <p><b>Dopo 3 minuti</b> vince chi ha più corone. Se siete pari si va ai 2 minuti di supplementari: chi abbatte il primo tempio vince. Quando mancano 1:30 l'ambrosia diventa ×3.</p>
      <p><b>Fuori dalla battaglia:</b> vinci coppe per salire di arena, apri i bauli per trovare carte, potenziale nella scheda Carte e costruisci il tuo mazzo da 8.</p>
      <p><b>Amici e clan:</b> condividi il tuo codice amico. Con gli amici online puoi chattare e sfidarli; nel clan potete chiedere e donarvi carte.</p>`);
  }

  // ---------------------------------------------------------------- avvio
  function netDot(st) {
    const d = $('#net-dot');
    d.className = 'net-dot ' + st;
    d.title = statusText[st] || '';
  }
  let clanRedraw = null;
  function softClan() {
    // Ridisegna la scheda Clan senza perdere quello che si sta scrivendo
    if (tab !== 'clan' || !$('#home') || $('#home').hidden) return;
    clearTimeout(clanRedraw);
    clanRedraw = setTimeout(() => {
      const a = document.activeElement;
      if (a && a.tagName === 'INPUT' && a.closest('#tab-clan')) {
        const id = a.id, val = a.value;
        renderClan();
        const n = document.getElementById(id);
        if (n) { n.value = val; n.focus(); }
      } else renderClan();
    }, 150);
  }
  Social.start(() => profile, save, {
    onStatus: (st) => { netDot(st); softClan(); },
    onPeers: softClan,
    onChat: (id, msg) => {
      Sound.play('msg');
      if (chatWith === id && openChat.redraw) { openChat.redraw(); return; }
      const f = profile.friends.find((x) => x.id === id);
      toast(`💬 ${f ? f.name : id}: ${msg.text}`, 3500);
      if (tab !== 'clan') { unread++; updateBadge(); }
    },
    onClan: (got) => {
      if (got > 0) { toast(`🎁 Hai ricevuto ${got === 1 ? 'una carta' : got + ' carte'} dal clan!`, 3500); Sound.play('chest'); }
      if (tab !== 'clan') { unread++; updateBadge(); }
      softClan();
    },
    onClanInvite: (id, clan) => {
      if (B) return;
      const f = profile.friends.find((x) => x.id === id);
      Sound.play('msg');
      const body = modal(`<div class="center"><div style="font-size:3rem">${esc(clan.badge || '🛡️')}</div>
        <h3>${esc(f ? f.name : id)} ti invita nel clan</h3><p><b>${esc(clan.name || 'Clan')}</b></p>
        ${profile.clan ? '<p class="muted">Lascerai il tuo clan attuale.</p>' : ''}
        <div class="row"><button class="btn grey" id="no" type="button">No, grazie</button><button class="btn gold" id="yes" type="button">Entra</button></div></div>`);
      body.querySelector('#no').onclick = closeModal;
      body.querySelector('#yes').onclick = () => {
        if (profile.clan) Social.leaveClan();
        Social.joinClan(clan);
        P.creditDonations(profile);
        save(); closeModal(); render(); toast('Benvenuto nel clan!');
      };
    },
    onBattleMsg,
  });
  netDot(Social.status());

  // Aggiorna ogni secondo i conti alla rovescia dei bauli
  setInterval(() => {
    if (B || !$('#modal').hidden) return;
    if (tab === 'battaglia') renderBattleTab();
    else if (tab === 'negozio') renderShop();
  }, 1000);

  // Prepara subito i disegni (personaggi, templi, pubblico) così in battaglia sono già pronti
  Sprites.preload(Sprites.keys());
  render();
  if (!profile.seen.howto) { profile.seen.howto = true; save(); setTimeout(howTo, 400); }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
