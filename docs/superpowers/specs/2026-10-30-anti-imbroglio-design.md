# Anti-imbroglio per Guerra degli Dèi — progetto

Data: 30 ottobre 2026. Stato: da approvare.

## Perché
Oggi gemme, monete, carte, coppe e bauli sono calcolati sul telefono e salvati in Supabase così come
arrivano (`salvataggi.dati`). Chi sa un po' di programmazione può scriversi 999.999 gemme o 5.000 coppe.
Il captcha (fatto il 30/10) ferma solo la creazione di account finti, non questo.

## Obiettivo
Il **server** diventa il "salvadanaio": è l'unico che può cambiare i progressi che contano.
Il telefono chiede ("apri il baule 2", "ho finito la battaglia 123 con queste mosse") e il server
decide con il suo orologio e i suoi numeri a caso.

## Decisioni dell'utente
- **Senza internet si gioca** (battaglie contro il computer), ma **premi, bauli, acquisti, potenziamenti
  e coppe solo online**.
- **Controllo completo delle vittorie subito**: il server rigioca ogni partita con le mosse del giocatore.

## Non obiettivi
- Non proteggiamo la grafica o il codice del gioco (si vede comunque nel browser).
- Le sfide tra amici non danno premi oggi: restano come sono (solo il conteggio vittorie/sconfitte con l'amico).
- Niente acquisti con soldi veri.

## Come funziona

### 1. Chi possiede cosa
Il profilo (`Profile` in `profile.js`) si divide in due parti:
- **Del server** (solo il server le cambia): monete, gemme, carte e livelli, coppe e arena, bauli e timer,
  baule del giorno, negozio del giorno, cammino degli eroi, torneo, livello/esperienza, richieste e
  donazioni del clan.
- **Del telefono** (il server le accetta controllandole): nome, mazzo (solo carte possedute, 8 diverse),
  amici, chat, impostazioni, clan (nome/stemma/membri).

Nel database, `salvataggi` per `gioco = 'guerra'` diventa **in sola lettura** per i giocatori
(regole RLS: niente insert/update/delete da parte loro). Scrive solo la funzione del server.
Gli scacchi non cambiano.

### 2. La funzione del server ("Edge Function" `guerra`)
Un solo programma su Supabase (Deno), che **riusa gli stessi file del gioco**: `cards.js`, `profile.js`,
`engine.js`, `bot.js`. Così le regole sono scritte una volta sola e non possono andare fuori sincrono.
Riceve `{ azione, ... }` con il token dell'utente, legge il profilo, applica l'azione, salva, risponde
con il profilo nuovo. Il telefono sostituisce il suo profilo con quello ricevuto.

Azioni:
- `profilo` — legge (e crea la prima volta, anche importando una sola volta i progressi già salvati, vedi sotto).
- `baule_sblocca`, `baule_apri`, `baule_salta` (gemme), `regalo_apri`, `negozio_compra`, `gemme_compra`,
  `potenzia`, `cammino_ritira`, `torneo_inizia`, `torneo_ritira`.
- `aggiorna` — solo i campi "del telefono", controllati (nome max 16 caratteri, mazzo valido...).
- `battaglia_inizia` — il server sceglie seme della partita, seme e livello del computer, mazzo e livelli
  dell'avversario, modalità (classificata o torneo). Registra la battaglia (tabella `battaglie`, una riga
  per partita: id, utente, impostazioni, ora di inizio, chiusa sì/no).
- `battaglia_fine` — riceve l'elenco delle mosse del giocatore `[passo, carta in mano, x, y]`.
  Il server **rigioca la partita** passo per passo con le stesse impostazioni e il computer con lo stesso
  seme, e usa il risultato **suo** (vincitore, corone) con `applyResult` / `tourResult`.
  Controlli: battaglia esistente, dell'utente, non già chiusa, mosse in ordine e possibili,
  tempo reale trascorso ≥ durata simulata meno un margine (non si può "giocare" in 1 secondo).
  Misurato: una partita intera si rigioca in ~0,1 s (Node), sotto il limite delle Edge Functions.
- Donazioni nel clan: `clan_dona` toglie la carta al donatore e la accredita al richiedente lato server
  (oggi l'accredito si fida dei messaggi del clan).

### 3. Partite identiche su ogni dispositivo
Il rigioco funziona solo se il motore dà **esattamente** lo stesso risultato su iPhone (Safari),
Android/PC (Chrome) e server (Deno). Il motore va già a passi fissi (20 al secondo) con numeri a caso
"a seme" (`makeRng`). Restano da sostituire le funzioni matematiche che possono differire di un'inezia
tra browser: `Math.hypot` (→ `Math.sqrt(dx*dx+dy*dy)`), `Math.sin/cos` (→ tabella fissa di direzioni),
`Math.pow(1.1, n)` in `levelMul` (→ moltiplicazioni ripetute). Somma, prodotto e `sqrt` sono identici ovunque.
Un test automatico rigioca partite registrate e controlla che il risultato sia sempre uguale.

Il telefono registra le mosse del giocatore con il numero del passo in cui sono state fatte, e nel ciclo
della battaglia le applica nello stesso ordine in cui le applicherà il server
(mosse del giocatore → mossa del computer → passo).

### 4. Senza internet
Battaglia senza `battaglia_inizia` riuscito = partita "amichevole": si gioca, alla fine compare
"Senza internet: questa partita non dà premi". Bauli, negozio, potenziamenti mostrano "Serve internet".

### 5. Passaggio dai progressi di oggi
I progressi già salvati vengono accettati **una volta** al primo `profilo` del server, ma con dei tetti
(per esempio coppe, gemme e monete entro valori raggiungibili giocando), così chi ha già barato non si
porta dietro tutto. Da quel momento il profilo lo tiene il server.

## Vincoli
- Piano gratuito Supabase: Edge Functions incluse; la chiave segreta (service role) resta solo dentro
  Supabase, la funzione la legge dalle sue variabili.
- Pubblicazione della funzione con la riga di comando di Supabase: l'utente fa una volta
  `npx supabase login` (si apre il browser), poi la pubblico io.
- Privacy: nessun dato nuovo oltre a quelli di gioco; la tabella `battaglie` si svuota da sola dopo 30 giorni.

## Lasciato a chi costruisce
- Dove esattamente tagliare il profilo e i nomi delle azioni.
- I valori dei tetti per il passaggio.
- Il margine di tempo nel controllo della durata.

## Ordine di lavoro proposto
1. Motore identico ovunque (sostituzioni matematiche + test di rigioco).
2. Registrazione delle mosse nel telefono + rigioco in Node (test).
3. Funzione del server con le azioni economiche + regole del database in sola lettura.
4. Battaglie verificate (`battaglia_inizia` / `battaglia_fine`).
5. Gioco collegato alla funzione, modalità senza internet, passaggio dei progressi.
6. Prove di attacco (provare a barare con le richieste dirette) come per le altre parti.
