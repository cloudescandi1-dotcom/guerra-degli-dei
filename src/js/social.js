// Amici e clan tramite Supabase: ogni coppia di giocatori ha un canale privato "coppia:CODICE1-CODICE2"
// che possono usare solo i due proprietari dei codici (lo controllano le regole del database).
// Per farsi trovare da un nuovo amico si "bussa" alla sua casella "casella:CODICE".
// Così nessuno vede l'indirizzo IP degli altri e nessuno può fingersi un altro giocatore.
// I messaggi del clan vengono copiati da ogni membro e passati agli altri quando si collegano.
(function (root) {
  'use strict';
  const P = root.Profile;
  const CODE = /^[A-HJ-NP-Z2-9]{6}$/;

  let sb = null, me = null, cb = {}, retry = null, inbox = null, myCode = null, gen = 0;
  const chans = {};          // id amico -> canale della coppia (anche se l'amico non è collegato)
  const conns = {};          // id amico -> { open: true } quando l'amico è collegato al canale
  const pending = {};        // id amico -> attesa della risposta (per avvisare se il codice non risponde)
  const verified = {};       // id amico -> ha mandato la chiave segreta giusta
  const blocked = {};        // id -> ha provato a fingersi un amico: lo ignoriamo
  let status = 'offline';    // 'offline' | 'connessione' | 'online' | 'doppio'

  function setStatus(s) { status = s; cb.onStatus && cb.onStatus(s); }

  function start(getProfile, save, callbacks) {
    me = { get: getProfile, save };
    cb = callbacks || {};
    if (!root.Cloud) { setStatus('offline'); return; }
    open();
    setInterval(refresh, 30000);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
    }
  }

  // Chiude tutto (per esempio quando cambia account o codice amico) e riparte
  function restart() { close(); open(); }

  function close() {
    gen++;
    clearTimeout(retry);
    for (const id of Object.keys(chans)) drop(id);
    if (inbox && sb) { try { sb.removeChannel(inbox); } catch (e) { /* già chiuso */ } }
    inbox = null;
    myCode = null;
  }

  async function open() {
    const my = ++gen;
    setStatus('connessione');
    sb = await root.Cloud.ready();
    if (my !== gen) return;
    if (!sb) { setStatus('offline'); return; }
    const p = me.get();
    // il codice amico deve essere nostro sul server; se l'ha già un altro, ne prendiamo uno nuovo
    const { data, error } = await sb.rpc('registra_codice', { c: p.id });
    if (my !== gen) return;
    if (error || data === 'errore') { setStatus('offline'); later(); return; }
    if (data === 'occupato') { cb.onCodeTaken && cb.onCodeTaken(); return; }
    myCode = p.id;
    inbox = sb.channel('casella:' + myCode, { config: { private: true } });
    inbox.on('broadcast', { event: 'bussa' }, ({ payload }) => {
      const id = payload && String(payload.da || '');
      if (CODE.test(id) && id !== myCode) connect(id);
    });
    inbox.subscribe((st) => {
      if (my !== gen) return;
      if (st === 'SUBSCRIBED') { setStatus('online'); refresh(); }
      else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') { setStatus('offline'); later(); }
    });
  }

  function later() {
    clearTimeout(retry);
    retry = setTimeout(() => { if (status !== 'online') restart(); }, 8000);
  }

  // Prova a collegarsi con tutti gli amici e i membri del clan
  function refresh() {
    if (status !== 'online') return;
    const p = me.get();
    const ids = new Set(p.friends.map((f) => f.id));
    if (p.clan) for (const m of p.clan.members) if (!m.left) ids.add(m.id);
    ids.delete(p.id);
    for (const id of ids) connect(id);
  }

  const topic = (id) => 'coppia:' + [myCode, id].sort().join('-');

  // Apre il canale con un amico e gli bussa alla casella (così, se non ci conosce ancora, apre anche lui)
  function connect(id) {
    if (!sb || status !== 'online' || !CODE.test(id) || id === myCode || blocked[id]) return;
    if (!chans[id]) {
      const ch = sb.channel(topic(id), { config: { private: true, broadcast: { self: false }, presence: { key: myCode } } });
      chans[id] = ch;
      ch.on('broadcast', { event: 'm' }, ({ payload }) => {
        if (chans[id] !== ch) return;
        if (!conns[id]) opened(id);   // ci scrive: vuol dire che è collegato (anche se la "presenza" arriva dopo)
        receive(id, payload);
      });
      ch.on('presence', { event: 'sync' }, () => { if (chans[id] === ch) presence(id, ch); });
      ch.subscribe((st) => {
        if (chans[id] !== ch) return;
        if (st === 'SUBSCRIBED') ch.track({ at: Date.now() });
        else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') drop(id);
      });
    }
    if (conns[id] || pending[id]) return;
    root.Cloud.broadcast('casella:' + id, 'bussa', { da: myCode });
    pending[id] = setTimeout(() => {
      delete pending[id];
      if (!conns[id]) cb.onUnavailable && cb.onUnavailable(id);
    }, 15000);
  }

  // L'amico è entrato o uscito dal canale della coppia
  function presence(id, ch) {
    const st = ch.presenceState();
    const here = !!(st[id] && st[id].length);
    if (here && !conns[id]) opened(id);
    else if (!here && conns[id]) {
      delete conns[id];
      cb.onPeers && cb.onPeers();
      cb.onBattleMsg && cb.onBattleMsg(id, { t: 'gone' });
    }
  }

  // L'amico è collegato: ci presentiamo (con la chiave segreta) e gli mandiamo il clan
  function opened(id) {
    clearTimeout(pending[id]); delete pending[id];
    conns[id] = { open: true };
    verified[id] = false;
    send(id, hello(id));
    const p = me.get();
    if (p.clan && p.clan.members.some((m) => m.id === id)) send(id, { t: 'clan', clan: p.clan });
    cb.onPeers && cb.onPeers();
  }

  function drop(id) {
    const ch = chans[id];
    delete chans[id];
    clearTimeout(pending[id]); delete pending[id];
    if (ch && sb) { try { sb.removeChannel(ch); } catch (e) { /* già chiuso */ } }
    if (conns[id]) {
      delete conns[id];
      cb.onPeers && cb.onPeers();
      cb.onBattleMsg && cb.onBattleMsg(id, { t: 'gone' });
    }
  }

  // chiave casuale difficile da indovinare (per riconoscere gli amici veri)
  function makeKey() {
    const a = new Uint8Array(16);
    root.crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  function hello(id) {
    const p = me.get();
    const key = P.myFriendKey(p, id, makeKey);
    me.save();
    return { t: 'hello', key, id: p.id, name: p.name, trophies: p.trophies, clan: p.clan ? { id: p.clan.id, name: p.clan.name, badge: p.clan.badge } : null };
  }

  function receive(id, msg) {
    if (!msg || typeof msg !== 'object') return;
    // prima del saluto con la chiave giusta non accettiamo nessun altro messaggio
    if (msg.t !== 'hello' && !verified[id]) return;
    const p = me.get();
    switch (msg.t) {
      case 'hello': {
        // Chi usa il codice di un amico ma non ha la sua chiave segreta è un impostore: lo respingiamo
        if (!P.checkFriendKey(p, id, msg.key)) {
          verified[id] = false;
          blocked[id] = true;   // fino al prossimo avvio non lo richiamiamo
          drop(id);
          cb.onImpostor && cb.onImpostor(id);
          return;
        }
        verified[id] = true;
        // Chi si collega con noi diventa nostro amico (anche al contrario)
        const clan = msg.clan && typeof msg.clan === 'object' ? { id: String(msg.clan.id || '').slice(0, 24), name: String(msg.clan.name || '').slice(0, 24), badge: String(msg.clan.badge || '').slice(0, 4) } : null;
        P.addFriend(p, { id, name: String(msg.name || '').slice(0, 20), trophies: Math.max(0, msg.trophies | 0), clan, seen: Date.now() });
        me.save();
        cb.onPeers && cb.onPeers();
        break;
      }
      case 'chat': {
        const m = msg.msg;
        if (!m || typeof m.text !== 'string') return;
        const clean = { id: String(m.id), from: id, text: m.text.slice(0, 200), at: +m.at || Date.now() };
        if (P.addChat(p, id, clean)) { me.save(); cb.onChat && cb.onChat(id, clean); }
        break;
      }
      case 'clan': {
        if (!p.clan || !msg.clan || msg.clan.id !== p.clan.id) return;
        if (P.mergeClan(p, msg.clan)) {
          const got = P.creditDonations(p);
          me.save();
          cb.onClan && cb.onClan(got);
          broadcastClan(id);
        }
        break;
      }
      case 'clan-invite':
        const inv = P.cleanClan(msg.clan);
        if (inv && (!p.clan || p.clan.id !== inv.id)) cb.onClanInvite && cb.onClanInvite(id, inv);
        break;
      default:
        // Messaggi della battaglia: li gestisce l'app
        cb.onBattleMsg && cb.onBattleMsg(id, msg);
    }
  }

  function send(id, msg) {
    const ch = chans[id];
    if (!ch || !conns[id]) return false;
    ch.send({ type: 'broadcast', event: 'm', payload: msg });
    return true;
  }

  function sendChat(id, text) {
    const p = me.get();
    const msg = { id: P.randomId(10), from: p.id, text: text.slice(0, 200), at: Date.now() };
    P.addChat(p, id, msg);
    me.save();
    send(id, { t: 'chat', msg });
    return msg;
  }

  // Manda il clan a tutti i membri collegati (tranne `except`), e prova a collegarsi con gli altri
  function broadcastClan(except) {
    const p = me.get();
    if (!p.clan) return;
    for (const m of p.clan.members) {
      if (m.id === p.id || m.id === except || m.left) continue;
      if (conns[m.id]) send(m.id, { t: 'clan', clan: p.clan });
      else connect(m.id);
    }
  }

  function inviteToClan(id) {
    const p = me.get();
    if (!p.clan) return false;
    return send(id, { t: 'clan-invite', clan: p.clan });
  }

  function joinClan(clan) {
    const p = me.get();
    p.clan = P.cleanClan(clan);
    if (!p.clan) return;
    const mine = p.clan.members.find((m) => m.id === p.id);
    const info = { id: p.id, name: p.name, trophies: p.trophies, role: 'membro', at: Date.now(), left: false };
    if (mine) Object.assign(mine, info); else p.clan.members.push(info);
    p.clan.chat.push({ id: P.randomId(10), type: 'info', from: p.id, text: p.name + ' è entrato nel clan', at: Date.now() });
    me.save();
    broadcastClan();
  }

  function leaveClan() {
    const p = me.get();
    if (!p.clan) return;
    const mine = p.clan.members.find((m) => m.id === p.id);
    if (mine) { mine.left = true; mine.at = Date.now(); }
    p.clan.chat.push({ id: P.randomId(10), type: 'info', from: p.id, text: p.name + ' ha lasciato il clan', at: Date.now() });
    broadcastClan();
    p.clan = null;
    me.save();
  }

  function clanPost(entry) {
    const p = me.get();
    if (!p.clan) return;
    p.clan.chat.push(Object.assign({ id: P.randomId(10), from: p.id, name: p.name, at: Date.now() }, entry));
    const mine = p.clan.members.find((m) => m.id === p.id);
    if (mine) { mine.trophies = p.trophies; mine.name = p.name; mine.at = Date.now(); }
    me.save();
    broadcastClan();
  }

  const isOnline = (id) => !!conns[id];

  root.Social = { start, connect, send, sendChat, refresh, broadcastClan, inviteToClan, joinClan, leaveClan, clanPost, isOnline, status: () => status, restart };
})(typeof self !== 'undefined' ? self : this);
