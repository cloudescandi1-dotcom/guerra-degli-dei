# Guerra degli Dèi

Battaglie di carte in tempo reale con eroi e mostri della **mitologia greca e romana**,
per telefono, PC e iPad (web app installabile). Ispirato ai giochi di carte come Clash Royale,
con personaggi, nomi e grafica tutti nostri.

**Gioca online:** https://cloudescandi1-dotcom.github.io/guerra-degli-dei/

## Stato (27/10/2026)
- ✅ Versione 1.1: aggiunti **Negozio** (offerte del giorno e gemme), baule del giorno e schede delle arene
- ✅ 22 test automatici superati (motore di gioco, computer, progressione, negozio, clan)
- ⏳ Da fare: **rifare la grafica** (ora i personaggi sono emoji su dischi colorati)

## Cosa sa fare
- **Battaglia** di 3 minuti (+1 di supplementari): abbatti i templi nemici, ogni tempio laterale vale 👑,
  il Tempio del Re vale la vittoria. Ultimo minuto con ambrosia doppia.
- **24 carte**: truppe, costruzioni e incantesimi, di rarità comune, rara, epica e leggendaria
- **7 arene**: Sparta, Labirinto di Creta, Mura di Troia, Isola dei Ciclopi, Colosseo, Inferi di Ade, Monte Olimpo
- **Contro il computer** (classificata con coppe, oppure Allenamento facile/medio/difficile)
- **Progressione**: coppe, bauli che si aprono col tempo, **baule del giorno** (si ricarica a mezzanotte, ora di Roma),
  monete, potenziamento delle carte fino al livello 9, mazzo da 8 carte
- **Negozio**: 6 carte in offerta da comprare con le monete, che cambiano ogni giorno a mezzanotte (ora di Roma);
  con le **gemme** 💎 si comprano bauli e monete o si apre subito un baule. Le gemme non si comprano:
  si trovano (non sempre) nei bauli
- **Arene**: toccandone una vedi le tue vittorie e sconfitte lì, i bauli e le carte che sblocca
- **Amici**: codice amico, online/offline, chat, sfide amichevoli in tempo reale
- **Clan**: nome e stemma, chat, richiesta e donazione di carte
- Funziona offline (tranne amici e clan) e si installa sulla schermata Home

## Come funzionano amici e clan (senza server)
I telefoni si collegano **direttamente tra loro** (tecnologia WebRTC, libreria PeerJS gratuita).
Serve solo un piccolo servizio pubblico di PeerJS per "presentarsi". Conseguenze:
- si chatta e si sfida solo chi è online in quel momento;
- i messaggi del clan vengono copiati da ogni membro: chi era offline li riceve
  appena si collega con qualcuno del clan.

## Come provarlo sul PC
```
npm start
```
Poi apri **http://localhost:8080**. Per fermare: `Ctrl+C`.

## Test automatici
```
npm test
```

## Come è fatto
| File | A cosa serve |
|------|--------------|
| `src/js/cards.js` | Le **carte**, le arene, i bauli e le rarità (solo dati) |
| `src/js/engine.js` | Il **motore della battaglia**: movimento, attacchi, torri, incantesimi, fine partita |
| `src/js/bot.js` | Il **computer** avversario (3 livelli) |
| `src/js/profile.js` | **Progressione**: coppe, bauli, potenziamenti, mazzo, dati di amici e clan |
| `src/js/social.js` | **Collegamento tra telefoni** per amici, clan e sfide |
| `src/js/render.js` | **Disegno** del campo di battaglia |
| `src/js/sound.js` | Effetti sonori |
| `src/js/app.js` | **Interfaccia**: menu, schede, battaglia, finestre |
| `src/js/peerjs.min.js` | Libreria PeerJS 1.5.4 (licenza MIT) |
| `tests/` | Test automatici |
| `tools/` | Server di prova e generatore di icone |
