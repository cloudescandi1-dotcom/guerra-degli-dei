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
  const EMOTES = ['😀', '😂', '😡', '👍', '😱'];
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
      <span class="cost"><span>${d.cost}</span></span><span class="em">${d.emoji}</span><span class="nm">${esc(d.name)}</span>${extra}</button>`;
  }

  // ---------------------------------------------------------------- barra in alto e schede
  let tab = 'battaglia';
  function renderTop() {
    $('#top-name').textContent = profile.name;
    $('#top-trophies').textContent = profile.trophies;
    $('#top-gold').textContent = profile.gold;
    $('#top-arena').textContent = D.ARENAS[P.arena(profile)].icon;
  }
  function render() {
    renderTop();
    if (tab === 'battaglia') renderBattleTab();
    else if (tab === 'carte') renderCards();
    else if (tab === 'clan') renderClan();
    else renderArenas();
  }
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
      return `<button type="button" class="chest full ${st === 'pronto' ? 'ready' : ''}" data-slot="${i}"><span class="ci">${info.icon}</span>${label}<small>${D.ARENAS[c.arena].name.split(' ')[0]}</small></button>`;
    }).join('');
    const giftOk = P.giftReady(profile, now);
    $('#tab-battaglia').innerHTML = `
      <div class="arena-banner" style="background:linear-gradient(${ar.sky}, ${ar.ground[0]})">
        <div class="icon">${ar.icon}</div>
        <h3>Arena ${a + 1}: ${esc(ar.name)}</h3>
        <p>🏆 ${profile.trophies}${next ? ' / ' + next.trophies + ' per ' + esc(next.name) : ' — arena finale!'}</p>
        <div class="trophy-bar"><div style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>
      </div>
      <button id="go-battle" class="btn gold battle-btn" type="button">⚔️ BATTAGLIA</button>
      <div class="row">
        <button id="go-train" class="btn" type="button">🎯 Allenamento</button>
        <button id="go-friend" class="btn green" type="button">🤝 Sfida un amico</button>
      </div>
      <h2>Bauli <small>— vinci le battaglie per ottenerne</small></h2>
      <div class="chests">${chests}</div>
      <button type="button" class="gift" id="gift">
        <span class="gi">🎁</span>
        <div><b>Dono degli dèi</b><small>${giftOk ? 'Pronto: toccalo per aprirlo!' : 'Prossimo dono tra ' + fmtWait(profile.giftAt - now)}</small></div>
        <span class="btn small ${giftOk ? 'gold' : 'grey'}">${giftOk ? 'Apri' : '⏳'}</span>
      </button>`;
    $('#go-battle').onclick = () => startLadder();
    $('#go-train').onclick = () => trainDialog();
    $('#go-friend').onclick = () => { tab = 'clan'; document.querySelector('[data-tab=clan]').click(); };
    $('#gift').onclick = () => {
      const r = P.openGift(profile, Date.now());
      if (!r) { toast('Il dono non è ancora pronto'); return; }
      save(); showReward(r); render();
    };
    for (const el of document.querySelectorAll('.chest.full')) el.onclick = () => chestDialog(+el.dataset.slot);
  }

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
    const body = modal(`<div class="center"><div style="font-size:4rem">${info.icon}</div><h3>${info.name}</h3>
      <p>Arena: ${esc(D.ARENAS[c.arena].name)}<br>Contiene circa ${Math.round(info.cards * (1 + c.arena * 0.25))} carte e delle monete.</p>
      ${st === 'in apertura' ? `<p>Si apre tra <b>${fmtWait(c.unlockAt - now)}</b></p>`
        : busy ? '<p class="muted">Stai già aprendo un altro baule: uno alla volta!</p>'
          : `<p>Tempo di apertura: <b>${fmtWait(info.time * 1000)}</b></p><button id="unlock" class="btn gold full" type="button">Inizia ad aprire</button>`}</div>`);
    const u = body.querySelector('#unlock');
    if (u) u.onclick = () => { P.startUnlock(profile, slot, Date.now()); save(); closeModal(); render(); };
  }

  function showReward(r) {
    Sound.play('chest');
    const before = r.before || {};
    const cards = Object.entries(r.cards).map(([k, n]) => cardHtml(k, { count: n, level: false, cls: '' })).join('');
    modal(`<div class="center"><div style="font-size:3.5rem">${D.CHESTS[r.type].icon}</div><h3>${D.CHESTS[r.type].name}</h3>
      <p>🪙 <b>+${r.gold}</b> monete</p></div><div class="reward">${cards}</div>
      <button class="btn gold full" type="button" onclick="document.querySelector('#modal .close').click()">Fantastico!</button>`);
    renderTop();
    void before;
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

  function startVsBot(mode, level) {
    const a = P.arena(profile);
    const pool = D.CARDS.filter((c) => c.arena <= a).map((c) => c.key);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const foeDeck = pool.slice(0, 8);
    const avg = Math.max(1, Math.round(P.avgLevel(profile)));
    const foeLv = {};
    for (const k of foeDeck) foeLv[k] = Math.max(1, Math.min(D.MAX_LEVEL, avg + (level === 'difficile' && mode === 'ladder' ? 0 : 0)));
    startBattle({
      mode, me: 0, role: 'local', arena: a,
      foeName: FOE_NAMES[Math.floor(Math.random() * FOE_NAMES.length)] + ' 🤖',
      bot: Bot.createBot(level, Math.floor(Math.random() * 1e9)),
      match: { decks: [profile.deck.slice(), foeDeck], levels: [P.deckLevels(profile), foeLv], towerLevels: [avg, avg], seed: Math.floor(Math.random() * 1e9) },
    });
  }

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
      <div class="big">${d.emoji}</div><h3>${esc(d.name)}</h3>
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

  // ---------------------------------------------------------------- scheda Arene
  function renderArenas() {
    const cur = P.arena(profile);
    $('#tab-arene').innerHTML = '<h2>Il cammino verso l\'Olimpo</h2>' + D.ARENAS.map((a, i) => i).reverse().map((i) => {
      const a = D.ARENAS[i];
      const cards = D.CARDS.filter((c) => c.arena === i).map((c) => c.emoji).join('');
      return `<div class="arena-row ${i === cur ? 'current' : ''} ${i > cur ? 'locked' : ''}" style="background:linear-gradient(90deg, ${a.sky}, ${a.ground[0]})">
        <span class="ai">${i > cur ? '🔒' : a.icon}</span>
        <div><h3>Arena ${i + 1}: ${esc(a.name)}</h3><p>🏆 da ${a.trophies} coppe${i === cur ? ' — <b>sei qui!</b>' : ''}</p><div class="unl">${cards}</div></div></div>`;
    }).join('') + `<p class="muted">Vinci per guadagnare ${P.WIN_TROPHIES} coppe, perdi e ne lasci ${P.LOSS_TROPHIES}. Una volta raggiunta un'arena non si torna indietro.</p>`;
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
          return `<div class="msg req ${mine ? 'mine' : ''}">${who}<div class="rq"><span class="em">${d.emoji}</span>
            <div>Chiede <b>${esc(d.name)}</b><br>${got}/${m.max} ricevute</div>
            ${mine ? '' : `<button class="btn small ${canGive ? 'green' : 'grey'}" data-donate="${m.id}" type="button" ${canGive ? '' : 'disabled'}>Dona</button>`}</div></div>`;
        }
        return `<div class="msg ${mine ? 'mine' : ''}">${who}${esc(m.text)}</div>`;
      }).join('');
      clanHtml = `<div class="box">
        <div class="clan-head"><span class="cb">${clan.badge}</span><div><h3>${esc(clan.name)}</h3>
          <span class="muted">${members.length} membri · ${online} online</span></div></div>
        <h2>Membri</h2>
        ${members.sort((a, b) => b.trophies - a.trophies).map((m) => `<div class="friend"><span class="dot ${m.id === profile.id || Social.isOnline(m.id) ? 'on' : ''}"></span>
          <div class="who"><b>${esc(m.id === profile.id ? profile.name + ' (tu)' : m.name)}</b><small>🏆 ${m.id === profile.id ? profile.trophies : m.trophies} · ${m.role === 'capo' ? '👑 capo' : 'membro'}</small></div></div>`).join('')}
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
          mode: 'friend', role: 'host', me: 0, friendId: id, arena, foeName: name,
          match: { decks: [profile.deck.slice(), deck], levels: [friendLevels(profile.deck), friendLevels(deck)], towerLevels: [7, 7], seed },
        });
        break;
      }
      case 'start':
        if (awaitingStart !== id) return;
        awaitingStart = null;
        closeModal();
        startBattle({ mode: 'friend', role: 'guest', me: 1, friendId: id, arena: msg.arena | 0, foeName: name });
        break;
      case 'snap':
        if (B && B.cfg.role === 'guest' && B.cfg.friendId === id && msg.s) guestSnap(msg.s);
        break;
      case 'play':
        if (B && B.cfg.role === 'host' && B.cfg.friendId === id && Number.isInteger(msg.slot) && isFinite(msg.x) && isFinite(msg.y)) B.remote.push(msg);
        break;
      case 'emote':
        if (B && B.cfg.friendId === id && EMOTES.includes(msg.e)) bubble('#emote-foe', msg.e);
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
  const R = Render.create(canvas);
  let B = null;

  function fitCanvas() {
    const f = $('#field').getBoundingClientRect();
    const w = Math.min(f.width, (f.height * E.W) / E.H);
    canvas.style.width = Math.floor(w) + 'px';
    canvas.style.height = Math.floor((w * E.H) / E.W) + 'px';
    R.resize();
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
    $('#emote-bar').hidden = true;
    $('#btn-emote').hidden = cfg.mode !== 'friend';
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
        if (B.cfg.bot) {
          const a = B.cfg.bot.think(B.state, 1, E.TICK);
          if (a) E.play(B.state, 1, a.slot, a.x, a.y);
        }
        for (const m of B.remote.splice(0)) E.play(B.state, 1, m.slot, m.x, m.y);
        E.step(B.state);
      }
      B.view = B.state;
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
      const hand = v.players[B.me].hand;
      R.draw(v, { me: B.me, dragKey: B.selected >= 0 ? hand[B.selected] : null, gx: B.gx, gy: B.gy });
      hud(v);
      if (v.over && !B.ended) { B.ended = true; setTimeout(() => endBattle(v), 1400); }
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
      if (navigator.vibrate) navigator.vibrate(80);
      banner(fresh.some((r) => r.owner === B.me) ? '💥 Hai perso un tempio!' : '👑 Tempio abbattuto!');
    }
    if (!B.doubleShown && !v.inOvertime && v.t >= v.duration - 60) { B.doubleShown = true; banner('💧 Ambrosia doppia!'); }
    if (!B.otShown && v.inOvertime) { B.otShown = true; banner('⏱️ Supplementari: chi abbatte un tempio vince!'); }
    if (B.state) B.state.events.length = 0;
  }

  function hud(v) {
    const me = B.me, pl = v.players[me];
    const left = v.inOvertime ? Math.max(0, v.duration + v.overtime - v.t) : Math.max(0, v.duration - v.t);
    $('#clock').textContent = fmtClock(left);
    $('#clock-label').textContent = v.inOvertime ? 'Supplementari' : v.t >= v.duration - 60 ? 'Ambrosia ×2' : 'Tempo';
    $('.clock').classList.toggle('double', v.t >= v.duration - 60);
    $('.clock').classList.toggle('over', v.inOvertime);
    $('#foe-crowns').textContent = '👑 ' + v.crowns[1 - me];
    $('#my-crowns').textContent = '👑 ' + v.crowns[me];
    $('#amb-num').dataset.n = Math.floor(pl.amb);
    $('#amb-fill').style.width = (pl.amb / E.AMB_MAX) * 100 + '%';
    const key = pl.hand.join() + '|' + pl.queue[0];
    if (key !== B.handKey) {
      B.handKey = key;
      $('#hand').innerHTML = pl.hand.map((k, i) => {
        const d = D.BY_KEY[k];
        return `<div class="card ${i === B.selected ? 'sel' : ''}" data-slot="${i}" style="--rc:${D.RARITY[d.rarity].color}">
          <span class="cost"><span>${d.cost}</span></span><span class="em">${d.emoji}</span><span class="nm">${esc(d.name)}</span><span class="wait"></span></div>`;
      }).join('');
      const nx = D.BY_KEY[pl.queue[0]];
      $('#next-card').textContent = nx ? nx.emoji : '';
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

  $('#btn-emote').onclick = () => {
    const bar = $('#emote-bar');
    bar.innerHTML = EMOTES.map((x) => `<button type="button">${x}</button>`).join('');
    bar.hidden = !bar.hidden;
    for (const b of bar.querySelectorAll('button')) b.onclick = () => {
      bar.hidden = true;
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
      if (out.chest) extra += `<p class="center">Hai vinto un <b>${D.CHESTS[out.chest].icon} ${D.CHESTS[out.chest].name}</b>!</p>`;
      if (out.chestsFull) extra += '<p class="center muted">Spazi per i bauli pieni: aprine qualcuno!</p>';
      if (out.newArena != null) {
        const a = D.ARENAS[out.newArena];
        extra += `<div class="box center"><div style="font-size:3rem">${a.icon}</div><b>Nuova arena: ${esc(a.name)}!</b>
          <p>Carte sbloccate: ${out.newCards.map((k) => D.BY_KEY[k].emoji + ' ' + esc(D.BY_KEY[k].name)).join(', ')}</p></div>`;
      }
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
      <button id="reset" class="btn full red" type="button" style="width:100%">Ricomincia da zero</button>
      <p class="muted">Personaggi disegnati con le emoji del tuo dispositivo. Gioco creato per divertimento, ispirato ai giochi di carte in tempo reale.</p>`);
    body.querySelector('#snd').onclick = () => { profile.sound = !profile.sound; Sound.setOn(profile.sound); save(); $('#btn-settings').click(); };
    body.querySelector('#howto').onclick = howTo;
    body.querySelector('#reset').onclick = () => {
      const b2 = modal(`<h3>Ricominciare?</h3><p>Perdi coppe, carte, monete, amici e clan. <b>Non si può annullare.</b></p>
        <div class="row"><button class="btn grey" id="no" type="button">No</button><button class="btn red" id="yes" type="button">Sì, cancella tutto</button></div>`);
      b2.querySelector('#no').onclick = closeModal;
      b2.querySelector('#yes').onclick = () => {
        const id = profile.id;   // il codice amico resta lo stesso
        profile = P.fresh(); profile.id = id; save(); closeModal(); render(); toast('Nuova partenza!');
      };
    };
  };

  function howTo() {
    modal(`<h3>📖 Come si gioca</h3>
      <p><b>Obiettivo:</b> abbattere i templi nemici. Ogni tempio laterale vale una 👑, il Tempio del Re le vale tutte e tre e vince subito.</p>
      <p><b>Ambrosia 💧:</b> ogni carta costa ambrosia, che si ricarica da sola (fino a 10). Nell'ultimo minuto si ricarica il doppio più veloce.</p>
      <p><b>Giocare una carta:</b> trascinala sul campo, oppure toccala e poi tocca il punto del campo. Le truppe si mettono solo nella tua metà; gli incantesimi ovunque.</p>
      <p><b>Le truppe</b> camminano da sole e attaccano il nemico più vicino; chi cammina passa dai ponti, chi vola no.</p>
      <p><b>Dopo 3 minuti</b> vince chi ha più corone. Se siete pari si va ai supplementari: chi abbatte il primo tempio vince.</p>
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
      if (got > 0) { toast(`🎁 Hai ricevuto ${got} carte dal clan!`, 3500); Sound.play('chest'); }
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
    if (!B && tab === 'battaglia' && $('#modal').hidden) renderBattleTab();
  }, 1000);

  render();
  if (!profile.seen.howto) { profile.seen.howto = true; save(); setTimeout(howTo, 400); }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
