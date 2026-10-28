// Amici e clan senza server: i telefoni si collegano direttamente tra loro (PeerJS / WebRTC).
// Ogni giocatore ha un codice amico; quando il gioco è aperto e c'è internet, è "online".
// I messaggi del clan vengono copiati da ogni membro e passati agli altri quando si collegano.
(function (root) {
  'use strict';
  const PREFIX = 'guerradeidei26-';   // per non confonderci con altre app che usano lo stesso servizio
  const P = root.Profile;

  let peer = null, me = null, cb = {}, retry = null;
  const conns = {};          // id amico -> connessione aperta
  const pending = {};        // id amico -> connessione in corso
  let status = 'offline';    // 'offline' | 'connessione' | 'online' | 'doppio'

  function setStatus(s) { status = s; cb.onStatus && cb.onStatus(s); }

  // getProfile: funzione che restituisce il profilo; save: salva il profilo; callbacks: eventi per la grafica
  function start(getProfile, save, callbacks) {
    me = { get: getProfile, save };
    cb = callbacks || {};
    if (typeof root.Peer === 'undefined') { setStatus('offline'); return; }
    open();
    setInterval(refresh, 30000);
  }

  function open() {
    if (peer && !peer.destroyed) peer.destroy();
    setStatus('connessione');
    peer = new root.Peer(PREFIX + me.get().id, { debug: 0 });
    peer.on('open', () => { setStatus('online'); refresh(); });
    peer.on('connection', (conn) => setup(conn));
    peer.on('disconnected', () => { setStatus('offline'); later(); });
    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') { setStatus('doppio'); return; }   // il gioco è già aperto in un'altra scheda
      if (err.type === 'peer-unavailable') {
        const m = /peer (\S+)/.exec(err.message || '');
        const id = m ? m[1].replace(PREFIX, '') : null;
        if (id) { delete pending[id]; cb.onPeers && cb.onPeers(); cb.onUnavailable && cb.onUnavailable(id); }
        return;
      }
      if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) { setStatus('offline'); later(); }
    });
  }

  function later() {
    clearTimeout(retry);
    retry = setTimeout(() => { if (status !== 'online') open(); }, 8000);
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

  function connect(id) {
    if (!peer || status !== 'online' || conns[id] || pending[id] || id === me.get().id) return;
    const conn = peer.connect(PREFIX + id, { reliable: true, serialization: 'json' });
    pending[id] = conn;
    setup(conn);
    setTimeout(() => { if (pending[id] === conn) { delete pending[id]; try { conn.close(); } catch (e) { /* già chiusa */ } } }, 15000);
  }

  function hello() {
    const p = me.get();
    return { t: 'hello', id: p.id, name: p.name, trophies: p.trophies, clan: p.clan ? { id: p.clan.id, name: p.clan.name, badge: p.clan.badge } : null };
  }

  function setup(conn) {
    const id = conn.peer.replace(PREFIX, '');
    conn.on('open', () => {
      delete pending[id];
      if (conns[id] && conns[id] !== conn) { try { conns[id].close(); } catch (e) { /* vecchia */ } }
      conns[id] = conn;
      conn.send(hello());
      const p = me.get();
      if (p.clan && p.clan.members.some((m) => m.id === id)) conn.send({ t: 'clan', clan: p.clan });
      cb.onPeers && cb.onPeers();
    });
    conn.on('data', (msg) => receive(id, msg));
    conn.on('close', () => {
      if (conns[id] === conn) delete conns[id];
      delete pending[id];
      cb.onPeers && cb.onPeers();
      cb.onBattleMsg && cb.onBattleMsg(id, { t: 'gone' });
    });
    conn.on('error', () => { delete pending[id]; });
  }

  function receive(id, msg) {
    if (!msg || typeof msg !== 'object') return;
    const p = me.get();
    switch (msg.t) {
      case 'hello': {
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
    const c = conns[id];
    if (!c || !c.open) return false;
    try { c.send(msg); return true; } catch (e) { return false; }
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

  const isOnline = (id) => !!(conns[id] && conns[id].open);

  root.Social = { start, connect, send, sendChat, refresh, broadcastClan, inviteToClan, joinClan, leaveClan, clanPost, isOnline, status: () => status, reopen: open };
})(typeof self !== 'undefined' ? self : this);
