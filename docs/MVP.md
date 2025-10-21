# MVP — Re & Esercito (Assedio + Carica)

Obiettivo: portare in live 2 minigiochi robusti con scelta squadra al login: Assedio all’Ariete (push & hold) e Carica della Cavalleria (timing).

## Onboarding e scelta squadra
- Login: OAuth Twitch (partecipazione Twitch‑only). Alla prima apertura della pagina di gioco sul nostro sito, prompt “Scegli il tuo Re”: Streamer A o B.
- Bilanciamento: nessun bilanciamento artificiale. La forza dello streamer e l’abilità del suo esercito determinano l’esito.
- Cambio squadra: possibile solo tra i match (non durante un round).
- Anti‑multi‑account: non previsto oltre OAuth; contiamo solo utenti autenticati Twitch.

## Minigioco 1 — Assedio all’Ariete (Push & Hold)
- Mappa: portone e binario dell’ariete con 3 checkpoint.
- Input (sul sito):
  - Pulsante grande “Spingi” (attaccanti) o “Resisti” (difensori); 1 azione/3 s per utente, max 20/min.
  - QTE “Colpo dell’Ariete” ogni ~20 s; successo perfetto raddoppia il delta del tick corrente.
  - Poteri del Re tramite UI (streamdeck o pannello): “Tromba Reale” (+25% 10 s) e “Pece Bollente” (−25% 10 s). 1 uso/round ciascuno.
- Tick e punteggio:
  - Ogni 500 ms: delta = F_attacco − F_difesa, con peso per utente = min(1, log(1+azioni_utente)).
  - Checkpoint danno moltiplicatori temporanei (morale +10%).
  - Round da 90 s, Best‑of‑3. Vince chi sfonda o difende con margine.
- Anti‑sabotaggio: token “Acqua negli ingranaggi” (rari) riducono attrito ma si purgano con QTE difesa.

## Minigioco 2 — Carica della Cavalleria (Timing)
- Setup: 3 ondate per match, ciascuna con finestra ottimale 600–900 ms.
- Input (sul sito):
  - Bottone “Carica!” con indicatore ritmico (imperfetto). 1 pressione valida per ondata per utente.
  - Poteri: “Caltrop” (difesa, allarga la finestra sbagliata) vs “Tromba” (attacco, stringe la finestra) — 1 per ondata a squadra, attivabili da Re/Generali.
- Scoring:
  - Costruiamo un istogramma temporale (20 bucket). Danno = peak_density * precision_factor (1 − var_norm).
  - Combo perfetta (var_norm < soglia) attiva “Impatto Travolgente” (+15%).

## Azioni e rate limit (sul sito)
- Per‑utente: 1 azione/3 s (tranne Carica: 1/ondata). Max 20/min. Decay oltre soglia.
- Per‑squadra: calm mode se >N azioni/s (N dinamico). In calm mode campioniamo e stimiamo per proteggere l’infrastruttura (nessun buff/nerf alla squadra in svantaggio).

## API minime
- POST /login (OAuth), GET /me, POST /team/select, GET /match/state, POST /power/use, WS /match/{id}.

## Telemetria e SLO
- Latenza tick < 150 ms p95; perdita eventi < 1% per finestra; errori 5xx < 0.5%.

## UI overlay (wireframe sintetico)
- Header: stendardi A/B, morale, timer round.
- Corpo: (Ariete) binario con posizione, checkpoint e pulsante QTE; (Carica) curva densità e bottone.
- Footer: log ordini del Re, cooldown poteri, indicatori calm mode.

## Roadmap rapida
- Settimana 1: backend mock + overlay base + ingest simulata.
- Settimana 2: hookup OAuth, primi playtest privati, bilanciamento rate.
