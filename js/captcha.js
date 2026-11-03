// Captcha "Turnstile" di Cloudflare: controlla che a creare un account sia una persona e non un
// programma che ne crea migliaia. Quasi sempre è invisibile; solo nei casi sospetti compare un
// riquadro in basso da toccare. Il "biglietto" (token) che restituisce viene controllato da Supabase.
// SITE_KEY è la chiave PUBBLICA del sito (può stare nel gioco); quella segreta sta solo in Supabase.
// Se SITE_KEY è vuota il captcha è spento e non si scarica niente da Cloudflare.
(function (root) {
  'use strict';
  const SITE_KEY = '0x4AAAAAAFtQPNHVoDYevmyS';

  let loading = null;
  const ATTESA_MASSIMA = 20000;   // millisecondi: oltre questo tempo il controllo si considera non riuscito
  function load() {
    if (root.turnstile) return Promise.resolve(root.turnstile);
    if (loading) return loading;
    loading = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => res(root.turnstile);
      s.onerror = () => { loading = null; rej(new Error('captcha non caricato')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  // Restituisce il biglietto da dare a Supabase (o undefined se il captcha è spento)
  async function token() {
    if (!SITE_KEY) return undefined;
    const ts = await load();
    return new Promise((res, rej) => {
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:300';
      document.body.appendChild(box);
      let id = null, finito = false;
      const done = () => { finito = true; clearTimeout(limite); try { if (id !== null) ts.remove(id); } catch (e) { /* già tolto */ } box.remove(); };
      // senza internet a volte Turnstile non risponde mai: dopo 20 secondi si lascia perdere (si riproverà più tardi)
      const limite = setTimeout(() => { if (!finito) { done(); rej(new Error('captcha scaduto')); } }, ATTESA_MASSIMA);
      id = ts.render(box, {
        sitekey: SITE_KEY,
        appearance: 'interaction-only',   // si vede solo se serve un tocco
        language: 'it',
        callback: (t) => { done(); res(t); },
        'error-callback': () => { done(); rej(new Error('captcha non superato')); },
        'timeout-callback': () => { done(); rej(new Error('captcha scaduto')); },
        // se serve un tocco della persona, si aspetta senza limite (ci pensa Turnstile a scadere)
        'before-interactive-callback': () => clearTimeout(limite),
      });
    });
  }

  root.Captcha = { token, attivo: () => !!SITE_KEY };
})(typeof self !== 'undefined' ? self : this);
