# Anti-imbroglio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Il server (Supabase Edge Function) diventa l'unico a poter cambiare monete, gemme, carte, coppe, bauli, negozio, cammino e torneo; le vittorie si verificano rigiocando la partita sul server.

**Architecture:** Le regole restano nei file UMD già esistenti (`cards.js`, `profile.js`, `engine.js`, `bot.js`) più tre nuovi file UMD condivisi (`setup-battaglia.js`, `rigioco.js`, `azioni.js`). La Edge Function `guerra` (Deno) carica copie identiche di questi file, legge il profilo da `salvataggi`, esegue l'azione con l'orologio e i numeri a caso del server e salva con controllo di versione. Il gioco chiede le azioni al server e sostituisce i campi "del server" con quelli ricevuti.

**Tech Stack:** JavaScript UMD (browser + Node + Deno), Node test runner (`node --test`), Supabase (Postgres RLS, Edge Functions Deno, supabase-js 2.45.4 già nel progetto), Supabase CLI via `npx supabase`.

**Spec:** `docs/superpowers/specs/2026-10-30-anti-imbroglio-design.md`

## Global Constraints

- Tutti i testi per il giocatore e i commenti nel codice in **italiano**, semplici (l'utente è principiante).
- Progetto Supabase: `https://vnegcvnpribnojkxmegg.supabase.co`, chiave pubblica `sb_publishable_HnOulQ5E1wXOxoyY1B_SZw_Eedb2xy8`. La chiave service role **non** entra mai nel codice né nella chat: la Edge Function la legge da `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`.
- Senza internet si gioca, ma **premi, bauli, acquisti, potenziamenti e coppe solo online**.
- Le sfide tra amici non danno premi (restano solo vittorie/sconfitte con l'amico, campo del telefono).
- La tabella `battaglie` si svuota da sola dopo **30 giorni**.
- Gli scacchi (`gioco = 'scacchi'`) non cambiano.
- Il motore deve dare lo stesso risultato in Safari, Chrome e Deno: niente `Math.hypot`, `Math.sin`, `Math.cos`, `Math.pow` (né altre funzioni non esatte) in `engine.js`, `bot.js`, `cards.js`, `setup-battaglia.js`, `rigioco.js`.
- Ogni volta che cambia un file in `src/`, aumentare `CACHE` in `src/sw.js` e aggiungere i file nuovi all'elenco.
- Commit con le righe finali `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` e `Claude-Session: https://claude.ai/code/session_01GeQjvJth8VRcRHfh8bNhmj`; dopo ogni push `gh run watch`.

## Review Focus

1. **Doppio tocco** su "Apri baule" o "Compra": due richieste insieme non devono aprire due volte né far pagare due volte (controllo di versione sul salvataggio; test in Task 5).
2. **Battaglia abbandonata** (app chiusa mentre si perde): una battaglia classificata non chiusa conta come sconfitta alla richiesta successiva, altrimenti si evitano le perdite di coppe (test in Task 4).
3. **Mosse truccate**: elenco enorme, numeri non finiti, passi fuori ordine, carta non giocabile → battaglia rifiutata senza premi e senza errori del server (test in Task 2 e Task 4).
4. **App vecchia ancora in memoria** che prova il salvataggio diretto: viene rifiutato dal database ma il gioco non deve bloccarsi né perdere progressi (Task 6, controllo manuale).
5. **Partita "troppo veloce"**: `battaglia_fine` con tempo reale trascorso minore della durata simulata meno il margine → rifiutata (test in Task 4).

---

### Task 1: Motore identico su ogni dispositivo

**Files:**
- Modify: `src/js/engine.js` (righe con `Math.hypot`, `Math.cos`, `Math.sin`: 130, 384 e le 5 `hypot`), `src/js/bot.js` (2 `Math.hypot`), `src/js/cards.js:16` (`levelMul`)
- Test: `tests/determinismo.test.js` (nuovo), `package.json` (aggiungere il file a `npm test`)

**Interfaces:**
- Produces: `Engine.dist(dx, dy) -> number` (= `Math.sqrt(dx*dx + dy*dy)`), `Engine.DIREZIONI` (array fisso di `[cos, sin]` precalcolati come letterali numerici per gli angoli usati), `GameData.levelMul(level)` invariato nel risultato ma calcolato con moltiplicazioni ripetute di `1.1`. Nuovo campo dello stato `s.n` (numero intero di passi fatti, +1 a ogni `step`).

- [ ] **Step 1: Write the failing test** `tests/determinismo.test.js`:
  - `nessuna funzione matematica non esatta`: legge il testo di `engine.js`, `bot.js`, `cards.js` e verifica che non contenga `Math.hypot`, `Math.sin`, `Math.cos`, `Math.pow`, `Math.exp`, `Math.log`, `Math.atan`.
  - `partita bot contro bot ripetibile`: con `createMatch({ decks: [D.START_DECK, D.START_DECK], levels: [{}, {}], towerLevels: [1, 1], seed: 1234 })`, due bot `createBot('medio', 11)` e `createBot('medio', 99)` (giocatori 0 e 1), ciclo bot0 → bot1 → `step` fino a `s.over`; due esecuzioni identiche danno stesso `winner`, stesse `crowns`, stesso `s.n` e stessa impronta `JSON.stringify(s.ents.map(e => [e.id, e.x, e.y, e.hp]))`.
  - `s.n conta i passi`: dopo 3 `step` su una partita nuova `s.n === 3`.
- [ ] **Step 2:** `npm test` → FAIL (trova `Math.hypot`; `s.n` undefined).
- [ ] **Step 3:** Sostituire le funzioni. `levelMul(level)`: ciclo `m *= 1.1` per `level - 1` volte. Per `sin/cos` a riga 130 e 384 usare l'angolo già calcolato come indice in una tabella fissa di direzioni (stesso numero di direzioni che oggi l'angolo può assumere; se l'angolo viene da `rng()` continuo, sceglierne una di 16 con `Math.floor(rng() * 16)`). Aggiungere `s.n = 0` in `createMatch` e `s.n++` in `step` subito dopo `s.t += dt`.
- [ ] **Step 4:** `npm test` → PASS (26 vecchi test compresi).
- [ ] **Step 5: Commit** `git commit -m "Motore identico su ogni dispositivo (niente funzioni matematiche non esatte)"`

### Task 2: Impostazioni della battaglia e rigioco

**Files:**
- Create: `src/js/setup-battaglia.js`, `src/js/rigioco.js`
- Modify: `src/js/app.js:290-308` (`startVsBot` usa `SetupBattaglia.prepara`), `src/index.html` (script prima di `app.js`), `src/sw.js`
- Test: `tests/rigioco.test.js`

**Interfaces:**
- Consumes: `Engine.createMatch/play/step/TICK`, `s.n`, `Bot.createBot(level, seed)`, `Profile.arena/avgLevel/deckLevels/TOUR_LEVEL/tourDifficulty`.
- Produces:
  - `SetupBattaglia.prepara(p, mode, level, rnd) -> { mode, level, arena, foeName, foeLevel, botSeed, match: { decks, levels, towerLevels, seed } }` — stessa logica di oggi in `startVsBot` (mazzo nemico mescolato, livelli, nomi da `FOE_NAMES` spostato qui), con tutti i numeri a caso presi da `rnd()`.
  - `SetupBattaglia.livello(p, mode) -> 'facile'|'medio'|'difficile'` (ladder: arena ≤1 facile, ≤4 medio, altrimenti difficile; tour: `tourDifficulty(p.tour.wins)`).
  - `Rigioco.esegui(setup, mosse) -> { ok: true, winner, crowns: [a, b], passi, secondi } | { ok: false, motivo }` con `mosse = [[n, slot, x, y], ...]`. Ad ogni passo `n`: prima le mosse del giocatore 0 con quel `n` (nell'ordine), poi `bot.think(s, 1, TICK)` + `play`, poi `step`. Si ferma a `s.over` o a `MAX_PASSI = (duration + overtime) / TICK + 20`.
  - `Rigioco.MAX_MOSSE = 400`.
- [ ] **Step 1: Write the failing test** `tests/rigioco.test.js`:
  - `rigioco uguale alla partita vera`: simula una partita "dal vivo" con il giocatore 0 guidato da `createBot('medio', 5)` che registra ogni sua giocata come `[s.n, slot, x, y]` (stesso ordine del ciclo di app.js: giocatore → bot avversario → step); poi `Rigioco.esegui(setup, mosse)` restituisce stesso `winner`, `crowns` e `passi`.
  - `mosse rifiutate`: `ok === false` per: più di 400 mosse; `n` decrescente; `x` = `NaN` o `Infinity`; `n` oltre la fine; mossa con ambrosia insufficiente (`play` restituisce false).
  - `prepara è ripetibile`: stesso `rnd` a seme → stesso risultato JSON.
- [ ] **Step 2:** `npm test` → FAIL (moduli mancanti).
- [ ] **Step 3:** Implementare i due file UMD come gli altri (`isNode ? require(...) : root.X`, esportati come `root.SetupBattaglia` / `root.Rigioco`). In `app.js` `startVsBot` chiama `SetupBattaglia.prepara(profile, mode, level, Math.random)` (per ora resta sul telefono: il server arriva in Task 6).
- [ ] **Step 4:** `npm test` → PASS; aprire il gioco in locale (`npm start`) e fare una partita: deve funzionare come prima.
- [ ] **Step 5: Commit** `git commit -m "Impostazioni della battaglia e rigioco condivisi tra gioco e server"`

### Task 3: Azioni economiche del server (regole pure)

**Files:**
- Create: `src/js/azioni.js` (UMD, non caricato da `index.html`)
- Test: `tests/azioni.test.js`

**Interfaces:**
- Consumes: tutte le funzioni di `Profile`.
- Produces:
  - `Azioni.CAMPI_SERVER` = `['trophies','best','gold','gems','wins','losses','draws','giftDay','shopDay','shopBought','cards','chests','chestIndex','arenaStats','roadClaimed','tour','tourDay','lastRequest','credited']`.
  - `Azioni.CAMPI_TELEFONO` = `['name','deck','friends','chats','clan','sound','seen']` (`id` resta quello registrato e non si cambia).
  - `Azioni.esegui(p, req, ctx) -> { p, out }`; `req = { azione, ...parametri }`; `ctx = { now, rnd }`. Lancia `Error(codice)` con `codice` tra `'azione_sconosciuta'`, `'non_permesso'`, `'dati_non_validi'`.
  - Azioni: `profilo` (nessuna modifica), `baule_sblocca {slot}`, `baule_apri {slot}`, `baule_salta {slot}`, `regalo_apri`, `negozio_compra {key}`, `gemme_compra {id}`, `potenzia {key}`, `cammino_ritira {arena, t}`, `torneo_inizia`, `torneo_ritira`, `aggiorna {campi}` (solo `CAMPI_TELEFONO`: `name` stringa ≤16 caratteri ripulita; `deck` 8 chiavi diverse possedute; `friends`/`chats`/`clan` passati da `cleanClan` e limiti di lunghezza; `sound` booleano; `seen` oggetto piccolo).
  - `Azioni.importa(dati) -> p` per il passaggio una tantum: `Profile.restore(dati)` poi tetti `gems ≤ 2000`, `gold ≤ 100000`, `trophies ≤ 4000` (e `best ≤ 4000`), livelli carta ≤ `D.MAX_LEVEL`; segna `p.server = true`.
- [ ] **Step 1: Write the failing test** `tests/azioni.test.js` (con `rnd` a seme e `now` fisso):
  - `baule_apri prima del tempo → non_permesso`; dopo `unlockAt` → carte aggiunte e slot vuoto.
  - `baule_salta con gemme insufficienti → non_permesso`; con gemme → gemme scalate di `skipCost`.
  - `negozio_compra` di un'offerta non del giorno → `non_permesso`; la stessa offerta due volte → seconda `non_permesso`.
  - `potenzia` senza monete → `non_permesso`.
  - `aggiorna` con `{ gems: 99999, name: 'X' }` → `gems` invariato, `name` aggiornato; mazzo con carta non posseduta → `dati_non_validi`.
  - `importa` con `gems: 999999` → `2000`.
  - `azione_sconosciuta` per `{ azione: 'bara' }`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementare chiamando le funzioni esistenti di `Profile` (per esempio `openChest(p, slot, now, rnd)`, `buyOffer(p, key, now)`), trasformando i loro "no" in `Error('non_permesso')`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `git commit -m "Regole del server per bauli, negozio, potenziamenti, cammino e torneo"`

### Task 4: Battaglie verificate e donazioni del clan (regole pure)

**Files:**
- Modify: `src/js/azioni.js`
- Test: `tests/azioni-battaglie.test.js`

**Interfaces:**
- Consumes: `SetupBattaglia.prepara/livello`, `Rigioco.esegui`, `Profile.applyResult/tourResult/requestMax/canRequest`.
- Produces:
  - `battaglia_inizia {mode}` (`'ladder'|'tour'`) → `out = { setup }` (il server salva `setup` nella tabella `battaglie`). Per `tour` richiede `p.tour` attivo.
  - `battaglia_fine {mosse}` con `ctx.battaglia = { setup, inizio (ms), chiusa }` e `ctx.now` → rigioca; rifiuta (`non_permesso`) se `chiusa`, se `Rigioco` dà `ok:false` (`dati_non_validi`), o se `now - inizio < (secondi - 10) * 1000 * 0.9`. Applica `applyResult(p, winner, crowns[0])` (ladder) o `tourResult(p, winner)` (tour). `out = { winner, crowns, esito }` dove `esito` è il valore restituito da `applyResult`/`tourResult`.
  - `Azioni.abbandonate(p, battaglieAperte, now)`: ogni battaglia ladder aperta con `now - inizio > (setup.match.duration + overtime + 120) s` conta come sconfitta (`applyResult(p, 1, 0)`); tour: `tourResult(p, 1)`. Restituisce gli id da chiudere. La funzione la chiama prima di ogni azione.
  - `clan_richiesta {card}` → controlla `canRequest(p, now)`, imposta `lastRequest`; `out = { id, max: requestMax(card) }` (la Edge Function crea la riga in `richieste_clan`).
  - `clan_dona` con `ctx.richiesta = { carta, max, donate, proprietario }` → richiede carta con `count > 0`, `donate < max`, proprietario ≠ chi dona; toglie 1 carta, dà la ricompensa di oggi (comune 5, rara 25, epica 100); `out = { ricompensa }`.
  - `Azioni.accredita(p, donazioniNuove)` aggiunge 1 carta per ogni donazione `{ id, carta }` non in `p.credited`.
- [ ] **Step 1: Write the failing test**: partita vinta rigiocata → coppe +30; stessa `battaglia_fine` su battaglia `chiusa` → `non_permesso`; tempo reale 5 s per partita di 180 s → `non_permesso`; mosse con `NaN` → `dati_non_validi`; battaglia ladder aperta da 10 minuti → `abbandonate` la conta come sconfitta (coppe −20, non sotto la soglia d'arena); `clan_dona` della propria richiesta → `non_permesso`; `accredita` della stessa donazione due volte → una carta sola.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementare.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** `git commit -m "Battaglie rigiocate dal server e donazioni del clan controllate"`

### Task 5: Database ed Edge Function

**Files:**
- Create: `supabase/04-anti-imbroglio.sql`, `supabase/04b-salvataggi-sola-lettura.sql`, `supabase/functions/guerra/index.ts`, `tools/copia-server.js`, `supabase/functions/_shared/` (copie generate), `tests/copia-server.test.js`
- Modify: `package.json` (script `"server": "node tools/copia-server.js && npx supabase functions deploy guerra --project-ref vnegcvnpribnojkxmegg"`)

**Interfaces:**
- Consumes: `Azioni.esegui/importa/abbandonate/accredita/CAMPI_SERVER`.
- Produces: endpoint `POST /functions/v1/guerra` con header `Authorization: Bearer <token utente>`, corpo `{ azione, ... }`, risposta `200 { profilo, out }` oppure `400 { errore: codice }` / `401 { errore: 'non_collegato' }` / `409 { errore: 'riprova' }`.

SQL (`04b-salvataggi-sola-lettura.sql`):
- Policy di `salvataggi`: insert/update/delete per `authenticated` solo `using/with check (... and gioco <> 'guerra')`; select resta.

SQL (`04-anti-imbroglio.sql`):
- `battaglie (id uuid pk default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, setup jsonb not null, inizio timestamptz not null default now(), chiusa boolean not null default false)`, RLS attiva, **nessuna** policy e `revoke all` da `anon, authenticated`.
- `richieste_clan (id uuid pk default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, carta text not null, max int not null, creata timestamptz default now())` e `donazioni (id uuid pk default gen_random_uuid(), richiesta_id uuid references richieste_clan on delete cascade, da_user uuid references auth.users on delete cascade, creata timestamptz default now())`, stesse regole (solo il server).
- La pulizia dei 30 giorni la fa la funzione a ogni `battaglia_inizia` (`delete ... where inizio < now() - interval '30 days'`).

Edge Function (`index.ts`): CORS solo per `https://cloudescandi1-dotcom.github.io` e `http://localhost:8775`; importa le copie con `import '../_shared/cards.js'` ecc. (si registrano su `globalThis`); utente da `supabase.auth.getUser(token)`; client service role da `Deno.env`; legge la riga `salvataggi (user_id, 'guerra')`; se `dati.server !== true` → `Azioni.importa`; chiude le battaglie abbandonate; accredita le donazioni nuove; esegue; scrive con `update ... where aggiornato = <letto>` (oppure insert se non c'era) e, se nessuna riga aggiornata, risponde `409 riprova`; `rnd` = `crypto.getRandomValues`.

- [ ] **Step 1: Write the failing test** `tests/copia-server.test.js`: ogni file in `['cards.js','profile.js','engine.js','bot.js','setup-battaglia.js','rigioco.js','azioni.js']` in `supabase/functions/_shared/` è identico a quello in `src/js/`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Scrivere `tools/copia-server.js`, l'SQL e `index.ts`; eseguire `node tools/copia-server.js`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** L'utente incolla in Supabase → SQL Editor → **Run** solo la parte di `04-anti-imbroglio.sql` che crea le tabelle `battaglie`, `richieste_clan`, `donazioni` (portarla negli appunti con `Get-Content -Raw -Encoding UTF8 ... | Set-Clipboard`) → atteso "Success". Le nuove regole di `salvataggi` bloccano i salvataggi diretti, quindi stanno in un file separato `04b-salvataggi-sola-lettura.sql` da eseguire **dopo** il Task 6 (Task 6 Step 6).
- [ ] **Step 6:** L'utente esegue `! npx supabase login`; poi `npm run server` → atteso "Deployed Function guerra".
- [ ] **Step 7:** Prove con `curl` (utente anonimo creato passando dal sito, perché il captcha blocca `signup` diretto: token preso dal `localStorage` di una pagina in un contesto isolato del browser): `profilo` → 200; `baule_apri` su slot chiuso → 400 `non_permesso`; due `regalo_apri` in parallelo → uno solo riesce; corpo non JSON → 400; senza token → 401. Poi `elimina_account` dell'utente di prova.
- [ ] **Step 8: Commit** `git commit -m "Funzione del server 'guerra' e tabelle per battaglie e donazioni"`

### Task 6: Il gioco usa il server

**Files:**
- Create: `src/js/server.js`
- Modify: `src/js/app.js` (tutte le chiamate a `P.openChest`, `P.startUnlock`, `P.skipChest`, `P.openGift`, `P.buyOffer`, `P.buyGemItem`, `P.upgrade`, `P.claimRoad`, `P.tourStart`, `P.tourClaim`, `P.applyResult`, `P.tourResult`, `P.creditDonations`, `donate`, la richiesta di carte, `startVsBot`, `tryPlay`, `endBattle`, `save`), `src/js/cloud.js` (niente più `save/saveNow` per guerra), `src/index.html`, `src/sw.js`, `src/privacy.html`, `docs/privacy.md`, `README.md`

**Interfaces:**
- Consumes: endpoint di Task 5; `Azioni.CAMPI_SERVER/CAMPI_TELEFONO` (caricare `azioni.js` anche nel browser solo per questi elenchi? No: copiarli come costante in `server.js` con un test che li confronta con `azioni.js`).
- Produces: `Server.chiedi(azione, dati) -> Promise<{ profilo, out }>` (lancia `Error('offline')` senza rete o senza accesso, `Error(codice)` per i rifiuti, ripete una volta su `409`); `Server.unisci(profiloLocale, profiloServer)` copia solo `CAMPI_SERVER`.

- [ ] **Step 1: Write the failing test** `tests/server-campi.test.js`: gli elenchi in `server.js` coincidono con `Azioni.CAMPI_SERVER/CAMPI_TELEFONO`; `unisci` non tocca `name` e `deck` e sovrascrive `gems`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementare `server.js` con `supabase.functions.invoke('guerra', { body })` sul client di `Cloud` (aggiungere `Cloud.client()`). In `app.js`: ogni azione economica diventa `await Server.chiedi(...)` + `unisci` + `render`; senza rete toast `'Serve internet per questo'`. `save()` salva in locale e manda `aggiorna` con i soli `CAMPI_TELEFONO` (dopo 3 s, come oggi). All'avvio e al ritorno nell'app: `Server.chiedi('profilo')`.
- [ ] **Step 4:** Battaglie: `startLadder`/`startTour` chiedono `battaglia_inizia` e usano il `setup` del server (bot con `setup.botSeed`); se offline usano `SetupBattaglia.prepara(..., Math.random)` e segnano `cfg.offline = true`. In `tryPlay` (ruolo `local`) aggiungere `B.mosse.push([B.state.n, slot, x, y])` dopo un `play` riuscito. In `endBattle`: online → `battaglia_fine { id, mosse }` e mostrare il risultato **del server**; offline → "Senza internet: questa partita non dà premi".
- [ ] **Step 5:** `npm test` → PASS; prova nel browser (porta 8775, contesto isolato): apri regalo, sblocca/apri baule, potenzia, una battaglia classificata vinta (coppe salgono), una giocata offline (DevTools offline: nessun premio, nessun errore).
- [ ] **Step 6:** Pubblicare (push + `gh run watch`), poi l'utente esegue `04b-salvataggi-sola-lettura.sql`. Verificare con `curl` che un `upsert` diretto su `salvataggi` per `guerra` ora dia errore RLS e che il gioco continui a funzionare.
- [ ] **Step 7:** Privacy: aggiungere in `privacy.html` e `docs/privacy.md` che il server registra le battaglie classificate (impostazioni e mosse, non dati personali) per 30 giorni per controllare i risultati. README: versione 1.20.
- [ ] **Step 8: Commit** `git commit -m "Il gioco chiede al server bauli, acquisti, potenziamenti e battaglie"`

### Task 7: Prova sul telefono

**Files:**
- Create: `src/prova-rigioco.html` (pagina che rigioca 3 partite registrate in `tests/` e mostra "UGUALE" o "DIVERSO" confrontando con i risultati attesi scritti nella pagina)

- [ ] **Step 1:** Generare i risultati attesi in Node (`Rigioco.esegui`) e scriverli nella pagina.
- [ ] **Step 2:** Pubblicare; l'utente apre `https://cloudescandi1-dotcom.github.io/guerra-degli-dei/prova-rigioco.html` sull'iPhone → atteso "UGUALE" 3 volte.
- [ ] **Step 3:** L'utente fa una battaglia classificata dall'app installata e apre un baule: tutto funziona.
- [ ] **Step 4: Commit** `git commit -m "Pagina di prova: il rigioco dà lo stesso risultato sul telefono"`
