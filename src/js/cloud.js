// Account e salvataggi online con Supabase.
// Ogni giocatore entra subito come "ospite" (senza registrarsi); se vuole, poi collega
// un'email e una password: così ritrova i progressi su un altro telefono.
// La chiave qui sotto è PUBBLICA (può stare nel gioco): i dati sono protetti dalle regole
// del database, per cui ognuno legge e scrive solo i propri salvataggi.
(function (root) {
  'use strict';
  const URL = 'https://vnegcvnpribnojkxmegg.supabase.co';
  const KEY = 'sb_publishable_HnOulQ5E1wXOxoyY1B_SZw_Eedb2xy8';

  let sb = null, user = null, cb = {}, timer = null, lastSent = '';
  // chi aspetta che l'accesso sia pronto (per esempio amici e clan)
  let waiting = [];

  function start(game, callbacks) {
    cb = callbacks || {};
    cb.game = game;
    if (!root.supabase || !root.supabase.createClient) return;
    sb = root.supabase.createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'account-' + game },
    });
    sb.auth.onAuthStateChange((event, session) => {
      const was = user && user.id;
      user = session ? session.user : null;
      if (user && session) { sb.realtime.setAuth(session.access_token); const w = waiting; waiting = []; w.forEach((f) => f()); }
      cb.onUser && cb.onUser(info(), event, was !== (user && user.id));
    });
    ensure();
  }

  // Se non c'è nessuno collegato, entra come ospite
  async function ensure() {
    const { data } = await sb.auth.getSession();
    if (data && data.session) return;
    const r = await sb.auth.signInAnonymously();
    if (r.error) cb.onError && cb.onError(italiano(r.error));
  }

  const info = () => user ? { id: user.id, guest: !!user.is_anonymous, email: user.email || user.new_email || '', confirmed: !!user.email_confirmed_at } : null;

  // Salva i dati del gioco online (aspetta qualche secondo per non salvare a ogni tocco)
  function save(dati) {
    if (!sb) return;
    clearTimeout(timer);
    timer = setTimeout(() => saveNow(dati), 3000);
  }
  async function saveNow(dati) {
    if (!sb || !user) return false;
    const text = JSON.stringify(dati);
    if (text === lastSent) return true;
    const { error } = await sb.from('salvataggi').upsert({ user_id: user.id, gioco: cb.game, dati, aggiornato: new Date().toISOString() });
    if (!error) lastSent = text;
    return !error;
  }
  async function load() {
    if (!sb || !user) return null;
    const { data, error } = await sb.from('salvataggi').select('dati, aggiornato').eq('gioco', cb.game).maybeSingle();
    return error ? null : data;
  }

  // Da ospite ad account vero: stessi dati, in più email e password.
  // Supabase manda un'email di conferma; dopo il clic sul link l'account è completo.
  async function register(email, password) {
    if (!sb || !user) return 'Non collegato: riprova tra poco';
    const r1 = await sb.auth.updateUser({ email }, { emailRedirectTo: location.href.split('?')[0] });
    if (r1.error) return italiano(r1.error);
    const r2 = await sb.auth.updateUser({ password });
    return r2.error ? italiano(r2.error) : null;
  }
  async function login(email, password) {
    if (!sb) return 'Non collegato: riprova tra poco';
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return error ? italiano(error) : null;
  }
  // Cancella l'account e tutti i suoi salvataggi online
  async function remove() {
    if (!sb || !user) return 'Non collegato: riprova tra poco';
    const { error } = await sb.rpc('elimina_account');
    if (error) return italiano(error);
    await sb.auth.signOut();
    lastSent = '';
    await ensure();
    return null;
  }
  async function logout() {
    if (!sb) return;
    await sb.auth.signOut();
    lastSent = '';
    await ensure();
  }

  // Messaggi di errore di Supabase tradotti in parole semplici
  function italiano(err) {
    const m = String((err && err.message) || err || '');
    if (/invalid login credentials/i.test(m)) return 'Email o password sbagliate';
    if (/email not confirmed/i.test(m)) return 'Prima conferma l\'email: controlla la posta (anche lo spam)';
    if (/already (been )?registered|already exists/i.test(m)) return 'Questa email ha già un account: usa "Accedi"';
    if (/password should be at least|weak password/i.test(m)) return 'Password troppo corta: almeno 8 caratteri';
    if (/rate limit|too many/i.test(m)) return 'Troppi tentativi: riprova tra qualche minuto';
    if (/anonymous sign-ins are disabled/i.test(m)) return 'L\'accesso da ospite non è ancora attivo';
    if (/invalid email|unable to validate email/i.test(m)) return 'Email non valida';
    if (/fetch|network/i.test(m)) return 'Niente connessione a internet';
    return 'Errore: ' + m.slice(0, 120);
  }

  // Aspetta che ci sia un accesso (anche da ospite); poi restituisce il collegamento a Supabase
  function ready() {
    if (!sb) return Promise.resolve(null);
    if (user) return Promise.resolve(sb);
    return new Promise((res) => waiting.push(() => res(sb)));
  }

  // Manda un messaggio su un canale privato senza entrarci (per esempio "bussare" alla casella di un amico).
  // Il server lo consegna solo se le regole del database lo permettono.
  async function broadcast(topic, event, payload) {
    if (!sb) return false;
    const { data } = await sb.auth.getSession();
    const t = data && data.session && data.session.access_token;
    if (!t) return false;
    try {
      const r = await fetch(URL + '/realtime/v1/api/broadcast', {
        method: 'POST',
        headers: { apikey: KEY, Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ topic, event, payload, private: true }] }),
      });
      return r.ok;
    } catch (e) { return false; }
  }

  root.Cloud = { start, save, saveNow, load, register, login, logout, remove, info, ready, broadcast };
})(typeof self !== 'undefined' ? self : this);
