# Minigiochi “Re & Esercito” — Design per grandi chat (20–30k)

Obiettivo: minigiochi rapidi, spettacolari e robusti, dove lo streamer è il Re e gli spettatori sono l’esercito. Tutte le azioni avvengono sul nostro sito (web‑only). Ogni gioco include: meccaniche, input (UI/QTE), punteggio, anti‑sabotaggio e scalabilità.

Linee guida comuni
- Finestra temporale: processiamo gli input in finestre da 250–500 ms e li applichiamo come “tick” di gioco (fluidità senza overload).
- Ponderazione: le prime azioni di ogni utente pesano di più, poi rendimento decrescente (anti‑spam). Unicità > volume.
- Rate limit: 1 azione/2–3 s/utente, massimo 20/min; cooldown visibile in overlay.
- Anti‑bot: pattern umano, limiti per account nuovi, challenge soft sull’overlay (click QTE).
- Load shedding: in overload, contiamo solo utenti unici per finestra e stimiamo il totale (campionamento), mantenendo l’esperienza stabile.

---

## 1) Corteo dei Banditori (Tamburi & Trombe) — “Chi spinge più eco”
Fantasia
- Due eserciti mandano banditori per diffondere un editto del Re. L’eco più forte conquista la piazza.

Come funziona
- Ogni utente autenticato entra nella pagina del match e sceglie la squadra (o usa un invito firmato del proprio Re).
- Nella pagina compaiono Tamburi e Trombe: battere il tamburo (QTE ritmo) e suonare la tromba (QTE timing) genera “eco”.
- Il punteggio combina: (a) azioni uniche per finestra, (b) QTE riuscite, (c) sessioni attive > X s (anti‑bot).
- Durata round: 60–90 s.

Input
- UI pagina: pulsanti “Tamburo” (ritmo) e “Tromba” (timing) con mini‑QTE.

Punteggio e vittoria
- Score = Azioni_uniche *1 + QTE_ok *3 + Sessioni_attive *1. Diminishing returns sullo stesso utente.
- Vince chi ha lo score più alto allo scadere.

Anti‑sabotaggio
- Inviti firmati per squadra/round; azioni conteggiate una volta per utente/finestra (con device+IP+sessione a supporto anti‑abuso).
- Azioni ripetute sotto il cooldown non aggiungono punteggio.

Scalabilità (20–30k)
- Aggregazione in finestre da 250–500 ms per azioni/QTE. Redis per contatori; stima su campione se >10k eventi/s.
- Dashboard in overlay con solo numeri normalizzati e barra di contesa.

Varianti
- “Banditore d’Oro”: pochi (VIP) hanno un bottone che vale x5, con cooldown lungo.

---

## 2) Torre dei Mattoni (Stack & Balance)
Fantasia
- Ogni spettatore è un mattone della torre del proprio Re. Chi costruisce più in alto senza farla crollare vince.

Come funziona
- Ogni utente che si collega all’overlay diventa un mattone (colore/casata). La torre cresce a strati in finestra temporale.
- La stabilità dipende dall’allineamento: piccoli QTE di posizionamento (click in zona) e “formazioni” chiamate dai Generali.
- Sabotatori possono soffiare “Vento” (pochi gettoni) per far oscillare la torre avversaria.

Input
- UI pagina: click per posizionare il proprio mattone (finestra 3–5 s). Mini‑QTE per allineamento perfetto (+stabilità). Scelta formazione tramite pulsanti (Falange/Cuneo) con cooldown globali.

Punteggio e vittoria
- Altezza massima raggiunta entro 90–120 s o fino a crollo. Tiebreaker: stabilità residua.

Anti‑sabotaggio
- Vento/corvi richiedono token limitati per squadra; token generati dal Re o da obiettivi interni (non venduti).
- Collisioni fisiche simulate a livello di strato (batch), non per singolo mattone, per evitare griefing mirato.
- Pesa l’unicità dei partecipanti per strato, non il numero di click.

Scalabilità
- Simulazione per “layer” (es. 50–200 mattoni per tick) invece che per utente. I mattoni in eccesso vengono “fusi” in blocchi multipli.
- Render semplificato in overlay: si mostrano solo i bordi e i nomi top contributors.

Varianti
- “Campane della Cattedrale”: altezze soglia suonano fanfare e danno buff temporanei.

---

## 3) Forgia Reale (Raccolta → Craft → Consegna)
Fantasia
- L’esercito deve forgiare armi e scudi per la battaglia. La squadra più efficiente nella catena di montaggio prevale.

Come funziona
- Tre fasi simultanee: Raccolta (QTE veloci), Forgia (pattern matching), Consegna (timing). L’utente sceglie il ruolo nell’UI.
- I Generali possono spostare quote di popolazione tra le fasi per bilanciare colli di bottiglia.

Input
- UI pagina: selettore ruolo (Raccolta/Forgia/Consegna) con cooldown e mini‑giochi (click, swipe, pattern di 3 simboli). I successi alimentano il contatore di output.

Punteggio e vittoria
- Punti per equipaggiamento completo prodotto; combo perfette danno bonus morale.
- Vince chi consegna più set entro 2 minuti.

