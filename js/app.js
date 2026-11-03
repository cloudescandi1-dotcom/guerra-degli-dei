// Interfaccia di "Guerra degli Dèi": menu, battaglia, carte, bauli, arene, amici e clan.
(function () {
  'use strict';
  const D = GameData, E = Engine, P = Profile;
  const $ = (s) => document.querySelector(s);
  const store = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  let profile = P.load(store);
  // Salva sul telefono e, dopo qualche secondo, manda al server SOLO le cose del telefono
  // (nome, mazzo, amici, chat, clan...). Monete, gemme, carte e coppe le decide il server.
  const save = () => {
    Server.accorcia(profile);   // chat corte: il server accetta richieste di al massimo 64 KB
    P.save(profile, store);
    if (!window.Cloud || !Cloud.client()) return;
    clearTimeout(aggiornaTimer);
    aggiornaTimer = setTimeout(mandaAggiorna, 3000);
  };
  // aggiornaInviati: per ogni campo, il testo mandato l'ultima volta con successo (si rimanda solo ciò che cambia)
  let aggiornaTimer = null, aggiornaInviati = {}, aggiornaAvvisato = false;
  async function mandaAggiorna() {
    clearTimeout(aggiornaTimer);
    const { campi, testi } = Server.campiCambiati(Server.accorcia(profile), aggiornaInviati);
    if (!Object.keys(campi).length) return;
    try {
      const r = await Server.chiedi('aggiorna', { campi });
      Object.assign(aggiornaInviati, testi);
      // Il server controlla campo per campo: quelli rifiutati non sono stati salvati online
      const rifiutati = (r && r.out && Array.isArray(r.out.rifiutati)) ? r.out.rifiutati : [];
      if (rifiutati.length) console.error('aggiorna: il server ha rifiutato', rifiutati);
      // Un mazzo con carte che il server non ci dà: si usa il mazzo salvato sul server
      if (rifiutati.includes('deck') && r.profilo && Array.isArray(r.profilo.deck)) {
        profile.deck = r.profilo.deck.slice();
        aggiornaInviati.deck = JSON.stringify(profile.deck);
        P.save(profile, store);
        if (!B && $('#modal').hidden) render();
        toast('Il mazzo è stato rimesso come sul server', 3000);
      }
    } catch (e) {
      // senza rete si riprova al prossimo salvataggio; se il server rifiuta i dati lo diciamo (una volta)
      if (e && e.message === 'dati_non_validi') {
        console.error('aggiorna: il server ha rifiutato i dati del telefono', Object.keys(campi));
        if (!aggiornaAvvisato) {
          aggiornaAvvisato = true;
          toast('Non riesco a salvare online amici, clan o mazzo. Se continua, riavvia il gioco.', 5000);
        }
      }
    }
  }
  Sound.setOn(profile.sound);

  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmtClock = (s) => { s = Math.ceil(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function fmtWait(ms) {
    const s = Math.ceil(ms / 1000);
    if (s >= 3600) return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
    if (s >= 60) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
    return s + 's';
  }
  // un conto alla rovescia che il timer qui sotto aggiorna da solo, senza ridisegnare la scheda
  const conto = (fine, now) => `<span data-fine="${fine}">${fmtWait(fine - now)}</span>`;
  const fmtHour = (t) => new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const EMOTES = ['😀', '😂', '😡', '👍', '😱', '😴', '😭', '🤩'];
  const PHRASES = ['Buona fortuna!', 'Bella giocata!', 'Wow!', 'Grazie!', 'Bella partita!', 'Ops'];
  // Faccine da aggiungere ai messaggi della chat con un tocco
  const FACCINE_CHAT = ['😀', '😂', '👍', '🔥', '⚔️', '🛡️', '👑', '🏆', '⚡', '🦉', '🏛️', '😱', '😭', '🤩', '🙏', '❤️'];
  // Le faccine animate si vedono con il nostro Zeus (blu o rosso) che si muove in modo diverso per ognuna
  const MOSSE = { '😀': 'salta', '😂': 'ride', '😡': 'trema', '👍': 'annuisce', '😱': 'spavento', '😴': 'dondola', '😭': 'piange', '🤩': 'gira' };
  // e la faccia che fa il Re per ognuna (disegni re_... in sprites-chibi.js)
  const FACCE = { '😀': 'felice', '😂': 'ride', '😡': 'arrabbiato', '👍': 'ok', '😱': 'spavento', '😴': 'dorme', '😭': 'piange', '🤩': 'stelle' };
  const reFaccia = (e, team) => Sprites.url('re_' + FACCE[e], team);
  // primo piano (testa e corona) per i bottoni del pannello: il disegno è già inquadrato,
  // così resta nitido (ingrandirlo con lo zoom lo faceva sgranare sull'iPhone)
  const primiPiani = {};
  const rePrimoPiano = (e) => primiPiani[e] || (primiPiani[e] = 'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(Sprites.svgText('re_' + FACCE[e], 0).replace(/viewBox="[^"]*"/, 'viewBox="16 -6 68 68"')));
  // Nelle chat: Zeus blu se l'hai mandata tu, rosso se l'ha mandata un altro. Si muove solo l'ultima.
  const zeusChat = (e, mio, viva) =>
    `<span class="emo-zeus in-chat ${viva ? MOSSE[e] : ''}"><img src="${reFaccia(e, mio ? 0 : 1)}" alt="${esc(e)}" draggable="false"></span>`;
  const testoChat = (t, mio, viva) => (MOSSE[t] && Sprites.has('basileus') ? zeusChat(t, mio, viva) : esc(t));
  // bottone 💬 accanto a Invia e pannello con le faccine animate: un tocco la manda subito
  const bottoneEmote = (input, invia) => `<button type="button" class="btn small emo-apri" data-per="${input}" data-invia="${invia}" aria-label="Faccine animate"><img src="${rePrimoPiano('😀')}" alt="" draggable="false"></button>`;
  const pannelloEmote = (input) => `<div class="emote-chat" data-per="${input}" hidden>${Object.keys(MOSSE).map((f) => `<button type="button" data-e="${f}" aria-label="${f}"><img src="${rePrimoPiano(f)}" alt="" draggable="false"></button>`).join('')}</div>`;
  document.addEventListener('click', (e) => {
    const apri = e.target.closest('.emo-apri');
    if (apri) {
      const p = document.querySelector(`.emote-chat[data-per="${apri.dataset.per}"]`);
      if (p) { p.hidden = !p.hidden; Sound.play('tap'); }
      return;
    }
    const b = e.target.closest('.emote-chat button');
    if (!b) return;
    const box = document.getElementById(b.parentElement.dataset.per);
    const invia = document.querySelector(`.emo-apri[data-per="${b.parentElement.dataset.per}"]`);
    if (!box || !invia) return;
    box.value = b.dataset.e;
    Sound.play('emo_' + FACCE[b.dataset.e]);
    document.getElementById(invia.dataset.invia).click();
  });
  const barraFaccine = (id) => `<div class="faccine-chat" data-per="${id}">${FACCINE_CHAT.map((f) => `<button type="button">${f}</button>`).join('')}</div>`;
  // un tocco su una faccina la aggiunge alla casella di testo (vale per tutte le chat, anche quelle aperte dopo)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.faccine-chat button');
    if (!b) return;
    const box = document.getElementById(b.parentElement.dataset.per);
    if (!box) return;
    box.value = (box.value + b.textContent).slice(0, 200);
    box.focus();
    Sound.play('tap');
  });
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

  // ---------------------------------------------------------------- il server decide
  // Ogni azione che cambia monete, gemme, carte o coppe passa dal server. Se non risponde
  // (niente rete) l'azione non si fa; se rifiuta, si mostra il motivo.
  let occupato = false;
  const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));
  // Mette nel profilo del telefono la risposta del server (solo le cose che decide lui) e la salva
  function accetta(r) {
    // se il telefono ha progressi e il server manda un profilo nuovo di zecca, prima se ne tiene una copia
    Server.copiaDiSicurezza(profile, r.profilo, store);
    Server.unisci(profile, r.profilo);
    P.save(profile, store);
  }
  // Accesso scaduto (il server risponde 401): si avvisa e si prova a rientrare; poi la richiesta si ripete
  Server.ricollega = async () => {
    if (!window.Cloud) return false;
    toast('Accesso scaduto: sto ricollegando…', 2500);
    return Cloud.ricollega();
  };
  // Il server dice "offline" sia senza rete sia senza accesso (es. captcha): il telefono sa se la rete c'è
  const senzaRete = () => navigator.onLine === false;
  const senzaServer = () => (senzaRete() ? 'Senza internet' : 'Non collegato al server');
  // Testo da mostrare per un errore del server
  function messaggioErrore(e, rifiuto) {
    const c = e && e.message;
    if (c === 'offline') return senzaRete() ? 'Serve internet per questo' : 'Non riesco a collegarmi al server: riprova tra poco';
    if (c === 'non_collegato') return 'Accesso scaduto: chiudi e riapri il gioco, oppure rientra da ⚙️ → 👤 Account';
    if (c === 'non_permesso') return rifiuto || 'Il server non lo permette';
    if (c === 'riprova') return 'Il server è occupato: riprova tra poco';
    return 'Qualcosa non ha funzionato: riprova';
  }
  // Chiede un'azione al server. Restituisce { profilo, out } oppure null (e avvisa con un messaggio).
  // `rifiuto` = frase da mostrare se il server dice di no. `prima` = manda subito le cose del telefono.
  async function chiediServer(azione, dati, rifiuto, prima) {
    if (occupato) return null;   // un tocco alla volta
    occupato = true;
    try {
      if (prima) await mandaAggiorna();
      const r = await Server.chiedi(azione, dati);
      accetta(r);
      return r;
    } catch (e) {
      toast(messaggioErrore(e, rifiuto), 3000);
      // Se il server dice di no, forse il nostro profilo è indietro: lo riallineiamo
      if (e && e.message === 'non_permesso') setTimeout(sincronizza, 0);
      return null;
    } finally { occupato = false; }
  }
  // Riallinea il profilo con quello del server (all'avvio, al ritorno nell'app, dopo un rifiuto).
  // Restituisce quante donazioni nuove sono state accreditate.
  async function sincronizza() {
    if (B || occupato || !window.Cloud || !Cloud.info()) return 0;
    try {
      const r = await Server.chiedi('profilo', {});
      accetta(r);
      renderTop();
      if (!B && $('#modal').hidden) { if (tab === 'clan') softClan(); else render(); }
      return Server.accreditate(r);   // il numero lo dice il server
    } catch (e) { return 0; }   // senza rete si va avanti con quello che c'è
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizza(); });

  // Ritira un premio del Cammino degli Eroi (lo mostra e restituisce il premio, oppure null)
  async function ritiraCammino(arena, t) {
    const ris = await chiediServer('cammino_ritira', { arena, t }, 'Questo premio non è ancora tuo');
    if (!ris) return null;
    const r = ris.out;
    if (r.cards) showReward(r); else { Sound.play('chest'); toast(r.gold ? `🪙 +${r.gold} monete` : `💎 +${r.gems} gemme`); }
    return r;
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
      extra += `<span class="lv">Livello ${c.level}</span>`;
      if (o.progress) extra += up
        ? `<div class="prog"><div style="width:${Math.min(100, (c.count / up.copies) * 100)}%"></div><b>${c.count}/${up.copies}</b></div>`
        : '<div class="prog max"><div style="width:100%"></div><b>MAX</b></div>';
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
    const offerHtml = offers.map((o) => {
      const d = D.BY_KEY[o.key];
      const afford = o.cur === 'gold' ? profile.gold >= o.price : profile.gems >= o.price;
      return `<div class="offer ${o.bought ? 'sold' : ''}" style="--rc:${D.RARITY[d.rarity].color}">${cardHtml(o.key, { level: false, count: o.n })}
        <button class="btn small ${o.bought ? 'grey' : afford ? 'green' : 'grey'}" data-buy="${o.key}" type="button" ${o.bought ? 'disabled' : ''}>
          ${o.bought ? 'Comprata' : (o.cur === 'gold' ? '🪙 ' : '💎 ') + o.price}</button>
        <small>${esc(D.RARITY[d.rarity].name)}</small></div>`;
    }).join('');
    const gemHtml = D.GEM_SHOP.map((it) => {
      const icon = it.kind === 'chest' ? chestArt(it.chest) : it.icon;
      const name = it.kind === 'chest' ? D.CHESTS[it.chest].name : it.name;
      const what = it.kind === 'chest' ? 'Si apre subito' : `🪙 ${it.amount} monete`;
      return `<div class="gem-item"><span class="ci">${icon}</span><div><b>${name}</b><small>${what}</small></div>
        <button class="btn small ${profile.gems >= it.price ? 'green' : 'grey'}" data-gem="${it.id}" type="button">💎 ${it.price}</button></div>`;
    }).join('');
    $('#tab-negozio').innerHTML = `
      <div class="nastro"><span>Offerte del giorno</span><em>⏱ ${conto(now + P.msToRomeMidnight(now), now)}</em></div>
      <p class="muted">Cambiano ogni giorno a mezzanotte (ora di Roma).</p>
      <div class="offers">${offerHtml}</div>
      <div class="nastro viola"><span>Tesoro degli Dèi</span><em>💎 ${profile.gems || 0}</em></div>
      <div class="box">${gemHtml}</div>
      <p class="muted">Le gemme non si comprano: le trovi nei bauli e nel baule del giorno.</p>`;
    for (const b of document.querySelectorAll('[data-buy]')) b.onclick = async () => {
      const o = offers.find((x) => x.key === b.dataset.buy);
      const manca = o.cur === 'gold' ? 'Non hai abbastanza monete' : 'Non hai abbastanza gemme';
      if ((o.cur === 'gold' ? profile.gold : profile.gems) < o.price) { toast(manca); return; }
      // le monete le abbiamo già controllate: se il server dice di no, l'offerta non è più valida
      const r = await chiediServer('negozio_compra', { key: o.key }, 'Questa offerta non è più disponibile: aggiorno il negozio');
      if (!r) return;
      Sound.play('chest');
      toast(`Hai comprato ${o.n} × ${D.BY_KEY[o.key].name}!`);
      render();
    };
    for (const b of document.querySelectorAll('[data-gem]')) b.onclick = () => {
      const it = D.GEM_SHOP.find((x) => x.id === b.dataset.gem);
      if (profile.gems < it.price) { toast('Non hai abbastanza gemme: le trovi nei bauli'); return; }
      const body = modal(`<div class="center"><h3>Comprare?</h3><p>Spendi <b>💎 ${it.price}</b> gemme.</p>
        <div class="row"><button class="btn grey" id="no" type="button">No</button><button class="btn gold" id="yes" type="button">Sì</button></div></div>`);
      body.querySelector('#no').onclick = closeModal;
      body.querySelector('#yes').onclick = async () => {
        const r = await chiediServer('gemme_compra', { id: it.id }, 'Non hai abbastanza gemme: le trovi nei bauli');
        if (!r) { closeModal(); return; }
        if (r.out.cards) showReward(r.out);
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
      if (st === 'vuoto') return `<div class="chest vuoto"><span class="ci">${chestArt('legno', 'chest-art sagoma')}</span>Spazio<br>baule</div>`;
      const info = D.CHESTS[c.type];
      const label = st === 'pronto' ? '<b>APRI!</b>' : st === 'in apertura' ? `<b data-fine="${c.unlockAt}">${fmtWait(c.unlockAt - now)}</b>` : `<b>${fmtWait(info.time * 1000)}</b>`;
      // fascia in alto come in Clash: cosa succede se lo tocchi
      const tag = st === 'pronto' ? '' : st === 'in apertura' ? '<span class="tag">Si apre tra</span>' : '<span class="tag">Tocca per aprire</span>';
      return `<button type="button" class="chest full ${st === 'pronto' ? 'ready' : ''}" data-slot="${i}">${tag}<span class="ci">${chestArt(c.type)}</span>${label}<small>${D.ARENAS[c.arena].name.split(' ')[0]}</small></button>`;
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
          <div class="trophy-bar"><span class="tb-ico">🏆</span><div style="width:${Math.max(0, Math.min(100, pct))}%"></div><b>${profile.trophies}${next ? ' / ' + next.trophies : ''}</b></div>
        </div>
        <span class="arena-tap">Cammino degli Eroi ›</span>
      </div>
      <div class="battle-row">
        <button id="go-battle" class="btn gold battle-btn" type="button"><span class="bb-spade">⚔️</span>Battaglia</button>
        <button id="go-friend" class="btn green side-btn" type="button"><span class="si">🤝</span>Amico</button>
      </div>
      <div class="chests">${chests}</div>
      <button type="button" class="gift" id="gift">
        <span class="gi">${chestArt('dono')}</span>
        <div><b>Baule del giorno</b><small>${giftOk ? 'Pronto: toccalo per aprirlo!' : 'Il prossimo a mezzanotte (ora di Roma), tra ' + conto(now + P.msToRomeMidnight(now), now)}</small></div>
        <span class="btn small ${giftOk ? 'gold' : 'grey'}">${giftOk ? 'Apri' : '⏳'}</span>
      </button>
      ${missioniHtml(now)}`;
    $('#arena-open').onclick = () => { Sound.play('tap'); openRoad(); };
    $('#go-battle').onclick = () => startLadder();
    $('#go-friend').onclick = () => { tab = 'clan'; document.querySelector('[data-tab=clan]').click(); };
    $('#gift').onclick = async () => {
      const r = await chiediServer('regalo_apri', {}, 'Il baule del giorno torna a mezzanotte');
      if (!r) return;
      showReward(r.out); render();
    };
    for (const el of document.querySelectorAll('.chest.full')) el.onclick = () => chestDialog(+el.dataset.slot);
    for (const b of document.querySelectorAll('[data-missione]')) b.onclick = async () => {
      const r = await chiediServer('missione_ritira', { id: b.dataset.missione }, 'Questa missione non è ancora finita');
      if (!r) return;
      Sound.play('chest');
      toast(`🪙 +${r.out.gold}${r.out.gems ? ` 💎 +${r.out.gems}` : ''}`);
      render();
    };
    const bc = $('#baule-corona');
    if (bc) bc.onclick = async () => {
      const r = await chiediServer('baule_corona', {}, 'Servono altre corone per il baule della corona');
      if (!r) return;
      showReward(r.out); render();
    };
  }

  // Missioni del giorno e baule della corona (i conti li fa il server: qui solo come stanno)
  function missioniHtml(now) {
    const m = P.missioniOggi(JSON.parse(JSON.stringify(profile)), now);   // su una copia: il profilo vero lo cambia solo il server
    const righe = m.lista.map((id) => {
      const def = P.MISSIONI.find((x) => x.id === id), fatte = Math.min(def.n, m.fatte[id] || 0);
      const presa = m.ritirate.includes(id), pronta = !presa && fatte >= def.n;
      const premio = `🪙 ${def.gold}${def.gems ? ` 💎 ${def.gems}` : ''}`;
      return `<div class="missione ${presa ? 'presa' : ''}"><div class="mi-testo"><b>${esc(def.testo)}</b>
        <div class="mi-bar"><div style="width:${fatte / def.n * 100}%"></div><span>${fatte}/${def.n}</span></div></div>
        ${presa ? '<span class="mi-ok">✔</span>' : `<button class="btn small ${pronta ? 'green' : 'grey'}" type="button" ${pronta ? `data-missione="${id}"` : 'disabled'}>${premio}</button>`}</div>`;
    }).join('');
    const corone = Math.min(P.CORONE_BAULE, m.corone);
    const bauleOk = !m.baule && corone >= P.CORONE_BAULE;
    return `<div class="missioni box"><div class="mi-testa"><b>Missioni del giorno</b><small>⏱ ${fmtWait(P.msToRomeMidnight(now))}</small></div>${righe}
      <button type="button" id="baule-corona" class="baule-corona ${bauleOk ? 'pronto' : ''}" ${bauleOk ? '' : 'disabled'}>
        <span class="bc-ico">${chestArt('oro')}</span>
        <div class="mi-testo"><b>Baule della corona</b>${m.baule ? '<small>Aperto! Torna domani</small>'
          : `<div class="mi-bar corona"><div style="width:${corone / P.CORONE_BAULE * 100}%"></div><span>👑 ${corone}/${P.CORONE_BAULE}</span></div>`}</div>
        ${bauleOk ? '<span class="btn small gold">Apri</span>' : ''}</button>
      <p class="muted mi-nota">Contano le battaglie della scalata e del torneo.</p></div>`;
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

  async function chestDialog(slot) {
    const now = Date.now();
    const c = profile.chests[slot];
    const st = P.chestState(c, now);
    const info = D.CHESTS[c.type];
    if (st === 'pronto') {
      const r = await chiediServer('baule_apri', { slot }, 'Il baule non è ancora pronto');
      if (!r) return;
      showReward(r.out); render();
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
    if (u) u.onclick = async () => {
      const r = await chiediServer('baule_sblocca', { slot }, 'Non puoi aprire questo baule adesso');
      closeModal();
      if (r) render();
    };
    body.querySelector('#skip').onclick = async () => {
      const r = await chiediServer('baule_salta', { slot }, 'Non hai abbastanza gemme: le trovi nei bauli');
      if (!r) return;
      showReward(r.out); render();
    };
  }

  // Apertura del baule a schermo intero: a ogni tocco esce un premio, le carte più rare per ultime.
  const ORDINE_RARITA = { comune: 0, rara: 1, epica: 2, leggendaria: 3 };
  function showReward(r) {
    closeModal();
    Sound.play('chest');
    const passi = [];
    if (r.gold) passi.push({ tipo: 'oro', n: r.gold });
    if (r.gems) passi.push({ tipo: 'gemme', n: r.gems });
    Object.entries(r.cards)
      .sort((a, b) => ORDINE_RARITA[D.BY_KEY[a[0]].rarity] - ORDINE_RARITA[D.BY_KEY[b[0]].rarity])
      .forEach(([k, n]) => passi.push({ tipo: 'carta', k, n }));
    const ov = document.createElement('div');
    ov.className = 'apri';
    ov.innerHTML = `<div class="apri-raggi"></div><div class="apri-lampo"></div>
      <h3 class="apri-titolo">${esc(D.CHESTS[r.type].name)}</h3>
      <div class="apri-scena"></div>
      <div class="apri-baule"><div class="apri-cuscino"></div>${chestArt(r.type, 'apri-art')}<span class="apri-resto">${passi.length}</span></div>
      <p class="apri-tocca">Tocca per aprire</p>`;
    document.body.appendChild(ov);
    const scena = ov.querySelector('.apri-scena'), baule = ov.querySelector('.apri-baule'), resto = ov.querySelector('.apri-resto');
    let i = 0, fermo = false;

    // Fa salire un numero da "da" ad "a" in ms millisecondi
    function contaSu(el, da, a, ms) {
      const t0 = performance.now();
      const passo = (t) => { const f = Math.min(1, (t - t0) / ms); el.textContent = Math.round(da + (a - da) * f); if (f < 1) requestAnimationFrame(passo); };
      requestAnimationFrame(passo);
    }
    function mostra(p) {
      baule.classList.remove('scuoti'); void baule.offsetWidth; baule.classList.add('scuoti');
      let rar = 'comune';
      if (p.tipo === 'carta') {
        const d = D.BY_KEY[p.k], R = D.RARITY[d.rarity], c = profile.cards[p.k], up = P.upgradeInfo(profile, p.k);
        rar = d.rarity;
        const dopo = c ? c.count : p.n, prima = Math.max(0, dopo - p.n);
        const barra = !c ? '' : up
          ? `<div class="apri-bar ${dopo >= up.copies ? 'pronta' : ''}"><div style="width:${Math.min(100, prima / up.copies * 100)}%"></div><b><span>${prima}</span>/${up.copies}</b></div>`
          : '<div class="apri-bar pronta"><div style="width:100%"></div><b>MAX</b></div>';
        scena.innerHTML = `<div class="apri-item" style="--rc:${R.color}">
          <div class="apri-carta">${cardHtml(p.k, { level: false })}</div>
          <div class="apri-info"><b class="apri-nome">${esc(d.name)}</b><small class="apri-rar">${R.name}</small>
          <span class="apri-x">×<span>0</span></span>${barra}</div></div>`;
        contaSu(scena.querySelector('.apri-x span'), 0, p.n, 450);
        setTimeout(() => {
          const b = scena.querySelector('.apri-bar div'), n = scena.querySelector('.apri-bar b span');
          if (b && up) { b.style.width = Math.min(100, dopo / up.copies * 100) + '%'; if (n) contaSu(n, prima, dopo, 600); }
        }, 450);
        Sound.play(ORDINE_RARITA[rar] >= 2 ? 'win' : 'play');
        if (navigator.vibrate) navigator.vibrate(ORDINE_RARITA[rar] >= 2 ? [30, 40, 60] : 20);
      } else {
        const oro = p.tipo === 'oro';
        scena.innerHTML = `<div class="apri-item apri-soldi"><div class="apri-moneta">${oro ? '🪙' : '💎'}</div>
          <div class="apri-info"><b class="apri-nome">${oro ? 'Monete' : 'Gemme'}</b><span class="apri-x">+<span>0</span></span></div></div>`;
        contaSu(scena.querySelector('.apri-x span'), 0, p.n, 600);
        Sound.play('tick');
      }
      ov.dataset.r = rar;
      if (rar === 'leggendaria' || rar === 'epica') { const l = ov.querySelector('.apri-lampo'); l.classList.remove('via'); void l.offsetWidth; l.classList.add('via'); }
      resto.textContent = passi.length - i - 1;
      resto.hidden = passi.length - i - 1 <= 0;
      ov.querySelector('.apri-tocca').textContent = 'Tocca per continuare';
    }
    function riepilogo() {
      ov.dataset.r = 'fine';
      baule.hidden = true;
      ov.querySelector('.apri-tocca').hidden = true;
      const carte = Object.entries(r.cards).map(([k, n]) => cardHtml(k, { count: n, level: false })).join('');
      scena.innerHTML = `<div class="apri-fine"><p class="apri-tot">🪙 <b>+${r.gold}</b>${r.gems ? ` &nbsp; 💎 <b>+${r.gems}</b>` : ''}</p>
        <div class="reward">${carte}</div><button class="btn gold full" type="button" id="reward-ok">Fantastico!</button></div>`;
      scena.querySelector('#reward-ok').onclick = (e) => { e.stopPropagation(); ov.remove(); renderTop(); };
    }
    ov.addEventListener('click', () => {
      if (fermo || ov.dataset.r === 'fine') return;
      fermo = true; setTimeout(() => { fermo = false; }, 350);
      if (i < passi.length) { mostra(passi[i]); i++; } else riepilogo();
    });
    renderTop();
  }

  function trainDialog() {
    const body = modal(`<h3>🎯 Allenamento</h3><p>Una battaglia di prova contro il computer: non si vincono né si perdono coppe.</p>
      <div class="row"><button class="btn green" data-l="facile" type="button">Facile</button>
      <button class="btn" data-l="medio" type="button">Medio</button>
      <button class="btn red" data-l="difficile" type="button">Difficile</button></div>`);
    for (const b of body.querySelectorAll('[data-l]')) b.onclick = () => { closeModal(); startVsBot('train', b.dataset.l); };
  }

  function startLadder() { startVsBot('ladder'); }

  async function startTour() {
    if (!profile.tour || profile.tour.done) {
      // entrare nel torneo costa (o è gratis una volta al giorno): lo decide il server
      const r = await chiediServer('torneo_inizia', {}, `Servono 💎 ${P.TOUR_RETRY_GEMS} gemme per rientrare oggi`, true);
      if (!r) return;
    }
    startVsBot('tour');
  }

  // Battaglia contro il computer. Allenamento: tutto sul telefono, niente premi.
  // Scalata e torneo: il server prepara la partita (avversario e semi) e poi rigioca le mosse
  // per controllare il risultato. Senza internet si gioca lo stesso, ma senza premi.
  async function startVsBot(mode, level) {
    if (occupato) return;
    let setup, id = null, offline = false, scaduto = false;
    if (mode === 'train') {
      setup = SetupBattaglia.prepara(profile, mode, level, Math.random);
    } else {
      occupato = true;
      try {
        await mandaAggiorna();   // il mazzo scelto deve essere arrivato al server
        const r = await Server.chiedi('battaglia_inizia', { mode });
        accetta(r);
        setup = r.out.setup; id = r.out.id;
      } catch (e) {
        // senza internet, o con l'accesso scaduto anche dopo aver provato a rientrare: si gioca senza premi
        scaduto = !!e && e.message === 'non_collegato';
        if (!e || (e.message !== 'offline' && !scaduto)) { toast(messaggioErrore(e, 'Adesso non puoi fare questa battaglia'), 3000); return; }
        offline = true;
        setup = SetupBattaglia.prepara(profile, mode, SetupBattaglia.livello(profile, mode), Math.random, Date.now());
      } finally { occupato = false; }
      if (B) return;   // nel frattempo è già iniziata un'altra battaglia
    }
    const a = setup.arena;
    startBattle({
      mode, me: 0, role: 'local', arena: a, battagliaId: id, offline,
      foeName: setup.foeName, foeLevel: setup.foeLevel,
      foeSub: mode === 'tour' ? 'Torneo · ' + P.regolaSettimana(Date.now()).nome : mode === 'ladder' ? 'Arena ' + (a + 1) + ' · ' + D.ARENAS[a].name : 'Allenamento',
      bot: Bot.createBot(setup.level, setup.botSeed),
      match: setup.match,
      // il copione per rivederla: con le stesse impostazioni e le stesse mosse esce la stessa partita
      replica: JSON.parse(JSON.stringify({ level: setup.level, botSeed: setup.botSeed, match: setup.match })),
    });
    if (offline) toast(scaduto ? 'Accesso scaduto: questa partita non dà premi' : senzaServer() + ': questa partita non dà premi', 3500);
  }

  // 2 contro 2 contro il computer: tu (giocatore 0) e un compagno computer (giocatore 2)
  // contro due computer (giocatori 1 e 3). Tutto sul telefono, come l'Allenamento: niente premi, niente server.
  function startDuo(level) {
    if (occupato || B) return;
    const setup = SetupBattaglia.preparaDuo(profile, level, Math.random);
    const n = setup.names;
    startBattle({
      mode: 'duo', me: 0, role: 'local', arena: setup.arena,
      foeName: n[1] + ' e ' + n[3], foeLevel: setup.foeLevel, foeSub: '2 contro 2 · con ' + n[2],
      // un computer per ognuno degli altri tre giocatori
      bots: [1, 2, 3].map((p) => ({ p, bot: Bot.createBot(level, setup.botSeeds[p]) })),
      compagno: { player: 2, name: n[2] },
      match: setup.match,
      // copione per "Rivedi": i semi dei tre computer bastano a rifare la stessa partita
      replica: JSON.parse(JSON.stringify({ duo: true, level, botSeeds: setup.botSeeds, match: setup.match, compagno: { player: 2, name: n[2] } })),
    });
  }

  // 2 contro 2 online: noi (giocatore 0) facciamo girare la partita, l'amico è il giocatore 2
  // e manda le sue giocate; gli avversari 1 e 3 sono computer della difficoltà scelta da noi.
  function avviaDuoHost(id, name, deckAmico, level) {
    const setup = SetupBattaglia.preparaDuoAmico(profile, deckAmico, level, Math.random);
    const n = setup.names;
    n[0] = profile.name; n[2] = name;
    Social.send(id, { t: 'start', duo: true, arena: setup.arena, names: n });
    closeModal();
    startBattle({
      mode: 'duo', role: 'host', me: 0, remoto: 2, friendId: id, arena: setup.arena,
      foeName: n[1] + ' e ' + n[3], foeLevel: setup.foeLevel, foeSub: '2 contro 2 · con ' + name,
      bots: [1, 3].map((p) => ({ p, bot: Bot.createBot(level, setup.botSeeds[p]) })),
      livello: level, riservaAmico: setup.botSeeds[2],   // per il computer che prende il posto dell'amico se si scollega
      compagno: { player: 2, name },
      match: setup.match,
    });
  }

  // Avviso in basso a sinistra: il compagno ha giocato una carta
  let avvisoTimer = null;
  function avvisoCompagno(key) {
    const el = $('#avviso-compagno'), d = D.BY_KEY[key];
    if (!el || !d || !B.cfg.compagno) return;
    el.innerHTML = `<span class="em">${art(key)}</span><span><small>${esc(B.cfg.compagno.name)}</small>${esc(d.name)}</span>`;
    el.hidden = false;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(avvisoTimer);
    avvisoTimer = setTimeout(() => { el.hidden = true; }, 1800);
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
      <button type="button" id="ev-classifica" class="event-card cl-card">
        <span class="ev-ico">🏅</span><div><h3>Classifica</h3><small>I guerrieri più forti del mondo e i tuoi amici</small></div>
        <span class="btn small gold">Apri</span>
      </button>
      <div class="event-card tour">
        <div class="event-head"><span class="ev-ico">🏆</span><div><h3>Torneo degli Dèi</h3><small>Carte tutte al livello ${P.TOUR_LEVEL} · avversari sempre più forti</small></div></div>
        <div class="regola-sett"><span>⚡ Sfida della settimana</span><b>${esc(P.regolaSettimana(now).nome)}</b><small>${esc(P.regolaSettimana(now).desc)}</small></div>
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
      </div>
      <div class="event-card duo">
        <div class="event-head"><span class="ev-ico">🤝</span><div><h3>2 contro 2</h3><small>Tu e un compagno computer contro due computer</small></div></div>
        <p class="ev-text">Ognuno ha la sua ambrosia e le sue carte; i templi sono della squadra. Partita amichevole: niente coppe né premi.</p>
        <div class="row">
          <button class="btn green" data-duo="facile" type="button">Facile</button>
          <button class="btn" data-duo="medio" type="button">Medio</button>
          <button class="btn red" data-duo="difficile" type="button">Difficile</button>
        </div>
        <button class="btn gold full" id="duo-amico" type="button" style="width:100%;margin-top:8px">🤝 Con un amico online</button>
      </div>`;
    $('#ev-classifica').onclick = () => { Sound.play('tap'); openClassifica('mondo'); };
    for (const b of document.querySelectorAll('#tab-eventi [data-l]')) b.onclick = () => startVsBot('train', b.dataset.l);
    for (const b of document.querySelectorAll('#tab-eventi [data-duo]')) b.onclick = () => startDuo(b.dataset.duo);
    $('#duo-amico').onclick = () => { Sound.play('tap'); scegliAmicoDuo(); };
    const play = $('#tour-play');
    if (play) play.onclick = () => { startTour(); };
    const claim = $('#tour-claim');
    if (claim) claim.onclick = async () => {
      const ris = await chiediServer('torneo_ritira', {}, 'Non c\'è nessun premio da ritirare');
      if (!ris) return;
      const r = ris.out;
      if (r.chest) showReward(Object.assign({}, r.chest, { gold: r.chest.gold + r.gold, gems: (r.chest.gems || 0) + r.gems }));
      else { Sound.play('chest'); toast(`🪙 +${r.gold}${r.gems ? `  💎 +${r.gems}` : ''}`); }
      render();
    };
  }

  // ---------------------------------------------------------------- Classifica
  // "Mondo": i primi 50 per coppe, li manda il server (solo nome, coppe, arena e clan).
  // "Amici": la fa il telefono con gli amici salvati nel profilo, quindi va anche senza internet.
  let clScheda = 'mondo', clMondo = null, clErrore = '', clCarica = false;
  function openClassifica(scheda) {
    clScheda = scheda || 'mondo';
    $('#classifica').hidden = false;
    renderClassifica();
    if (clScheda === 'mondo') caricaMondo();
  }
  $('#cl-close').onclick = () => { $('#classifica').hidden = true; render(); };
  for (const b of document.querySelectorAll('#classifica [data-cl]')) b.onclick = () => {
    Sound.play('tap');
    clScheda = b.dataset.cl;
    renderClassifica();
    if (clScheda === 'mondo') caricaMondo();
  };
  async function caricaMondo() {
    if (clCarica) return;
    clCarica = true; clErrore = '';
    if (!clMondo) renderClassifica();   // "sto caricando..." solo la prima volta
    try {
      clMondo = await Server.classifica();
    } catch (e) {
      clErrore = e && e.message === 'offline' ? 'offline' : 'server';
    } finally {
      clCarica = false;
      if (!$('#classifica').hidden) renderClassifica();
    }
  }
  const MEDAGLIE = ['🥇', '🥈', '🥉'];
  // Il podio dei primi 3: il primo al centro e più in alto, come in Clash
  function podioHtml(righe) {
    const ordine = [righe[1], righe[0], righe[2]];
    return `<div class="cl-podio">${ordine.map((r, i) => {
      if (!r) return '<div class="cl-gradino vuoto"></div>';
      const posto = r.pos;
      return `<div class="cl-gradino p${posto} ${r.tu ? 'me' : ''}">
        <span class="cl-medaglia">${MEDAGLIE[posto - 1]}</span>
        <b class="cl-pnome">${esc(r.name)}${r.tu ? ' <i>(tu)</i>' : ''}</b>
        <small class="cl-pclan">${r.clan ? esc(r.clan.badge + ' ' + r.clan.name) : D.ARENAS[r.arena].icon + ' ' + esc(D.ARENAS[r.arena].name)}</small>
        <span class="cl-coppe">🏆 ${r.trophies}</span>
        <span class="cl-base">${posto}</span>
      </div>`;
    }).join('')}</div>`;
  }
  // Una riga dalla 4ª posizione in giù (anche la tua, in fondo allo schermo)
  function rigaHtml(r, fondo) {
    const ar = D.ARENAS[r.arena] || D.ARENAS[0];
    const pos = r.pos ? (r.pos <= 3 ? MEDAGLIE[r.pos - 1] : r.pos) : '–';
    return `<div class="cl-riga ${r.tu || fondo ? 'me' : ''}">
      <span class="cl-pos ${r.pos > 999 ? 'lungo' : ''}">${pos}</span>
      <span class="cl-arena" title="${esc(ar.name)}">${ar.icon}</span>
      <div class="cl-chi"><b>${esc(r.name)}${r.tu && !fondo ? ' (tu)' : ''}</b><small>${r.clan ? esc(r.clan.badge + ' ' + r.clan.name) : 'Nessun clan'}</small></div>
      <span class="cl-coppe">🏆 ${r.trophies}</span>
    </div>`;
  }
  function renderClassifica() {
    for (const b of document.querySelectorAll('#classifica [data-cl]')) b.classList.toggle('on', b.dataset.cl === clScheda);
    const lista = $('#cl-list'), fondo = $('#cl-io');
    let righe = [], io = null, html = '';
    if (clScheda === 'amici') {
      righe = P.classificaAmici(profile);
      io = righe.find((r) => r.tu) || null;
      if (righe.length < 2) html = `<div class="cl-vuoto"><span>🤝</span><p>Aggiungi degli amici con il loro codice (scheda Clan) per sfidarli anche in classifica!</p></div>`;
    } else if (clMondo) {
      righe = clMondo.top || [];
      io = clMondo.io;
      if (!righe.length) html = `<div class="cl-vuoto"><span>🏛️</span><p>Ancora nessuno in classifica: vinci una battaglia e sarai il primo!</p></div>`;
    } else if (clErrore) {
      html = clErrore === 'offline'
        ? `<div class="cl-vuoto"><span>📡</span><p>${senzaRete() ? 'Niente internet: la classifica del mondo arriva appena torni online.' : 'Non riesco a collegarmi al server: la classifica del mondo arriva appena ci riesco.'}<br>Intanto guarda quella dei tuoi amici!</p><button class="btn gold" type="button" data-vai="amici">🤝 Amici</button></div>`
        : `<div class="cl-vuoto"><span>⏳</span><p>Il server non risponde in questo momento.</p><button class="btn" type="button" data-vai="mondo">Riprova</button></div>`;
    } else {
      html = `<div class="cl-vuoto"><span class="cl-gira">🏆</span><p>Carico la classifica…</p></div>`;
    }
    if (righe.length && !html) html = podioHtml(righe.slice(0, 3)) + righe.slice(3).map((r) => rigaHtml(r)).join('');
    // un avviso piccolo se la classifica del mondo è vecchia perché adesso non c'è rete
    if (clScheda === 'mondo' && clMondo && clErrore === 'offline') html = `<p class="cl-nota">📡 ${senzaServer()}: questa è la classifica di poco fa</p>` + html;
    lista.innerHTML = html;
    // In fondo, sempre visibile: la tua posizione
    if (clScheda === 'mondo' && clMondo) {
      fondo.innerHTML = io ? rigaHtml(io, true) + (io.pos ? '' : '<small class="cl-fuori">Sei oltre il 50° posto: vinci per salire!</small>')
        : '<div class="cl-riga me"><span class="cl-pos">–</span><div class="cl-chi"><b>' + esc(profile.name) + '</b><small>Vinci una battaglia per entrare in classifica</small></div></div>';
    } else if (clScheda === 'amici' && io) fondo.innerHTML = rigaHtml(io, true);
    else fondo.innerHTML = '';
    fondo.hidden = !fondo.innerHTML;
    for (const b of lista.querySelectorAll('[data-vai]')) b.onclick = () => {
      clScheda = b.dataset.vai;
      renderClassifica();
      if (clScheda === 'mondo') caricaMondo();
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
    for (const b of list.querySelectorAll('[data-road]')) b.onclick = async () => {
      const [i, t] = b.dataset.road.split(':').map(Number);
      if (!await ritiraCammino(i, t)) return;
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
      if (!el.classList.contains('locked')) el.addEventListener('pointerdown', (e) => prendiCarta(e, el));
      el.addEventListener('pointerdown', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 24 + 'deg');
        el.style.setProperty('--rx', (0.5 - (e.clientY - r.top) / r.height) * 24 + 'deg');
        el.classList.add('piega');
      });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, () => el.classList.remove('piega'));
      el.onclick = () => {
        if (appenaTrascinata) return;   // il clic che arriva alla fine di un trascinamento non apre la scheda
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

  // Trascinare una carta della collezione su una del mazzo (o il contrario, o due carte del mazzo)
  // le scambia. Col mouse parte appena ci si muove; col dito serve tenerla premuta un attimo,
  // così muovendo il dito subito la pagina scorre come sempre.
  let presa = null, appenaTrascinata = false;
  function prendiCarta(e, el) {
    if (presa || (e.pointerType === 'mouse' && e.button !== 0)) return;
    presa = { el, x: e.clientX, y: e.clientY, id: e.pointerId, attiva: false, copia: null, timer: 0 };
    if (e.pointerType !== 'mouse') presa.timer = setTimeout(() => { if (presa) iniziaTrascina(presa.x, presa.y); }, 250);
  }
  function iniziaTrascina(x, y) {
    const r = presa.el.getBoundingClientRect();
    const c = presa.el.cloneNode(true);
    c.classList.add('trascinata');
    c.style.width = r.width + 'px'; c.style.height = r.height + 'px';
    presa.dx = x - r.left; presa.dy = y - r.top;
    document.body.appendChild(c);
    presa.copia = c; presa.attiva = true;
    presa.el.classList.add('presa');
    muoviCopia(x, y);
    if (navigator.vibrate) navigator.vibrate(15);
  }
  function muoviCopia(x, y) {
    presa.copia.style.left = (x - presa.dx) + 'px';
    presa.copia.style.top = (y - presa.dy) + 'px';
    for (const d of document.querySelectorAll('#tab-carte .card.sopra')) d.classList.remove('sopra');
    const sotto = cartaSotto(x, y, presa.el);
    if (sotto) sotto.classList.add('sopra');
  }
  // La carta (diversa da quella presa) che sta sotto il dito, se lo scambio ha senso
  function cartaSotto(x, y, da) {
    const t = document.elementFromPoint(x, y);
    const el = t && t.closest('#tab-carte .card');
    if (!el || el === da || el.classList.contains('locked')) return null;
    const daMazzo = da.dataset.slot != null, aMazzo = el.dataset.slot != null;
    return daMazzo || aMazzo ? el : null;   // due carte della collezione non si scambiano
  }
  function lasciaCarta(e, annulla) {
    if (!presa || e.pointerId !== presa.id) return;
    clearTimeout(presa.timer);
    const p = presa; presa = null;
    if (!p.attiva) return;
    p.copia.remove();
    p.el.classList.remove('presa');
    for (const d of document.querySelectorAll('#tab-carte .card.sopra')) d.classList.remove('sopra');
    appenaTrascinata = true; setTimeout(() => { appenaTrascinata = false; }, 0);
    const sotto = annulla ? null : cartaSotto(e.clientX, e.clientY, p.el);
    if (!sotto) return;
    const slot = p.el.dataset.slot != null ? +p.el.dataset.slot : +sotto.dataset.slot;
    const key = p.el.dataset.slot != null ? sotto.dataset.key : p.el.dataset.key;
    if (P.setDeckCard(profile, slot, key)) { Sound.play('tap'); pickKey = null; save(); renderCards(); }
  }
  document.addEventListener('pointermove', (e) => {
    if (!presa || e.pointerId !== presa.id) return;
    if (!presa.attiva) {
      const lontano = Math.abs(e.clientX - presa.x) + Math.abs(e.clientY - presa.y) > 8;
      if (!lontano) return;
      if (e.pointerType === 'mouse') iniziaTrascina(e.clientX, e.clientY);
      else { clearTimeout(presa.timer); presa = null; return; }   // il dito si è mosso subito: è uno scorrimento
    }
    muoviCopia(e.clientX, e.clientY);
  });
  document.addEventListener('pointerup', (e) => lasciaCarta(e, false));
  document.addEventListener('pointercancel', (e) => lasciaCarta(e, true));
  // Mentre si trascina col dito la pagina non deve scorrere
  document.addEventListener('touchmove', (e) => { if (presa && presa.attiva) e.preventDefault(); }, { passive: false });

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
    if (upb) upb.onclick = async () => {
      const manca = c.count < up.copies ? 'Servono altre copie: le trovi nei bauli' : 'Non hai abbastanza monete';
      const r = await chiediServer('potenzia', { key }, manca);
      if (!r) return;
      // La scheda resta aperta (ridisegnata con il livello nuovo), così si vede subito il potenziamento
      render(); closeModal(); potenziata(key, profile.cards[key].level - 1, profile.cards[key].level);
    };
    const use = body.querySelector('#use');
    if (use) use.onclick = () => { pickKey = key; closeModal(); renderCards(); window.scrollTo(0, 0); $('#tab-carte').scrollTop = 0; };
  }

  // Festa del potenziamento a tutto schermo: la carta si gonfia, compare il livello nuovo e i numeri salgono
  function potenziata(key, da, a) {
    const d = D.BY_KEY[key], u = D.BY_KEY[d.unit || key], m0 = D.levelMul(da), m1 = D.levelMul(a);
    const righe = (d.type === 'spell' ? [['Danno', d.dmg]] : [['Vita', u.hp], ['Danno', u.dmg]])
      .filter((x) => x[1])
      .map(([nome, v]) => `<div class="pot-riga"><span>${nome}</span><b data-da="${Math.round(v * m0)}" data-a="${Math.round(v * m1)}">${Math.round(v * m0)}</b><em>+${Math.round(v * m1) - Math.round(v * m0)}</em></div>`).join('');
    const ov = document.createElement('div');
    ov.className = 'apri pot';
    ov.dataset.r = d.rarity;
    ov.innerHTML = `<div class="apri-raggi"></div><div class="apri-lampo via"></div>
      <div class="apri-scena"><div class="apri-item">
        <div class="apri-carta pot-carta">${cardHtml(key, { level: false })}</div>
        <div class="pot-liv"><span>Livello</span> <i>${da}</i> ➜ <b>${a}</b></div>
        <b class="apri-nome">${esc(d.name)}</b>
        <div class="pot-numeri">${righe}</div>
      </div></div>
      <button class="btn gold full" type="button" id="pot-ok">Fantastico!</button>`;
    document.body.appendChild(ov);
    Sound.play('win');
    if (navigator.vibrate) navigator.vibrate([20, 60, 40]);
    setTimeout(() => {
      for (const b of ov.querySelectorAll('.pot-riga b')) {
        const x0 = +b.dataset.da, x1 = +b.dataset.a, t0 = performance.now();
        const passo = (t) => { const f = Math.min(1, (t - t0) / 700); b.textContent = Math.round(x0 + (x1 - x0) * f); if (f < 1) requestAnimationFrame(passo); };
        requestAnimationFrame(passo);
      }
    }, 900);
    ov.querySelector('#pot-ok').onclick = () => { ov.remove(); cardDialog(key); };
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
    for (const b of body.querySelectorAll('[data-road]')) b.onclick = async () => {
      const r = await ritiraCammino(i, +b.dataset.road);
      if (!r) return;
      render();
      if (!r.cards) arenaDialog(i);
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
        <button class="btn small grey" data-chat="${esc(f.id)}" type="button">💬</button>
        <button class="btn small ${on ? 'gold' : 'grey'}" data-fight="${f.id}" type="button" ${on ? '' : 'disabled'}>⚔️</button>
        <button class="btn small ${on ? '' : 'grey'}" data-duo-amico="${f.id}" type="button" ${on ? '' : 'disabled'} title="2 contro 2 in squadra">🤝</button>
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
      const ultimi = clan.chat.slice(-80);
      const chat = ultimi.map((m, i) => {
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
        return `<div class="msg ${mine ? 'mine' : ''} ${MOSSE[m.text] ? 'emo-msg' : ''}">${who}${testoChat(m.text, mine, i === ultimi.length - 1)}</div>`;
      }).join('');
      clanHtml = `<div class="box">
        <div class="clan-head"><span class="cb">${esc(clan.badge)}</span><div><h3>${esc(clan.name)}</h3>
          <span class="muted">${members.length} membri · ${online} online</span></div></div>
        <h2>Membri</h2>
        ${members.sort((a, b) => b.trophies - a.trophies).map((m) => `<div class="friend"><span class="dot ${m.id === profile.id || Social.isOnline(m.id) ? 'on' : ''}"></span>
          <div class="who"><b>${esc(m.id === profile.id ? profile.name + ' (tu)' : m.name)}</b><small>🏆 ${m.id === profile.id ? profile.trophies : (m.trophies | 0)} · ${m.role === 'capo' ? '👑 capo' : 'membro'}</small></div></div>`).join('')}
        <h2>Chat del clan</h2>
        <div class="chat" id="clan-chat">${chat || '<p class="muted">Nessun messaggio. Saluta il tuo clan!</p>'}</div>
        <div class="field-row"><input id="clan-msg" type="text" maxlength="200" placeholder="Scrivi al clan...">${bottoneEmote('clan-msg', 'clan-send')}<button id="clan-send" class="btn small gold" type="button">Invia</button></div>
        ${pannelloEmote('clan-msg')}
        ${barraFaccine('clan-msg')}
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
        <button id="friend-rank" class="btn small" type="button" style="width:100%;margin-top:8px">🏅 Classifica (amici e mondo)</button>
      </div>
      <h2>Clan</h2>${clanHtml}`;

    $('#share').onclick = shareCode;
    $('#friend-rank').onclick = () => { Sound.play('tap'); openClassifica('amici'); };
    $('#friend-add').onclick = addFriendFromInput;
    $('#friend-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') addFriendFromInput(); });
    for (const b of document.querySelectorAll('[data-chat]')) b.onclick = () => openChat(b.dataset.chat);
    for (const b of document.querySelectorAll('[data-fight]')) b.onclick = () => challenge(b.dataset.fight);
    for (const b of document.querySelectorAll('[data-duo-amico]')) b.onclick = () => invitaDuo(b.dataset.duoAmico);
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
      const tutti = profile.chats[id] || [];
      const list = tutti.map((m, i) => `<div class="msg ${m.from === profile.id ? 'mine' : ''} ${MOSSE[m.text] ? 'emo-msg' : ''}"><small>${fmtHour(m.at)}</small>${testoChat(m.text, m.from === profile.id, i === tutti.length - 1)}</div>`).join('');
      const el = $('#fchat');
      if (!el) return;
      el.innerHTML = list || '<p class="muted">Scrivi il primo messaggio!</p>';
      el.scrollTop = el.scrollHeight;
    };
    const body = modal(`<h3>💬 ${esc(f.name)}</h3>
      <p class="muted">${Social.isOnline(id) ? '🟢 Online' : '⚪ Offline: riceverà il messaggio solo se siete online insieme'}</p>
      <div class="chat" id="fchat"></div>
      <div class="field-row"><input id="fmsg" type="text" maxlength="200" placeholder="Messaggio...">${bottoneEmote('fmsg', 'fsend')}<button id="fsend" class="btn small gold" type="button">Invia</button></div>
      ${pannelloEmote('fmsg')}
      ${barraFaccine('fmsg')}
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
    for (const el of body.querySelectorAll('.card')) el.onclick = async () => {
      const k = el.dataset.key;
      // il server controlla l'attesa di un'ora e crea la richiesta: il suo codice è l'id del messaggio
      const r = await chiediServer('clan_richiesta', { card: k }, 'Puoi chiedere carte una volta all\'ora', true);
      if (!r) return;
      Social.clanPost({ type: 'request', id: r.out.id, card: k, max: r.out.max, donations: [] });
      closeModal(); renderClan();
      toast('Richiesta mandata al clan');
    };
  }

  async function donate(reqId) {
    const m = profile.clan && profile.clan.chat.find((x) => x.id === reqId);
    if (!m) return;
    const c = profile.cards[m.card];
    if (!c || c.count <= 0 || (m.donations || []).length >= m.max) { toast('Non puoi donare questa carta'); return; }
    // la carta si toglie e le monete si danno sul server, che controlla la richiesta
    const r = await chiediServer('clan_dona', { id: reqId }, 'Non puoi donare questa carta', true);
    if (!r) return;
    m.donations = (m.donations || []).concat([{ id: P.randomId(10), from: profile.id, name: profile.name }]);
    save();
    Social.broadcastClan();
    Sound.play('chest');
    toast(`Grazie! Hai ricevuto 🪙 ${r.out.ricompensa}`);
    render();
  }

  // ---------------------------------------------------------------- sfide tra amici
  let outgoing = null;     // id dell'amico che stiamo sfidando
  let outgoingDuo = null;  // 2 contro 2 online: la difficoltà dei computer scelta da noi (null = sfida 1 contro 1)
  let awaitingStart = null;
  function challenge(id) {
    if (!Social.isOnline(id)) { toast('L\'amico non è online'); return; }
    const f = profile.friends.find((x) => x.id === id);
    outgoing = id;
    outgoingDuo = null;
    Social.send(id, { t: 'invite', name: profile.name });
    modal(`<div class="center"><div style="font-size:3rem">⚔️</div><h3>Sfida mandata</h3><p>Aspettiamo che <b>${esc(f ? f.name : id)}</b> accetti...</p></div>`,
      () => { if (outgoing) { Social.send(outgoing, { t: 'cancel' }); outgoing = null; } });
  }

  // 2 contro 2 online: noi e un amico contro due computer. Prima si sceglie la difficoltà dei computer.
  const LIVELLI_DUO = ['facile', 'medio', 'difficile'];
  function invitaDuo(id) {
    if (occupato || B) return;
    if (!Social.isOnline(id)) { toast('L\'amico non è online'); return; }
    const f = profile.friends.find((x) => x.id === id);
    const body = modal(`<div class="center"><div style="font-size:3rem">🤝</div><h3>2 contro 2 con ${esc(f ? f.name : id)}</h3>
      <p>Voi due in squadra contro due computer. Amichevole: niente coppe né premi, carte tutte al livello 7.</p>
      <div class="row"><button class="btn green" data-lv="facile" type="button">Facile</button><button class="btn" data-lv="medio" type="button">Medio</button><button class="btn red" data-lv="difficile" type="button">Difficile</button></div></div>`);
    for (const b of body.querySelectorAll('[data-lv]')) b.onclick = () => {
      if (!Social.isOnline(id)) { closeModal(); toast('L\'amico non è online'); return; }
      outgoing = id;
      outgoingDuo = b.dataset.lv;
      Social.send(id, { t: 'invite', name: profile.name, duo: outgoingDuo });
      modal(`<div class="center"><div style="font-size:3rem">🤝</div><h3>Invito mandato</h3><p>Aspettiamo che <b>${esc(f ? f.name : id)}</b> accetti...</p></div>`,
        () => { if (outgoing) { Social.send(outgoing, { t: 'cancel' }); outgoing = null; outgoingDuo = null; } });
    };
  }
  // Dalla scheda Eventi: si sceglie con quale amico online fare squadra
  function scegliAmicoDuo() {
    const on = profile.friends.filter((f) => Social.isOnline(f.id));
    if (!on.length) { toast('Nessun amico online: aggiungili nella scheda Clan', 2500); return; }
    const body = modal(`<h3>🤝 Con chi fai squadra?</h3><p>Amici online adesso:</p>
      ${on.map((f) => `<button class="btn full" data-amico="${esc(f.id)}" type="button" style="width:100%;margin-top:6px">${esc(f.name)}</button>`).join('')}`);
    for (const b of body.querySelectorAll('[data-amico]')) b.onclick = () => { closeModal(); invitaDuo(b.dataset.amico); };
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
        // 2 contro 2: l'amico ci chiede di fare squadra contro due computer
        const duo = LIVELLI_DUO.includes(msg.duo);
        const body = modal((duo ? `<div class="center"><div style="font-size:3rem">🤝</div><h3>${esc(name)} ti vuole in squadra!</h3>
          <p>2 contro 2: voi due contro due computer (${esc(msg.duo)}). Amichevole: niente coppe né premi, carte tutte al livello 7.</p>`
          : `<div class="center"><div style="font-size:3rem">⚔️</div><h3>${esc(name)} ti sfida!</h3>
          <p>Sfida amichevole: niente coppe, carte tutte al livello 7.</p>`) + `
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
        if (outgoing === id) { outgoing = null; outgoingDuo = null; closeModal(); toast(msg.t === 'busy' ? name + ' è occupato' : name + ' ha rifiutato'); }
        break;
      case 'accept': {
        if (outgoing !== id || B) return;
        outgoing = null;
        const deck = Array.isArray(msg.deck) && msg.deck.length === 8 && msg.deck.every((k) => D.BY_KEY[k] && D.BY_KEY[k].cost) ? msg.deck : D.START_DECK;
        if (outgoingDuo) { const lv = outgoingDuo; outgoingDuo = null; avviaDuoHost(id, name, deck, lv); break; }
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
        if (msg.duo) {
          // 2 contro 2: noi siamo il giocatore 2, in squadra con chi ci ha invitato (giocatore 0)
          const n = Array.isArray(msg.names) ? msg.names.map((x) => String(x || '').slice(0, 24)) : [];
          startBattle({
            mode: 'duo', role: 'guest', me: 2, friendId: id, arena: msg.arena | 0,
            foeName: (n[1] || '?') + ' e ' + (n[3] || '?'), foeLevel: SetupBattaglia.LIVELLO_AMICI, foeSub: '2 contro 2 · con ' + name,
            compagno: { player: 0, name },
          });
          break;
        }
        startBattle({ mode: 'friend', role: 'guest', me: 1, friendId: id, arena: msg.arena | 0, foeName: name, foeSub: 'Amichevole' });
        break;
      case 'snap':
        if (B && B.cfg.role === 'guest' && B.cfg.friendId === id && msg.s) guestSnap(msg.s);
        break;
      case 'play':
        if (B && B.cfg.role === 'host' && B.cfg.friendId === id && !B.amicoVia && Number.isInteger(msg.slot) && isFinite(msg.x) && isFinite(msg.y)) B.remote.push(msg);
        break;
      case 'emote':
        // nel 2 contro 2 la faccina è del compagno: compare nella nostra metà
        if (B && B.cfg.friendId === id && (EMOTES.includes(msg.e) || PHRASES.includes(msg.e))) bubble(B.cfg.mode === 'duo' ? '#emote-compagno' : '#emote-foe', msg.e);
        break;
      case 'gone':
        if (outgoing === id) { outgoing = null; outgoingDuo = null; closeModal(); }
        if (awaitingStart === id) { awaitingStart = null; closeModal(); }
        if (!B || B.cfg.friendId !== id || B.ended) break;
        if (B.cfg.mode === 'duo' && B.cfg.role === 'host') {
          // 2 contro 2: l'amico se n'è andato, al suo posto gioca un computer e la partita continua
          if (!B.amicoVia) {
            B.amicoVia = true;
            B.remote.length = 0;
            B.cfg.bots.push({ p: 2, bot: Bot.createBot(B.cfg.livello, B.cfg.riservaAmico) });
            toast(name + ' si è scollegato: al suo posto gioca il computer', 3500);
          }
        } else if (B.cfg.mode === 'duo') {
          // siamo l'amico: senza chi fa girare la partita non si può continuare
          exitBattle();
          modal(`<div class="center"><div style="font-size:3rem">📡</div><h3>${esc(name)} si è scollegato</h3><p>La partita 2 contro 2 è finita. Niente coppe perse.</p></div>`);
        } else { toast(name + ' si è disconnesso', 3500); exitBattle(); }
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
  // Da app installata il gioco comincia sotto l'orologio (barra dell'iPhone in tinta unita):
  // se andasse sotto l'orologio, iOS 26 sfocherebbe la parte in alto
  const installed = window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  // da app installata: fascia in tinta unita dietro l'orologio (vedi style.css)
  if (installed) document.documentElement.classList.add('installata');
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
      replay: cfg.replay || null,
      cfg, me: cfg.me, team: E.squadra(cfg.me), state: null, view: null,   // me = giocatore, team = la sua squadra selected: -1, drag: null, gx: null, gy: null,
      mosse: [],   // le carte giocate da noi: [passo, carta, x, y]. Il server le rigioca per controllare il risultato
      acc: 0, last: performance.now(), sendT: 0, remote: [], ended: false, handKey: '',
      remoto: cfg.remoto != null ? cfg.remoto : 1,   // l'amico online: giocatore 1 nell'1 contro 1, 2 nel 2 contro 2
      amicoVia: false,   // 2 contro 2 online: l'amico si è scollegato e al suo posto gioca il computer
      snaps: { prev: null, cur: null, at: 0, prevMap: null }, ruins: 0, doubleShown: false, otShown: false,
      // classificata e torneo: la partita va al ritmo dell'orologio vero (vedi passiVeri)
      tempoVero: cfg.role === 'local' && (cfg.mode === 'ladder' || cfg.mode === 'tour') && !!cfg.bot,
      inizioReale: Date.now(), ultimoOrologio: Date.now(), avvisoRecupero: false,
    };
    if (cfg.role !== 'guest') B.state = E.createMatch(cfg.match);
    $('#home').hidden = true;
    $('#battle').hidden = false;
    $('#foe-name').textContent = cfg.foeName;
    $('#foe-level').textContent = cfg.foeLevel || 7;
    $('#foe-sub').textContent = cfg.foeSub || '';
    $('#emote-bar').hidden = true;
    $('#end-vs').hidden = true;
    $('#btn-emote').style.visibility = cfg.mode === 'replay' ? 'hidden' : 'visible';   // le faccine ci sono in tutte le battaglie, come in Clash
    if (cfg.mode === 'replay') barraReplica();
    $('#crown-side').hidden = true;
    $('#crown-banner').hidden = true;
    $('#x2').hidden = true;
    $('#field').classList.remove('caldo', 'morte');
    $('#avviso-compagno').hidden = true;
    R.setArena(cfg.arena || 0);
    R.setFlip(E.squadra(cfg.me) === 1);
    fitCanvas();
    banner('⚔️ Battaglia!');
    requestAnimationFrame(loop);
  }

  function exitBattle() {
    B = null;
    const rb = $('#replica-bar'); if (rb) rb.remove();
    chiudiGuida();
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
    // 2 contro 2: se nella mano del compagno è cambiata una carta, l'ha appena giocata
    const c = B.cfg.compagno;
    if (c && S.prev && S.prev.players[c.player] && S.cur.players[c.player]) {
      const prima = S.prev.players[c.player].hand, ora = S.cur.players[c.player].hand;
      for (let i = 0; i < prima.length; i++) if (prima[i] !== ora[i]) avvisoCompagno(prima[i]);
    }
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
    const mossa = MOSSE[e];
    if (FACCE[e]) Sound.play('emo_' + FACCE[e]);   // il Re parla: ride, piange, russa...
    if (mossa && Sprites.has('basileus')) {
      const lui = sel === '#emote-foe';
      el.innerHTML = `<span class="emo-zeus ${mossa}"><img src="${reFaccia(e, lui ? 1 : 0)}" alt="${e}" draggable="false"></span>`;
      el.classList.add('animata');
    } else { el.textContent = e; el.classList.remove('animata'); }
    el.hidden = false;
    clearTimeout(bubbleTimers[sel]);
    bubbleTimers[sel] = setTimeout(() => { el.hidden = true; }, 2200);
  }

  // Contro il computer, a volte risponde anche lui con una faccina animata.
  // Solo per divertimento: usa Math.random (non il seme della partita), quindi non cambia la battaglia.
  function rispostaComputer() {
    if (Math.random() < 0.4) return;
    const facce = Object.keys(MOSSE), e = facce[Math.floor(Math.random() * facce.length)];
    const battaglia = B;
    setTimeout(() => { if (B && B === battaglia && !B.ended) bubble('#emote-foe', e); }, 700 + Math.random() * 900);
  }

  // posizioni prima del passo: servono per disegnare i movimenti in modo continuo
  const posizioni = (s) => new Map(s.ents.map((e) => [e.id, { x: e.x, y: e.y }]));
  // Battaglie classificate e torneo: il tempo della partita segue l'orologio vero, anche se l'app
  // è finita in background (telefonata, altra app). Al ritorno si fanno i passi mancanti, con il computer
  // che continua a giocare, a blocchi di 20 secondi di partita per fotogramma (così la pagina non si blocca).
  // L'ordine è lo stesso del rigioco del server: mosse del giocatore → computer → passo.
  const PASSI_PER_BLOCCO = 400;
  // Si usa Date.now (l'orologio vero, che va avanti anche se il telefono si addormenta);
  // se l'orologio torna indietro (cambio d'ora a mano) si sposta l'inizio, così la partita non si blocca.
  function passiVeri() {
    const adesso = Date.now();
    if (adesso < B.ultimoOrologio) B.inizioReale -= B.ultimoOrologio - adesso;
    B.ultimoOrologio = adesso;
    const trascorsi = adesso - B.inizioReale;
    const dovuti = Rigioco.passiDovuti(trascorsi) - B.state.n;
    if (dovuti > 40 && !B.avvisoRecupero && !B.state.over) {
      B.avvisoRecupero = true;
      toast('Mentre eri via la partita è andata avanti', 2500);
    }
    const quanti = Math.min(dovuti, PASSI_PER_BLOCCO);
    if (quanti > 0) {
      if (quanti > 1) Rigioco.avanza(B.state, B.cfg.bot, quanti - 1);
      B.prevPos = posizioni(B.state);
      Rigioco.avanza(B.state, B.cfg.bot, 1);
    }
    if (dovuti <= PASSI_PER_BLOCCO) B.avvisoRecupero = false;
    // a che punto siamo tra il passo precedente e quello attuale (0..1)
    return trascorsi / (E.TICK * 1000) - B.state.n;
  }

  function loop(now) {
    if (!B) return;
    const dt = Math.min(0.25, (now - B.last) / 1000);
    B.last = now;
    if (B.cfg.role !== 'guest' && B.tempoVero) {
      B.view = smoothView(B.state, B.prevPos, passiVeri());
    } else if (B.cfg.role !== 'guest') {
      B.acc += dt * (B.replay ? B.replay.vel : 1);
      while (B.acc >= E.TICK) {
        B.acc -= E.TICK;
        B.prevPos = posizioni(B.state);
        // replica: prima le mosse del giocatore di quel passo, poi il computer, poi il passo (come il server)
        if (B.replay) {
          const r = B.replay;
          while (r.i < r.mosse.length && r.mosse[r.i][0] === B.state.n) { const m = r.mosse[r.i++]; E.play(B.state, 0, m[1], m[2], m[3]); }
        }
        // computer (nel 2 contro 2 anche gli altri tre), poi le giocate dell'amico online, poi il passo
        const giocate = Rigioco.passo(B.state, { bot: B.cfg.bot, bots: B.cfg.bots, remote: B.remote.splice(0), remoto: B.remoto });
        if (B.cfg.compagno) for (const g of giocate) if (g.p === B.cfg.compagno.player) avvisoCompagno(g.key);
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
      R.draw(v, { me: B.me, dragKey, gx: B.gx, gy: B.gy, level: lv, amb: pl.amb, name: dragKey ? D.BY_KEY[dragKey].name : '', compagno: B.cfg.compagno || null });
      hud(v);
      if (v.over && !B.ended) {
        B.ended = true;
        // partita finita: via il pannello delle faccine e il suo bottone
        $('#emote-bar').hidden = true; iconaEmote(); $('#btn-emote').style.visibility = 'hidden';
        showVs(v); setTimeout(() => endBattle(v), 2600);
      }
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
      const lampo = $('#field-lampo');   // lampo bianco su tutto il campo
      lampo.classList.remove('via'); void lampo.offsetWidth; lampo.classList.add('via');
      showCrownSide();
      // corone e templi sono della squadra (con due giocatori squadra = giocatore)
      const foeScored = fresh.some((r) => r.owner === B.team);
      crownBanner(foeScored, v.crowns[foeScored ? 1 - B.team : B.team]);
      for (const r of fresh) crownFly(r, r.owner === B.team ? '#foe-crowns' : '#my-crowns');
    }
    if (!B.doubleShown && !v.inOvertime && v.t >= v.duration - 60) {
      B.doubleShown = true;
      bigBanner('<b>60</b><span>secondi<br>Ambrosia ×2</span>');
      $('#field').classList.add('caldo');   // luce calda sul campo fino alla fine
      Sound.play('ultimo');
    }
    if (!B.otShown && v.inOvertime) {
      B.otShown = true;
      bigBanner('<b>⚡</b><span>Morte<br>improvvisa</span>');
      setTimeout(() => { if (B) banner('Chi abbatte un tempio vince!'); }, 2300);
      $('#field').classList.add('morte');
      Sound.play('ultimo');
    }
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
    el.innerHTML = `<div class="vs-row foe">${row(v.crowns[1 - B.team], 'red')}</div><b>VS</b><div class="vs-row me">${row(v.crowns[B.team], 'blue')}</div>`;
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
    $('#foe-crowns').textContent = v.crowns[1 - B.team];
    $('#my-crowns').textContent = v.crowns[B.team];
    $('#amb-num').dataset.n = Math.floor(pl.amb);
    $('#amb-fill').style.width = (pl.amb / E.AMB_MAX) * 100 + '%';
    const key = pl.hand.join() + '|' + pl.queue[0];
    if (key !== B.handKey) {
      const prima = B.handKey ? B.handKey.split('|')[0].split(',') : null;
      B.handKey = key;
      B.povera = [];
      $('#hand').innerHTML = pl.hand.map((k, i) => {
        const d = D.BY_KEY[k];
        const arriva = prima && prima[i] !== k ? 'arriva' : '';   // la carta appena pescata vola dal mazzetto
        return `<div class="card ${i === B.selected ? 'sel' : ''} ${arriva}" data-slot="${i}" style="--rc:${D.RARITY[d.rarity].color}">
          <span class="cost"><span>${d.cost}</span></span><span class="em">${art(k)}</span><span class="nm">${esc(d.name)}</span><span class="wait"></span></div>`;
      }).join('');
      const nx = D.BY_KEY[pl.queue[0]];
      $('#next-card').innerHTML = nx ? art(pl.queue[0]) : '';
    }
    document.querySelectorAll('#hand .card').forEach((el, i) => {
      const cost = D.BY_KEY[pl.hand[i]].cost, povera = pl.amb < cost;
      if (B.povera[i] && !povera) { el.classList.remove('pronta'); void el.offsetWidth; el.classList.add('pronta'); }
      B.povera[i] = povera;
      el.classList.toggle('poor', povera);
      el.classList.toggle('sel', i === B.selected);
      el.classList.toggle('fuori', i === B.selected && !!B.drag && B.gx != null);
      el.querySelector('.wait').style.height = pl.amb < cost ? (1 - pl.amb / cost) * 100 + '%' : '0';
    });
  }

  // --- tocco e trascinamento delle carte
  function overCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }
  function tryPlay(slot, x, y) {
    if (B && B.replay) return false;
    const v = B && B.view;
    if (!v || v.over || slot < 0) return false;
    const key = v.players[B.me].hand[slot];
    const d = D.BY_KEY[key];
    if (v.players[B.me].amb < d.cost) { Sound.play('no'); toast('💧 Ambrosia insufficiente', 1200); return false; }
    if (!E.canPlace(v, B.me, key, x, y)) { Sound.play('no'); toast('Non puoi metterla qui: solo nella tua metà', 1500); return false; }
    if (B.cfg.role === 'guest') Social.send(B.cfg.friendId, { t: 'play', slot, x, y });
    else if (!E.play(B.state, B.me, slot, x, y)) return false;
    // si registra la mossa con il numero del passo in cui è stata giocata (E.play non lo cambia)
    else if (B.cfg.role === 'local') B.mosse.push([B.state.n, slot, x, y]);
    Sound.play(d.type === 'spell' ? 'spell' : 'play');
    segnaStatistica((st) => { st.carte[key] = (st.carte[key] || 0) + 1; });
    eventoGuida('carta');
    B.selected = -1; B.gx = null;
    return true;
  }
  $('#hand').addEventListener('pointerdown', (e) => {
    const c = e.target.closest('.card');
    if (!c || !B || B.replay) return;
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
    if (B.selected >= 0 && overCanvas(e) && !sopraComandi(e)) { const g = R.toGame(e.clientX, e.clientY); B.gx = g.x; B.gy = g.y; }
    else if (B.drag) B.gx = null;
  });
  // un tocco sopra il pannello delle faccine o su un bottone non deve mettere la carta sul campo sotto
  const sopraComandi = (e) => !!document.elementFromPoint(e.clientX, e.clientY)?.closest('#emote-bar, #btn-emote, button');
  window.addEventListener('pointerup', (e) => {
    if (!B) return;
    if (sopraComandi(e)) { if (B.drag && e.pointerId === B.drag.id) B.drag = null; B.gx = null; return; }
    if (B.drag && e.pointerId === B.drag.id) {
      const moved = B.drag.moved;
      B.drag = null;
      if (moved) {
        // se non si può mettere lì, la carta torna in mano (come in Clash) invece di restare appesa sul campo
        const g = overCanvas(e) ? R.toGame(e.clientX, e.clientY) : null;
        if (!g || !tryPlay(B.selected, g.x, g.y)) { B.selected = -1; B.gx = null; }
      }
      return;
    }
    if (B.selected >= 0 && overCanvas(e)) {
      const g = R.toGame(e.clientX, e.clientY);
      if (!tryPlay(B.selected, g.x, g.y)) B.gx = null;   // resta scelta, ma l'anteprima sparisce
    }
  });
  window.addEventListener('pointercancel', () => { if (B) { B.drag = null; B.gx = null; } });

  // Pannello delle emoticon e delle frasi (al posto delle carte, come in Clash)
  // in battaglia il bottone resta 💬 (con la faccia del Re sembrava la prossima carta); le facce del Re sono nel pannello
  const iconaEmote = () => { $('#btn-emote').textContent = '💬'; };
  iconaEmote();
  $('#btn-emote').onclick = () => {
    if (!B || B.replay || B.ended) return;   // niente faccine a partita finita o nella replica
    const bar = $('#emote-bar');
    if (!bar.hidden) { bar.hidden = true; iconaEmote(); return; }
    if (B) { B.selected = -1; B.gx = null; }   // aprendo le faccine la carta scelta torna in mano
    bar.innerHTML = `<div class="emo-row">${EMOTES.map((x) => `<button type="button" class="emo" data-e="${x}" aria-label="${x}"><img src="${rePrimoPiano(x)}" alt="" draggable="false"></button>`).join('')}</div>
      <div class="ph-row">${PHRASES.map((x) => `<button type="button" class="ph">${x}</button>`).join('')}</div>`;
    bar.hidden = false;
    $('#btn-emote').textContent = '✕';
    for (const b of bar.querySelectorAll('button')) b.onclick = () => {
      bar.hidden = true;
      iconaEmote();
      const e = b.dataset.e || b.textContent;
      bubble('#emote-me', e);
      if (B && B.cfg.friendId && !B.amicoVia) Social.send(B.cfg.friendId, { t: 'emote', e });
      else if (B) rispostaComputer();
    };
  };

  // Manda il risultato al server (con tutte le mosse). Qualche tentativo in più se la rete balbetta.
  // Restituisce { esito } se il server ha accettato, altrimenti { errore }.
  // Se un tentativo è andato storto (500, tempo scaduto) ma il server l'aveva già eseguito, il tentativo dopo
  // riceve "non_permesso": allora si guarda il profilo e, se coppe/vittorie sono cambiate, la partita è registrata
  // (risposta { registrata: true }, senza il dettaglio dei premi).
  const impronta = () => JSON.stringify([profile.trophies, profile.wins, profile.losses, profile.draws, profile.tour]);
  async function mandaFineBattaglia(cfg, mosse) {
    const prima = impronta();
    let errore = 'offline';
    for (let i = 0; i < 3; i++) {
      try {
        const r = await Server.chiedi('battaglia_fine', { id: cfg.battagliaId, mosse });
        accetta(r);
        return { out: r.out };
      } catch (e) {
        errore = (e && e.message) || 'errore_server';
        if (errore === 'non_permesso' && i > 0) {
          try {
            accetta(await Server.chiedi('profilo', {}));
            if (impronta() !== prima) return { registrata: true };
          } catch (e2) { /* senza rete: resta il rifiuto */ }
        }
        if (errore !== 'offline' && errore !== 'errore_server') break;   // il server ha risposto: inutile riprovare
        await pausa(1500);
      }
    }
    return { errore };
  }

  async function endBattle(v) {
    if (!B) return;
    const me = B.team, cfg = B.cfg;   // il risultato è della squadra (con due giocatori squadra = giocatore)
    if (cfg.mode === 'replay') { fineReplica(v); return; }
    let res = v.winner === -1 ? 'draw' : v.winner === me ? 'win' : 'lose';
    let mine = v.crowns[me], foe = v.crowns[1 - me];
    let extra = '';
    // Scalata e torneo: il risultato che conta è quello del server, che rigioca la partita
    let esito = null;
    if (cfg.mode === 'ladder' || cfg.mode === 'tour') {
      if (cfg.offline) {
        extra += `<p class="center muted">${senzaServer()}: questa partita non dà premi.</p>`;
      } else {
        modal('<div class="center"><div style="font-size:3rem">⚖️</div><h3>Controllo il risultato...</h3></div>');
        const r = await mandaFineBattaglia(cfg, B.mosse);
        if (r.out) {
          esito = r.out.esito;
          res = r.out.winner === -1 ? 'draw' : r.out.winner === me ? 'win' : 'lose';
          mine = r.out.crowns[me]; foe = r.out.crowns[1 - me];
        } else if (r.registrata) {
          extra += '<p class="center muted">Il server ha registrato la partita: coppe e premi sono già nel tuo profilo.</p>';
        } else if (r.errore === 'offline' || r.errore === 'errore_server' || r.errore === 'riprova' || r.errore === 'non_collegato') {
          extra += '<p class="center muted">Non sono riuscito a mandare il risultato al server: questa partita non dà premi.</p>';
        } else {
          extra += '<p class="center muted">Il server non ha accettato il risultato di questa partita: nessun premio.</p>';
        }
      }
    }
    if (esito && cfg.mode === 'ladder') {
      const out = esito;
      extra += `<p class="center res-premi" style="font-size:1.3rem">🏆 <b>${out.trophies >= 0 ? '+' : ''}${out.trophies}</b>${out.gold ? ` &nbsp; 🪙 <b>+${out.gold}</b>` : ''}</p>`;
      if (out.chest) extra += `<div class="res-baule"><div class="center">${chestArt(out.chest, 'chest-big')}</div><p class="center">Hai vinto un <b>${D.CHESTS[out.chest].name}</b>!</p></div>`;
      if (out.chestsFull) extra += '<p class="center muted">Spazi per i bauli pieni: aprine qualcuno!</p>';
      if (out.newArena != null) {
        const a = D.ARENAS[out.newArena];
        extra += `<div class="box center"><div style="font-size:3rem">${a.icon}</div><b>Nuova arena: ${esc(a.name)}!</b>
          <p>Carte sbloccate: ${out.newCards.map((k) => esc(D.BY_KEY[k].name)).join(', ')}</p></div>`;
      }
    } else if (esito && cfg.mode === 'tour') {
      const t = esito;
      extra += `<div class="tour-mini">${tourTrack(t)}</div><p class="center">Vittorie <b>${t.wins}</b>/${P.TOUR_MAX_WINS} · Sconfitte <b>${t.losses}</b>/${P.TOUR_MAX_LOSSES}</p>`;
      if (t.done) extra += '<p class="center"><b>Torneo finito!</b> Ritira i premi nella scheda Eventi.</p>';
    } else if (cfg.mode === 'friend') {
      const f = profile.friends.find((x) => x.id === cfg.friendId);
      if (f) { if (res === 'win') f.wins = (f.wins || 0) + 1; else if (res === 'lose') f.losses = (f.losses || 0) + 1; }
      extra += '<p class="center muted">Sfida amichevole: niente coppe in gioco.</p>';
    } else if (cfg.mode === 'train') extra += '<p class="center muted">Allenamento: niente coppe in gioco.</p>';
    else if (cfg.mode === 'duo') extra += '<p class="center muted">2 contro 2 amichevole: niente coppe in gioco.</p>';
    save();
    const rep = cfg.replica ? salvaReplica(cfg, B.mosse, res, mine, foe) : null;
    if (res === 'win' && mine === 3) segnaStatistica((st) => { st.tre++; });
    Sound.play(res === 'win' ? 'win' : 'lose');
    const title = res === 'win' ? 'Vittoria!' : res === 'lose' ? 'Sconfitta' : 'Pareggio';
    // tre posti per le corone di ognuno: quelle vinte arrivano una alla volta
    const corone = (n, ritardo) => [0, 1, 2].map((i) =>
      `<span class="corona ${i < n ? 'on' : ''}" style="--d:${(ritardo + i * 0.35).toFixed(2)}s">👑</span>`).join('');
    const body = modal(`<div class="res-nastro ${res}"><span>${title}</span></div>
      <div class="res-riga tu"><b>${esc(profile.name)}${cfg.compagno ? ' e ' + esc(cfg.compagno.name) : ''}</b><div class="res-corone">${corone(mine, 0.4)}</div></div>
      <div class="res-riga lui"><b>${esc(cfg.foeName || 'Avversario')}</b><div class="res-corone">${corone(foe, 0.4 + mine * 0.35)}</div></div>
      ${extra}<div class="row res-bottoni">${rep ? '<button id="rivedi" class="btn" type="button">▶ Rivedi</button>' : ''}<button id="ok" class="btn gold" type="button">Continua</button></div>`, () => exitBattle());
    body.querySelector('#ok').onclick = closeModal;
    if (rep) body.querySelector('#rivedi').onclick = () => { closeModal(); setTimeout(() => guardaReplica(rep), 50); };
  }

  // ---------------------------------------------------------------- rivedi la battaglia
  // Si tengono le ultime 10 battaglie contro il computer, solo su questo telefono. Ognuna è un "copione":
  // impostazioni della partita + le carte giocate da noi. Rigiocandolo esce identica, computer compreso.
  const MAX_REPLICHE = 10;
  function repliche() {
    try { const l = JSON.parse(Archivio.get('guerra-repliche')); return Array.isArray(l) ? l : []; } catch (e) { return []; }
  }
  function salvaReplica(cfg, mosse, res, mine, foe) {
    const rep = { at: Date.now(), mode: cfg.mode, arena: cfg.arena, foeName: cfg.foeName, foeLevel: cfg.foeLevel, res, mine, foe, setup: cfg.replica, mosse: mosse.slice() };
    const l = repliche(); l.unshift(rep);
    Archivio.set('guerra-repliche', JSON.stringify(l.slice(0, MAX_REPLICHE)));
    return rep;
  }
  function guardaReplica(rep) {
    if (B) return;
    startBattle({
      mode: 'replay', me: 0, role: 'local', arena: rep.arena, foeName: rep.foeName, foeLevel: rep.foeLevel, foeSub: '📼 Replica',
      // 1 contro 1: un computer; 2 contro 2: i tre computer con i loro semi
      bot: rep.setup.duo ? null : Bot.createBot(rep.setup.level, rep.setup.botSeed),
      bots: rep.setup.duo ? [1, 2, 3].map((p) => ({ p, bot: Bot.createBot(rep.setup.level, rep.setup.botSeeds[p]) })) : undefined,
      compagno: rep.setup.duo ? rep.setup.compagno : undefined,
      match: JSON.parse(JSON.stringify(rep.setup.match)),
      replay: { mosse: rep.mosse, i: 0, vel: 1 }, rep,
    });
  }
  function barraReplica() {
    const el = document.createElement('div');
    el.id = 'replica-bar'; el.className = 'replica-bar';
    el.innerHTML = '<span>📼 Replica</span><button type="button" class="btn small" data-vel>Velocità ×1</button><button type="button" class="btn small red" data-esci>Esci</button>';
    el.querySelector('[data-vel]').onclick = (e) => {
      if (!B || !B.replay) return;
      B.replay.vel = B.replay.vel === 1 ? 2 : B.replay.vel === 2 ? 4 : 1;
      e.currentTarget.textContent = 'Velocità ×' + B.replay.vel;
    };
    el.querySelector('[data-esci]').onclick = () => exitBattle();
    $('#battle').appendChild(el);
  }
  function fineReplica(v) {
    const rep = B.cfg.rep;
    const body = modal(`<div class="center"><div style="font-size:3rem">📼</div><h3>Fine della replica</h3>
      <p>${v.winner === 0 ? 'Vittoria' : v.winner === 1 ? 'Sconfitta' : 'Pareggio'} · 👑 ${v.crowns[0]} - ${v.crowns[1]}</p>
      <div class="row"><button id="r-ancora" class="btn" type="button">↺ Rivedi</button><button id="r-ok" class="btn gold" type="button">Chiudi</button></div></div>`, () => exitBattle());
    body.querySelector('#r-ok').onclick = closeModal;
    body.querySelector('#r-ancora').onclick = () => { closeModal(); setTimeout(() => guardaReplica(rep), 50); };
  }
  function elencoRepliche() {
    const l = repliche();
    const modo = { ladder: 'Scalata', tour: 'Torneo', train: 'Allenamento', duo: '2 contro 2' };
    const righe = l.map((r, i) => `<button type="button" class="replica-riga ${r.res}" data-rep="${i}">
        <span class="rr-esito">${r.res === 'win' ? 'Vinta' : r.res === 'lose' ? 'Persa' : 'Pari'}</span>
        <span class="rr-chi"><b>contro ${esc(r.foeName || '?')}</b><small>${modo[r.mode] || ''} · ${new Date(r.at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></span>
        <span class="rr-corone">👑 ${r.mine | 0}-${r.foe | 0}</span><span class="rr-play">▶</span></button>`).join('');
    const body = modal(`<h3>📼 Le ultime battaglie</h3>
      ${righe || '<p class="muted">Ancora nessuna battaglia da rivedere: gioca contro il computer e la trovi qui.</p>'}
      <p class="muted" style="font-size:.8rem">Restano solo su questo telefono (le ultime ${MAX_REPLICHE}).</p>`);
    for (const b of body.querySelectorAll('[data-rep]')) b.onclick = () => { const r = l[+b.dataset.rep]; closeModal(); setTimeout(() => guardaReplica(r), 50); };
  }

  // ---------------------------------------------------------------- profilo e impostazioni
  // Statistiche in più per il profilo (carta più giocata, vittorie con 3 corone): restano su questo telefono
  function statistiche() {
    try { return JSON.parse(Archivio.get('guerra-statistiche')) || { carte: {}, tre: 0 }; } catch (e) { return { carte: {}, tre: 0 }; }
  }
  function segnaStatistica(cambia) {
    const st = statistiche();
    cambia(st);
    Archivio.set('guerra-statistiche', JSON.stringify(st));
  }

  $('#btn-profile').onclick = () => {
    const found = Object.keys(profile.cards).length;
    const st = statistiche();
    const preferita = Object.entries(st.carte).sort((a, b) => b[1] - a[1])[0];
    let migliore = 0;
    D.ARENAS.forEach((a, i) => { if ((profile.best || 0) >= a.trophies) migliore = i; });
    const body = modal(`<h3>👤 Il tuo profilo</h3>
      <div class="field-row"><input id="pname" type="text" maxlength="16" value="${esc(profile.name)}"><button id="psave" class="btn small gold" type="button">Salva</button></div>
      <div class="stats">
        <div>Coppe<b>🏆 ${profile.trophies}</b></div><div>Record<b>🏆 ${profile.best}</b></div>
        <div>Vittorie<b>${profile.wins}</b></div><div>Sconfitte<b>${profile.losses}</b></div>
        <div>Carte trovate<b>${found}/${D.CARDS.length}</b></div><div>Codice amico<b>${profile.id}</b></div>
        <div>Vittorie con 3 corone<b>👑 ${st.tre}</b></div><div>Miglior arena<b>${D.ARENAS[migliore].icon} ${esc(D.ARENAS[migliore].name)}</b></div>
      </div>
      <button id="p-repliche" class="btn full" type="button" style="width:100%;margin-top:10px">📼 Rivedi le ultime battaglie</button>
      ${preferita && D.BY_KEY[preferita[0]] ? `<div class="preferita">${cardHtml(preferita[0], { level: false })}<div><small>Carta preferita</small><b>${esc(D.BY_KEY[preferita[0]].name)}</b><small>giocata ${preferita[1]} volte</small></div></div>` : ''}`);
    body.querySelector('#p-repliche').onclick = elencoRepliche;
    body.querySelector('#psave').onclick = () => {
      const n = body.querySelector('#pname').value.trim().slice(0, 16);
      if (n.length < 2) { toast('Almeno 2 lettere'); return; }
      profile.name = n; save(); closeModal(); render(); toast('Nome salvato');
    };
  };

  // Musica di sottofondo: la scelta resta solo su questo telefono. Parte al primo tocco (i browser lo vogliono così).
  let musicaScelta = null;
  function musicaAccesa() {
    if (musicaScelta == null) { try { musicaScelta = Archivio.get('guerra-musica') !== '0'; } catch (e) { musicaScelta = true; } }
    return musicaScelta;
  }
  document.addEventListener('pointerdown', () => { if (musicaAccesa()) Sound.music(true); }, { once: true });

  $('#btn-settings').onclick = () => {
    const body = modal(`<h3>⚙️ Impostazioni</h3>
      <button id="acct" class="btn full gold" type="button" style="width:100%">👤 Account</button>
      <button id="snd" class="btn full ${profile.sound ? 'green' : 'grey'}" type="button" style="width:100%">${profile.sound ? '🔊 Suoni attivi' : '🔇 Suoni spenti'}</button>
      <button id="mus" class="btn full ${musicaAccesa() ? 'green' : 'grey'}" type="button" style="width:100%">${musicaAccesa() ? '🎵 Musica accesa' : '🎵 Musica spenta'}</button>
      ${window.Push && Push.disponibile() ? '<button id="avv" class="btn full grey" type="button" style="width:100%">🔕 Avvisami quando un baule è pronto</button>' : ''}
      <button id="howto" class="btn full" type="button" style="width:100%">📖 Come si gioca</button>
      <button id="legal" class="btn full grey" type="button" style="width:100%">🔒 Privacy e diritti</button>
      <p class="muted">© 2026 ${COPYRIGHT}. Tutti i diritti riservati.</p>`);
    body.querySelector('#snd').onclick = () => { profile.sound = !profile.sound; Sound.setOn(profile.sound); save(); $('#btn-settings').click(); };
    body.querySelector('#mus').onclick = () => {
      const v = !musicaAccesa();
      Archivio.set('guerra-musica', v ? '1' : '0');
      musicaScelta = v; Sound.music(v); $('#btn-settings').click();
    };
    if (body.querySelector('#avv')) pulsanteAvvisi(body.querySelector('#avv'));
    body.querySelector('#howto').onclick = howTo;
    body.querySelector('#acct').onclick = account;
    body.querySelector('#legal').onclick = legal;
  };

  // ---------------------------------------------------------------- avvisi sul telefono (push.js)
  // Il pulsante in Impostazioni: verde = avvisi accesi su questo telefono.
  async function pulsanteAvvisi(btn) {
    if (Push.serveInstallare()) {
      btn.textContent = '🔔 Avvisi dei bauli: prima installa il gioco';
      btn.onclick = () => modal(`<h3>🔔 Avvisi su iPhone e iPad</h3>
        <p>Su iPhone e iPad gli avvisi arrivano solo se il gioco è <b>installato sulla schermata Home</b> (iOS 16.4 o più nuovo).</p>
        <p>1. In Safari tocca <b>Condividi</b> (il quadrato con la freccia)<br>2. Scegli <b>Aggiungi alla schermata Home</b><br>
        3. Apri il gioco dall'icona e torna qui in ⚙️ Impostazioni</p>`);
      return;
    }
    if (!Push.supportato()) { btn.textContent = '🔕 Avvisi non disponibili su questo browser'; btn.disabled = true; return; }
    let acceso = false;
    const mostra = (on) => {
      acceso = on;
      btn.className = 'btn full ' + (on ? 'green' : 'grey');
      btn.textContent = on ? '🔔 Avvisi dei bauli accesi' : '🔕 Avvisami quando un baule è pronto';
    };
    btn.onclick = async () => {
      if (btn.disabled) return;
      btn.disabled = true;
      try {
        // Niente attese prima di chiedere il permesso: Safari lo vuole subito dopo il tocco
        if (acceso) { await spegniAvvisi(); mostra(false); toast('Avvisi spenti su questo telefono'); }
        else if (await accendiAvvisi()) { mostra(true); toast('Fatto! Ti avviso quando un baule è pronto', 3000); }
      } finally { btn.disabled = false; }
    };
    mostra(await Push.acceso());
  }
  // Chiede il permesso, si iscrive e lo dice al server. Restituisce true se è andata.
  async function accendiAvvisi() {
    let iscrizione;
    try { iscrizione = await Push.accendi(); } catch (e) {
      const m = e && e.message;
      if (m === 'negato') toast('Hai bloccato gli avvisi: riattivali nelle impostazioni del telefono per questo gioco', 4500);
      else if (m !== 'annullato') toast('Non riesco ad attivare gli avvisi su questo telefono', 3500);
      return false;
    }
    if (await chiediServer('avvisi_iscrivi', { iscrizione })) return true;
    try { await Push.spegni(); } catch (e) { /* già tolta */ }   // il server non l'ha salvata: si torna a "spento"
    return false;
  }
  async function spegniAvvisi() {
    let endpoint = null;
    try { endpoint = await Push.spegni(); } catch (e) { /* già tolta */ }
    if (endpoint) await chiediServer('avvisi_togli', { endpoint });
  }
  // All'avvio e quando cambia account: se gli avvisi sono accesi, il server riceve di nuovo l'iscrizione,
  // così resta legata all'account giusto (e si aggiorna se il browser l'ha cambiata).
  async function rinnovaAvvisi() {
    if (!window.Push) return;
    try {
      if (!(await Push.acceso())) return;
      const sub = await Push.iscrizione();
      if (sub) accetta(await Server.chiedi('avvisi_iscrivi', { iscrizione: sub.toJSON() }));
    } catch (e) { /* senza rete si riprova la prossima volta */ }
  }

  // ---------------------------------------------------------------- account (Supabase)
  let pendingLogin = false;
  function account() {
    const me = window.Cloud && Cloud.info();
    if (!me) {
      modal(`<h3>👤 Account</h3><p>Non riesco a collegarmi al server degli account. Controlla la connessione a internet e riprova.</p>`);
      return;
    }
    if (!me.guest) {
      const body = modal(`<h3>👤 Account</h3>
        <p>Sei collegato come <b>${esc(me.email)}</b> ${me.confirmed ? '✅' : '<br><span class="muted">⏳ Email da confermare: apri il link che ti abbiamo mandato (guarda anche nello spam).</span>'}</p>
        <p>I tuoi progressi sono salvati online: su un altro telefono basta fare "Accedi" con la stessa email.</p>
        <button id="out" class="btn full grey" type="button" style="width:100%">Esci dall'account</button>
        <button id="del" class="btn full red" type="button" style="width:100%">Elimina account</button>`);
      body.querySelector('#out').onclick = async () => {
        await Cloud.logout();
        // i progressi restano nell'account; su questo telefono si riparte da capo finché non rientri
        profile = P.fresh(); aggiornaInviati = {}; P.save(profile, store); Social.restart(); closeModal(); render(); toast('Sei uscito: i tuoi progressi restano nell\'account');
      };
      body.querySelector('#del').onclick = () => {
        const b2 = modal(`<h3>Eliminare l'account?</h3><p>Verranno cancellati per sempre l'account e i progressi salvati online. Non si può annullare.</p>
          <div class="row"><button id="no" class="btn grey" type="button">Annulla</button><button id="yes" class="btn red" type="button">Elimina</button></div>`);
        b2.querySelector('#no').onclick = account;
        b2.querySelector('#yes').onclick = async () => {
          const err = await Cloud.remove();
          if (err) { toast(err, 3500); return; }
          profile = P.fresh(); aggiornaInviati = {}; P.save(profile, store); Social.restart(); closeModal(); render(); toast('Account eliminato');
        };
      };
      return;
    }
    const body = modal(`<h3>👤 Account</h3>
      <p>Stai giocando come <b>ospite</b>: i progressi sono salvati online, ma li ritrova solo questo telefono.
      Crea un account per non perderli e per giocare anche da un altro dispositivo.</p>
      <div class="acct-form">
        <input id="em" type="email" autocomplete="email" placeholder="Email" maxlength="120">
        <input id="pw" type="password" autocomplete="new-password" placeholder="Password (almeno 8 caratteri)" maxlength="72">
        <button id="reg" class="btn full gold" type="button" style="width:100%">Crea account</button>
        <button id="log" class="btn full" type="button" style="width:100%">Ho già un account: accedi</button>
      </div>
      <button id="ggl" class="btn full google" type="button" style="width:100%"><span class="g-logo">G</span> Continua con Google</button>
      <p class="muted">Usiamo l'email solo per l'accesso e per recuperare l'account. Niente pubblicità.</p>`);
    const val = () => ({ email: body.querySelector('#em').value.trim(), password: body.querySelector('#pw').value });
    const okForm = ({ email, password }) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Email non valida'); return false; }
      if (password.length < 8) { toast('Password troppo corta: almeno 8 caratteri'); return false; }
      return true;
    };
    body.querySelector('#reg').onclick = async () => {
      const v = val();
      if (!okForm(v)) return;
      const err = await Cloud.register(v.email, v.password);
      if (err) { toast(err, 4000); return; }
      modal(`<h3>📧 Controlla la posta</h3><p>Ti abbiamo mandato un'email a <b>${esc(v.email)}</b>. Apri il link per confermare l'account
        (se non la trovi guarda nello spam). Intanto puoi continuare a giocare.</p>`);
    };
    body.querySelector('#ggl').onclick = () => {
      const b2 = modal(`<h3>Continuare con Google?</h3><p>Se con questo account Google hai <b>già giocato</b> a Guerra degli Dèi,
        vedrai i progressi dell'account al posto di quelli di adesso (🏆 ${profile.trophies}).</p>
        <p>Se è la <b>prima volta</b>, i progressi di adesso passano all'account Google. Serve internet.</p>
        <div class="row"><button id="no" class="btn grey" type="button">Annulla</button><button id="yes" class="btn gold" type="button">Continua</button></div>`);
      b2.querySelector('#no').onclick = account;
      b2.querySelector('#yes').onclick = async () => {
        const err = await Cloud.loginGoogle();
        if (err) { toast(err, 4000); account(); }
      };
    };
    body.querySelector('#log').onclick = () => {
      const v = val();
      if (!okForm(v)) return;
      const b2 = modal(`<h3>Accedere all'account?</h3><p>Se in questo account hai <b>già giocato</b> a Guerra degli Dèi,
        vedrai i suoi progressi al posto di quelli di adesso (🏆 ${profile.trophies}).</p>
        <p>Se non ci hai <b>mai giocato</b>, i progressi di adesso passano all'account.</p>
        <div class="row"><button id="no" class="btn grey" type="button">Annulla</button><button id="yes" class="btn gold" type="button">Accedi</button></div>`);
      b2.querySelector('#no').onclick = account;
      b2.querySelector('#yes').onclick = async () => {
        pendingLogin = true;
        const err = await Cloud.login(v.email, v.password);
        if (err) { pendingLogin = false; toast(err, 4000); account(); return; }
        closeModal();
      };
    };
  }
  // Quando cambia chi è collegato: carica i progressi dell'account, oppure fa arrivare al server quelli
  // dell'ospite (se l'account nuovo non ne ha ancora). Il telefono non scrive mai i progressi da solo.
  async function onAccount(me, event, changed) {
    if (!me || !changed) return;
    Server.dimenticaClassifica();   // la classifica di prima era di un altro account
    clMondo = null;
    if (Cloud.comingBack()) pendingLogin = true;   // tornati dalla pagina di Google
    const row = await Cloud.load();
    const rimpiazza = !!row && (pendingLogin || !me.guest);   // usare quelli dell'account al posto del telefono
    const dati = {};
    if (!row) {
      // L'account non ha ancora progressi in Guerra degli Dèi:
      // 1) se prima eravamo ospiti, il server può spostare qui i progressi dell'ospite (una volta sola);
      const ospite = Cloud.ospitePrecedente();
      if (ospite) dati.ospite = ospite;
      // 2) i progressi rimasti solo sul telefono (versione vecchia senza accesso) li può importare, con dei limiti.
      //    Le chat restano sul telefono e arrivano dopo con "aggiorna" (la richiesta deve stare sotto i 64 KB).
      if (profile.server !== true) dati.locale = Object.assign({}, Server.accorcia(profile), { chats: {} });
    }
    let r;
    try { r = await Server.chiedi('profilo', dati); } catch (e) {
      pendingLogin = false;
      // il token si butta solo se il server l'ha rifiutato; con un guasto (500) o senza rete si riprova la prossima volta
      if (e && (e.message === 'non_permesso' || e.message === 'dati_non_validi')) Cloud.dimenticaOspite();
      return;   // senza rete: resta il telefono
    }
    Cloud.dimenticaOspite();
    const adottato = !!(r.out && r.out.adottato);
    if (rimpiazza || adottato) {
      Server.copiaDiSicurezza(profile, r.profilo, store);
      profile = P.restore(r.profilo); aggiornaInviati = {}; P.save(profile, store); Social.restart(); render();
      if (adottato) toast('Fatto! I progressi da ospite ora sono nel tuo account', 3500);
      else if (pendingLogin) toast('Bentornato! Progressi dell\'account caricati');
    } else {
      accetta(r); render();
    }
    pendingLogin = false;
    rinnovaAvvisi();
  }

  // Titolare dei diritti: cambia qui il nome se vuoi che compaia il tuo nome vero
  const COPYRIGHT = 'Scandi';
  function legal() {
    modal(`<h3>🔒 Privacy e diritti</h3>
      <p><b>© 2026 ${COPYRIGHT}. Tutti i diritti riservati.</b> Guerra degli Dèi, i suoi disegni, i nomi e i testi delle carte e il codice
      sono opere originali di proprietà esclusiva del titolare: è vietato copiarli, ripubblicarli o usarli altrove senza permesso scritto.
      La libreria supabase-js (licenza MIT) appartiene ai suoi autori.</p>
      <p><b>Privacy in breve:</b> niente pubblicità, cookie o statistiche. I tuoi progressi sono salvati su questo dispositivo e online
      nel tuo account (servizio <b>Supabase</b>, dati in Europa). Entri come ospite senza dati personali; l'email serve solo se crei un account
      (dai 14 anni in su). Puoi eliminare l'account e i progressi online da 👤 Account.</p>
      <p><b>Controllo anti-robot:</b> quando entri, Cloudflare Turnstile verifica (di solito senza farti fare niente) che tu sia una persona.
      Per farlo riceve dati tecnici del dispositivo e del browser, come l'indirizzo IP, e li usa solo per questo controllo.</p>
      <p><b>Amici e clan:</b> chat, clan e sfide passano da Supabase su canali che possono usare solo i giocatori coinvolti.
      Gli amici e i membri del clan vedono il tuo nome nel gioco, le coppe e i messaggi; il tuo indirizzo IP non viene mostrato.
      Se non vuoi, non aggiungere amici: il resto del gioco funziona lo stesso.</p>
      <p><b>Avvisi dei bauli:</b> se li accendi, il server salva l'indirizzo che il tuo browser usa per le notifiche
      (dato da Google, Apple, Mozilla o Microsoft) e lo usa solo per dirti quando un baule è pronto. Li spegni da ⚙️ Impostazioni.</p>
      <p><b>Consiglio:</b> in chat non scrivere il tuo nome vero, l'indirizzo o altri dati personali.</p>
      <p><b>Memoria del dispositivo:</b> profilo e salvataggio servono per giocare e restano sempre sul dispositivo. Statistiche, battaglie da rivedere e musica si ricordano solo se hai accettato (puoi cambiare scelta da ⚙️ Impostazioni).</p>
      <p class="muted">Il sito è ospitato da GitHub Pages, che può registrare dati tecnici delle visite. Per cancellare i dati sul telefono, cancella i dati del sito dal browser.
      Testo completo: <a href="privacy.html" target="_blank" rel="noopener">privacy e termini</a>. Contatto: cloudescandi1@gmail.com</p>`);
  }

  // ---------------------------------------------------------------- prima battaglia guidata
  // Un allenamento facile con una nuvoletta che spiega un passo alla volta.
  // avanti: 'ok' = si va avanti col bottone, 'carta' = quando giochi una carta, 'fine' = ultimo passo
  const PASSI_GUIDA = [
    { dove: 'mano', avanti: 'ok', testo: 'Queste sono le tue <b>4 carte</b>. Il numero viola è quanta <b>ambrosia 💧</b> costano.' },
    { dove: 'campo', avanti: 'carta', testo: '<b>Trascina una carta</b> sul campo, nella tua metà (quella in basso). Oppure toccala e poi tocca il campo.' },
    { dove: 'alto', avanti: 'ok', testo: 'Bravo! Le truppe <b>camminano da sole</b> e attaccano. Abbatti i templi nemici per fare <b>corone 👑</b>.' },
    { dove: 'ambrosia', avanti: 'ok', testo: 'L\'ambrosia si <b>ricarica da sola</b>: aspetta che la barra si riempia per giocare le carte più care.' },
    { dove: 'alto', avanti: 'fine', testo: 'Il tempio grande in fondo è del <b>Re</b>: abbattilo e vinci subito con 3 corone. Buona battaglia!' },
  ];
  let passoGuida = -1;
  function mostraGuida() {
    const p = PASSI_GUIDA[passoGuida], el = $('#guida');
    el.className = 'guida ' + p.dove;
    el.innerHTML = `<p>${p.testo}</p>${p.avanti === 'carta' ? '' : `<button class="btn small gold" type="button">${p.avanti === 'fine' ? 'Andiamo!' : 'Avanti'}</button>`}`;
    el.hidden = false;
    const b = el.querySelector('button');
    if (b) b.onclick = () => { Sound.play('tap'); avantiGuida(); };
  }
  function avantiGuida() {
    passoGuida++;
    if (passoGuida >= PASSI_GUIDA.length) chiudiGuida(); else mostraGuida();
  }
  function chiudiGuida() { passoGuida = -1; $('#guida').hidden = true; }
  // la guida aspetta qualcosa (per ora: che tu giochi una carta)
  function eventoGuida(tipo) { if (passoGuida >= 0 && PASSI_GUIDA[passoGuida].avanti === tipo) avantiGuida(); }
  function benvenuto() {
    const body = modal(`<div class="center"><div class="benv-zeus">${art('king', 'benv-art')}</div><h3>Benvenuto nella Guerra degli Dèi!</h3>
      <p>Ti mostro come si gioca con una <b>battaglia di prova</b> contro il computer. Non si perdono coppe.</p>
      <div class="row"><button class="btn grey" id="benv-no" type="button">Salta</button><button class="btn gold" id="benv-si" type="button">Iniziamo!</button></div></div>`);
    body.querySelector('#benv-no').onclick = () => { closeModal(); howTo(); };
    body.querySelector('#benv-si').onclick = () => {
      closeModal();
      startVsBot('train', 'facile');
      passoGuida = 0;
      setTimeout(() => { if (B && passoGuida === 0) mostraGuida(); }, 900);
    };
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
  if (window.Cloud) Cloud.start('guerra', { onUser: onAccount, onError: (m) => console.warn('Account:', m) });
  Social.start(() => profile, save, {
    onStatus: (st) => { netDot(st); softClan(); },
    onPeers: softClan,
    // il nostro codice amico risulta già di un altro account: ne prendiamo uno nuovo
    onCodeTaken: () => {
      profile.id = P.randomId(6); save(); render(); Social.restart();
      toast('Il tuo codice amico è cambiato: ora è ' + profile.id, 4000);
    },
    onImpostor: (id) => {
      const f = profile.friends.find((x) => x.id === id);
      toast(`⚠️ Qualcuno ha provato a fingersi ${f ? f.name : id}: bloccato`, 4000);
    },
    onChat: (id, msg) => {
      Sound.play('msg');
      if (chatWith === id && openChat.redraw) { openChat.redraw(); return; }
      const f = profile.friends.find((x) => x.id === id);
      toast(`💬 ${f ? f.name : id}: ${msg.text}`, 3500);
      if (tab !== 'clan') { unread++; updateBadge(); }
    },
    // `nuove` = nel clan ci sono donazioni nuove per noi: le carte le accredita il server
    onClan: async (nuove) => {
      if (tab !== 'clan') { unread++; updateBadge(); }
      softClan();
      if (!nuove) return;
      const got = await sincronizza();
      if (got > 0) { toast(`🎁 Hai ricevuto ${got === 1 ? 'una carta' : got + ' carte'} dal clan!`, 3500); Sound.play('chest'); }
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
        save(); closeModal(); render(); toast('Benvenuto nel clan!');
      };
    },
    onBattleMsg,
  });
  netDot(Social.status());

  // Ogni secondo cambia solo i numeri dei conti alla rovescia. La scheda intera si ridisegna
  // solo quando cambia qualcosa (un baule pronto, il giorno nuovo): ridisegnarla sempre
  // faceva perdere i tocchi sui bottoni e affaticava il telefono.
  let firmaTempo = '';
  setInterval(() => {
    if (B || !$('#modal').hidden) return;
    const now = Date.now();
    const firma = tab + P.romeDay(now) + (tab === 'battaglia' ? profile.chests.map((c) => P.chestState(c, now)).join() + P.giftReady(profile, now) : '');
    if (firma !== firmaTempo) {
      const prima = firmaTempo;
      firmaTempo = firma;
      // cambiare scheda la ridisegna già: qui solo se è passato del tempo sulla stessa scheda
      if (prima.startsWith(tab)) { if (tab === 'battaglia') renderBattleTab(); else if (tab === 'negozio') renderShop(); }
    }
    for (const el of document.querySelectorAll('.tab.active [data-fine]')) el.textContent = fmtWait(Math.max(0, el.dataset.fine - now));
  }, 1000);

  // Prepara subito i disegni (personaggi, templi, pubblico) così in battaglia sono già pronti
  Sprites.preload(Sprites.keys());
  render();
  if (!profile.seen.howto) { profile.seen.howto = true; save(); setTimeout(benvenuto, 400); }

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
