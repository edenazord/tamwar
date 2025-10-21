# Re & Esercito — Prototipo Web

Questo prototipo è statico. Se apri i file con `file://` il browser può bloccare script/CSS per CORS. Usa un piccolo server HTTP locale.

Avvio rapido (uno a scelta)
- Python 3: `python -m http.server 5173`
- Node (serve): `npx serve -l 5173 .`
- VS Code Live Server: estensione → "Open with Live Server"

Poi apri: `http://localhost:5173/web/index.html`

Struttura
- `web/` — pagine statiche del prototipo
- `docs/` — design e specifiche
- `img/` — asset demo

Note
- Login Twitch è mock (solo demo). In produzione sostituire con OAuth.
- Le pagine `ariete.html` e `carica.html` usano simulazione locale. Integrazione realtime via WebSocket da aggiungere.
