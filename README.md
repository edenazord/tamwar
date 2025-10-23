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

## Deploy su Vercel

Questo progetto usa pagine statiche in `web/` e API serverless in `api/` (ESM). Non è necessario alcun build step.

Impostazioni consigliate (Dashboard Vercel → Project → Settings):
- Git → Production Branch: `main`
- General → Build & Output:
	- Framework Preset: `Other`
	- Root Directory: repository root (vuoto)
	- Build Command: lasciato vuoto
	- Output Directory: `web`
	- Node.js Version: 18+
- Environment Variables (se si usa KV):
	- `KV_REST_API_URL`
	- `KV_REST_API_TOKEN`

Routing: il file `vercel.json` instrada prima i file/esecuzioni presenti (API), poi riscrive il resto verso `web/`.

Verifica KV: endpoint di test `GET /api/debug/kv-status`.

### Troubleshooting deploy
- “No Build Output found”: imposta Output Directory a `web` e lascia vuoto Build Command.
- API 404: la funzione esiste? (es. `api/matches/[id].js`). Se esiste, l’errore 404 potrebbe essere dato da record mancante in KV.
- `storage not configured` (503): aggiungi variabili KV in Environment.
- GitHub Pages: non usato. Se presente un workflow Pages, rimuoverlo per evitare conflitti/check rossi.
 