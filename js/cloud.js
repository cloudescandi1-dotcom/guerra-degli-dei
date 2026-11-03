// Account e salvataggi online con Supabase.
// Ogni giocatore entra subito come "ospite" (senza registrarsi); se vuole, poi collega
// un'email e una password: così ritrova i progressi su un altro telefono.
// La chiave qui sotto è PUBBLICA (può stare nel gioco): i dati sono protetti dalle regole
// del database, per cui ognuno legge e scrive solo i propri salvataggi.
(function (root) {
  'use strict';
  const URL = 'https://vnegcvnpribnojkxmegg.supabase.co';
  const KEY = 'sb_publishable_HnOulQ5E1wXOxoyY1B_SZw_Eedb2xy8';

  let sb = null, user = null, cb = {};
  // chi aspetta che l'accesso sia pronto (per esempio amici e clan)
  let waiting = [];
  // true se l'ultimo ingresso da ospite non è riuscito (niente internet, captcha non superato...)
  let fallito = false;
  // sveglia chi aspetta: con il collegamento se è pronto, con null se l'ingresso non è riuscito
  function sveglia(valore) { const w = waiting; waiting = []; w.forEach((f) => f(valore)); }

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
      if (user && session) { fallito = false; sb.realtime.setAuth(session.access_token); sveglia(sb); }
      cb.onUser && cb.onUser(info(), event, was !== (user && user.id));
    });
    ensure();
  }

  // Il captcha (vedi captcha.js): un "biglietto" che dimostra che è una persona a entrare
  const captcha = () => (root.Captcha ? root.Captcha.token() : Promise.resolve(undefined));

  // Se non c'è nessuno collegato, entra come ospite
  async function ensure() {
    const { data } = await sb.auth.getSession();
    if (data && data.session) return;
    // se non si riesce a entrare, chi aspetta (amici e clan) riceve null invece di aspettare per sempre
    const nonRiuscito = (e) => { fallito = true; cb.onError && cb.onError(italiano(e)); sveglia(null); };
    let captchaToken;
    try { captchaToken = await captcha(); } catch (e) { nonRiuscito(e); return; }
    let r;
    try { r = await sb.auth.signInAnonymously({ options: { captchaToken } }); } catch (e) { nonRiuscito(e); return; }
    if (r.error) nonRiuscito(r.error);
  }

  const info = () => user ? { id: user.id, guest: !!user.is_anonymous, email: user.email || user.new_email || '', confirmed: !!user.email_confirmed_at } : null;

  // Il collegamento a Supabase (serve a server.js per chiamare la funzione "guerra")
  const client = () => sb;

  // Il telefono NON salva più i progressi del gioco: li scrive solo il server (funzione "guerra").
  // Qui si può solo leggere la riga, per sapere se l'account ha già dei progressi.
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
  // ---- Dall'ospite a un account: il "biglietto" dell'ospite ----
  // Prima di entrare in un altro account, il telefono si tiene il token di accesso dell'ospite.
  // Al rientro lo manda al server: se il nuovo account non ha ancora progressi in Guerra degli Dèi,
  // il server gli passa quelli dell'ospite (funzione SQL guerra_adotta). Il token vale circa un'ora.
  const CHIAVE_OSPITE = 'ospite-precedente';
  async function ricordaOspite() {
    try {
      const { data } = await sb.auth.getSession();
      const s = data && data.session;
      if (s && s.user && s.user.is_anonymous && s.access_token) localStorage.setItem(CHIAVE_OSPITE, s.access_token);
    } catch (e) { /* senza localStorage: pazienza */ }
  }
  function ospitePrecedente() {
    try { return localStorage.getItem(CHIAVE_OSPITE) || null; } catch (e) { return null; }
  }
  function dimenticaOspite() {
    try { localStorage.removeItem(CHIAVE_OSPITE); } catch (e) { /* pazienza */ }
  }

  // Accesso con Google: si apre la pagina di Google e poi si torna al gioco già collegati
  async function loginGoogle() {
    if (!sb) return 'Non collegato: riprova tra poco';
    await ricordaOspite();
    try { localStorage.setItem('account-in-arrivo', '1'); } catch (e) { /* pazienza */ }
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.href.split('?')[0].split('#')[0] } });
    if (error) dimenticaOspite();
    return error ? italiano(error) : null;
  }
  async function login(email, password) {
    if (!sb) return 'Non collegato: riprova tra poco';
    let captchaToken;
    try { captchaToken = await captcha(); } catch (e) { return italiano(e); }
    await ricordaOspite();
    const { error } = await sb.auth.signInWithPassword({ email, password, options: { captchaToken } });
    if (error) dimenticaOspite();
    return error ? italiano(error) : null;
  }

  // Dopo un 401 dal server: prova a rinnovare l'accesso. Se il rinnovo viene rifiutato (accesso non più
  // valido) e si era ospiti, si entra come ospite nuovo. Restituisce true se ora c'è un accesso valido.
  async function ricollega() {
    if (!sb) return false;
    try {
      const r = await sb.auth.refreshSession();
      if (!r.error && r.data && r.data.session) return true;
      const rifiutato = r.error && r.error.status >= 400 && r.error.status < 500;   // non è un problema di rete
      if (rifiutato && (!user || user.is_anonymous)) {
        await sb.auth.signOut({ scope: 'local' });
        await ensure();
        const { data } = await sb.auth.getSession();
        return !!(data && data.session);
      }
    } catch (e) { /* rete */ }
    return false;
  }
  // Cancella l'account e tutti i suoi salvataggi online
  async function remove() {
    if (!sb || !user) return 'Non collegato: riprova tra poco';
    const { error } = await sb.rpc('elimina_account');
    if (error) return italiano(error);
    await sb.auth.signOut();
    await ensure();
    return null;
  }
  async function logout() {
    if (!sb) return;
    await sb.auth.signOut();
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
    if (/captcha/i.test(m)) return 'Controllo anti-robot non superato: riprova';
    if (/fetch|network/i.test(m)) return 'Niente connessione a internet';
    if (/provider is not enabled|unsupported provider/i.test(m)) return "L'accesso con Google non è ancora attivo";
    return 'Errore: ' + m.slice(0, 120);
  }

  // Aspetta che ci sia un accesso (anche da ospite); poi restituisce il collegamento a Supabase.
  // Se l'ingresso non riesce restituisce null; chiamandola di nuovo si riprova a entrare.
  function ready() {
    if (!sb) return Promise.resolve(null);
    if (user) return Promise.resolve(sb);
    const p = new Promise((res) => waiting.push(res));
    if (fallito) { fallito = false; ensure(); }
    return p;
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

  // Siamo appena tornati dalla pagina di Google? (allora i progressi dell'account vanno caricati)
  function comingBack() {
    try { const v = localStorage.getItem('account-in-arrivo'); localStorage.removeItem('account-in-arrivo'); return v === '1'; } catch (e) { return false; }
  }

  root.Cloud = {
    start, client, load, register, login, loginGoogle, comingBack, logout, remove, info, ready, broadcast,
    ricollega, ospitePrecedente, dimenticaOspite,
  };
})(typeof self !== 'undefined' ? self : this);
