# Guerra degli Dèi

Battaglie di carte in tempo reale con eroi e mostri della **mitologia greca e romana**,
per telefono, PC e iPad (web app installabile). Ispirato ai giochi di carte in tempo reale,
con personaggi, nomi e grafica originali.

**© 2026 cloudescandi1-dotcom. Tutti i diritti riservati** — vedi [LICENSE](LICENSE) e [privacy](docs/privacy.md).

**Gioca online:** https://cloudescandi1-dotcom.github.io/guerra-degli-dei/

## Stato (28/10/2026)
- ✅ Versione 1.9: **movimenti fluidi**: posizioni calcolate anche tra un passo e l'altro del motore, camminata al ritmo della velocità, rotazione quando cambiano verso, scatto quando attaccano, entrata in campo con caduta e polvere
- ✅ Versione 1.8: supplementari di 2 minuti con orologio rosso e ambrosia ×3 quando mancano 1:30, pannello emoticon con frasi ("Buona fortuna!", "Bella giocata!"…), schermata finale VS con le corone
- ✅ Versione 1.7: battaglia come in Clash: tempo in alto a destra ("Termina tra"), corone sul bordo destro che compaiono alla prima corona, scritta "Nemico"/"Tu" con le corone, "60 secondi restanti" e x2, metà avversaria rossa quando trascini, nome e livello della carta, livelli su torri e truppe, "Succ.:" e "Massimo: 10"
- ✅ Versione 1.6: **Cammino degli Eroi rifatto come il Cammino dei Trofei**: barra delle coppe a sinistra con l'etichetta, premi su piattaforme in rilievo con la spunta, arene come plastici con fascia blu e carte sbloccate, pulsante OK in basso
- ✅ Versione 1.5: **guardiani dei templi** (sacerdotessa arciera sui templi laterali, il Re sul tempio grande che dorme finché non lo attacchi), pubblico fino in cima all'arena, avversario in alto con scudo del livello
- ✅ Versione 1.1: aggiunti **Negozio** (offerte del giorno e gemme), baule del giorno e schede delle arene
- ✅ 22 test automatici superati (motore di gioco, computer, progressione, negozio, clan)
- ✅ Versione 1.4: estetica in stile giochi di carte per telefono, scheda **Eventi** con **Torneo degli Dèi** e Allenamento, **Cammino degli Eroi** (strada dei trofei con premi e arene)
- ✅ Versione 1.3: ogni arena è un **anfiteatro con il pubblico** e un terreno diverso; corone e tempo sul fiume, conto alla rovescia finale, crollo dei templi ben visibile, **cammino dei trofei** con ricompense, bauli ridisegnati
- ✅ Versione 1.2: **nuova grafica** con aspetto 3D (personaggi disegnati con luci e ombre) e campo in prospettiva
- ✅ Diritti d'autore (tutti i diritti riservati) e informativa privacy

## Cosa sa fare
- **Battaglia** di 3 minuti (+2 di supplementari, con ambrosia ×3 quando ne mancano 1:30): abbatti i templi nemici, ogni tempio laterale vale 👑,
  il Tempio del Re vale la vittoria. Ultimo minuto con ambrosia doppia.
- **24 carte**: truppe, costruzioni e incantesimi, di rarità comune, rara, epica e leggendaria
- **7 arene**: Sparta, Labirinto di Creta, Mura di Troia, Isola dei Ciclopi, Colosseo, Inferi di Ade, Monte Olimpo
- **Contro il computer** (classificata con coppe, oppure Allenamento facile/medio/difficile)
- **Progressione**: coppe, bauli che si aprono col tempo, **baule del giorno** (si ricarica a mezzanotte, ora di Roma),
  monete, potenziamento delle carte fino al livello 9, mazzo da 8 carte
- **Negozio**: 6 carte in offerta da comprare con le monete, che cambiano ogni giorno a mezzanotte (ora di Roma);
  con le **gemme** 💎 si comprano bauli e monete o si apre subito un baule. Le gemme non si comprano:
  si trovano (non sempre) nei bauli
- **Arene**: tocca l'arena nella schermata Battaglia per vedere le **ricompense delle coppe** (un premio ogni 50 coppe da ritirare), le carte che sblocca, i bauli e le tue vittorie lì
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
| `src/js/sprites.js` | **Disegni** di personaggi, templi e incantesimi (SVG con luci e ombre) |
| `src/js/render.js` | **Disegno** del campo di battaglia in prospettiva |
| `src/js/sound.js` | Effetti sonori |
| `src/js/app.js` | **Interfaccia**: menu, schede, battaglia, finestre |
| `src/js/peerjs.min.js` | Libreria PeerJS 1.5.4 (licenza MIT) |
| `tests/` | Test automatici |
| `tools/` | Server di prova e generatore di icone |

## Diritti d'autore e privacy
- Il gioco e tutti i suoi contenuti originali (codice, disegni, nomi e testi delle carte) sono di
  **proprietà esclusiva** del titolare: **tutti i diritti riservati**. Il codice è visibile su GitHub
  ma questo non dà a nessuno il permesso di copiarlo o riusarlo. Dettagli in [LICENSE](LICENSE).
- Unico componente di terzi: PeerJS (licenza MIT), vedi [docs/licenze-terze-parti.md](docs/licenze-terze-parti.md).
- Privacy: niente account, cookie, pubblicità o statistiche; i dati restano sul dispositivo.
  Dettagli in [docs/privacy.md](docs/privacy.md) e nel gioco (Impostazioni → Privacy e diritti).