Anti‑sabotaggio
- “Impurità” (sabotaggio) disponibili con pochi token: riducono l’efficienza forni per 5 s, ma si curano con QTE “Raffredda”.
- Rate‑limit sulle rotazioni di ruolo per evitare thrash.

Scalabilità
- Ogni fase aggrega successi per finestra e applica throughput limit. La UI mostra code e suggerisce spostamenti.

Varianti
- “Editto del Re”: boost temporaneo a una fase (una volta per match).

---

## 4) Carica della Cavalleria (Timing Massivo)
Fantasia
- Il Re ordina la carica. La squadra deve sincronizzarsi: più perfetto è il timing, più devastante l’urto.

Come funziona
- Parte un conto alla rovescia segreto per ciascuna squadra (± jitter). Gli utenti devono premere “Carica!” in una finestra ottimale.
- Il danno dipende dalla densità di click nel picco e dalla precisione (deviazione standard bassa = colpo perfetto).

Input
- UI pagina: tasto “Carica” con indicatore ritmico (imperfetto). 1 pressione per ondata per utente.

Punteggio e vittoria
- 3–5 ondate; vince chi accumula danno totale maggiore.

Anti‑sabotaggio
- “Caltrop” (sabotaggio): riducono l’aderenza in un burst di 2 s ma consumano token scarsi.
- Click fuori finestra non rimuovono punti, semplicemente non contribuiscono.

Scalabilità
- Bucket di istogramma tempo (10–20 bucket) per contare picchi; niente tracking per utente.
- Render in overlay con curva densità, non con singoli click.

Varianti
- “Tromba Reale” sposta avanti/indietro la finestra ottimale di 300 ms per confondere l’avversario.

---

## 5) Assedio all’Ariete (Push & Hold)
Fantasia
- L’esercito spinge l’ariete verso il portone, i difensori alzano griglie e versano pece. Tira e molla in 1v1.

Come funziona
- Ariete con posizione su binario. Ogni finestra di 500 ms: spinta attaccanti – resistenza difensori = delta posizione.
- Eventi: “Pece Bollente” (difesa, rallenta), “Scudi” (attacco, riduce danni ambientali).

Input
- UI pagina: pulsante grande “Spingi” (attaccanti) o “Resisti” (difensori) con cooldown per utente. QTE “Colpo dell’Ariete” ogni 15–20 s per burst.

Punteggio e vittoria
- 2–3 round da 60–90 s; si vince sfondando la porta o tenendo la posizione.

Anti‑sabotaggio
- Il contributo per utente ha decay forte; spam non conviene. I bot non superano il filtro di ritmo umano.
- “Acqua negli ingranaggi” (sabotaggio) applica attrito per 3 s ma richiede coordinazione (QTE difesa per purgare).

Scalabilità
- Aggregazione per finestra, con peso = min(1, log(1+azioni_utente)).
- Eventi limitati (max 1 attivo per tipo) per evitare burst ingest ingestibili.

Varianti
- “Porta Debole”: zona di vulnerabilità che raddoppia il danno se QTE perfetto.

---

## 6) Volée di Emote (Archi vs Scudi)
Fantasia
- Gli arcieri scagliano volée (emote/keyword), i fanti alzano scudi. Scontro di ritmo e copertura.

Come funziona
- Due set di “emblemi” (icone/parole) per squadra (3–5 ciascuna). Gli utenti compongono sequenze corrette nell’UI; le coperture devono precedere le volée.
- Precisione di sequenza e varietà di emblemi aumentano l’efficacia.

Input
- UI pagina: selezione rapida di icone/parole da una tastiera virtuale; il “meteo” (vento/pioggia) modifica la difficoltà e i moltiplicatori.

Punteggio e vittoria
- Punti = sequenze corrette uniche per utente (no ripetizioni ravvicinate) * moltiplicatori da meteo e timing.
- 3 ondate; vince chi accumula più danno netto.

Anti‑sabotaggio
- Sequenze sbagliate non tolgono punti, ma aumentano il “caos” che riduce momentaneamente i moltiplicatori della squadra (cap a −20%).
- Flood oltre rate limit non entra nel conteggio.

Scalabilità
- Parser di sequenza per finestra con dizionario pre‑compilato; conteggio per utente unico per ondata.

Varianti
- “Fuoco Greco”: ultimate rara del Re, una sola volta.

---

## Anti‑sabotaggio generale (riassunto)
- Token di sabotaggio scarsi, visibili e contrastabili con QTE (counter‑play). Mai negativi illimitati.
- Pesi per utente con decay; unicità sopra volume.
- Rate limit server‑side + calm mode automatico se il ritmo supera la soglia.
- Inviti e azioni firmati per round/squadra. Logger per audit post‑match.

## Strumenti tecnici consigliati
- Identity: OAuth Twitch (Twitch‑only) per autenticare gli utenti.
- Realtime: WebSocket (Socket.IO/Colyseus); Redis per contatori e rate‑limit; Postgres per match e profili.
- Rendering: Web (React + Canvas/WebGL). Grafica semplice, focus su barre, istogrammi e QTE.

## Durate suggerite
- Round brevi: 60–90 s con 10–20 s di intermezzo. Best‑of‑3 per match.

## Note legali/ToS
- Evitare incentivi allo spam. Contare azioni uniche/finestre e sequenze corrette; tutte le azioni avvengono sul sito.
