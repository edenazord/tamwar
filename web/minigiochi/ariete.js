const bar = document.getElementById('bar');
const btnPush = document.getElementById('btnPush');
const cursor = document.getElementById('cursor');
const hint = document.getElementById('hint');
const nameAEl = document.getElementById('nameA');
const nameBEl = document.getElementById('nameB');

function getParams(){
  const p = new URLSearchParams(location.search);
  return { match: p.get('match') || null };
}
const params = getParams();
if (params.match && window.GameState) GameState.setCurrentMatch(params.match);
// Team scelto su choose.html
const MY_TEAM = sessionStorage.getItem('team'); // 'A' | 'B' | null
let matchRunning = false;

async function pollMatchStatus(){
  if (!params.match) { matchRunning = true; return; } // no gating without match id
  try{
    const r = await fetch(`/api/matches/get?id=${encodeURIComponent(params.match)}`);
    if (!r.ok) return;
    const s = await r.json();
    matchRunning = (s && s.status === 'running');
    // Update hint if blocked
    if (!matchRunning && hint){
      hint.textContent = 'In attesa che lo Streamer A avvii il Rush…';
    }
  }catch(e){}
}
pollMatchStatus();
setInterval(pollMatchStatus, 2000);

let pos = 50; // 0 = Castello A assediato (vince B), 100 = Castello B assediato (vince A)
let lastClick = 0; // anti-autoclicker 50ms

function setPos(p) {
  pos = Math.max(0, Math.min(100, p));
  if (bar) bar.style.width = `${pos}%`;
  if (cursor) cursor.style.left = `${pos}%`;
}

function updateHint(team){
  if (!hint) return;
  if (team === 'A' || team === 'B') {
    hint.textContent = `Hai giurato per ${team}. Premi ripetutamente per assediare il castello avversario!`;
  } else {
    hint.textContent = `Premi ripetutamente per assediare il castello avversario!`;
  }
}

function applyTeamNames(){
  try{
    const s = window.GameState?.getStreamers ? GameState.getStreamers() : null;
    if (s){
      if (nameAEl) nameAEl.textContent = s.A?.name || 'Re A';
      if (nameBEl) nameBEl.textContent = s.B?.name || 'Re B';
    }
  }catch(e){}
}
applyTeamNames();
// Imposta larghezza iniziale
setPos(pos);
// Hint iniziale
updateHint(MY_TEAM);

if (btnPush) btnPush.addEventListener('click', () => {
  if (!matchRunning) return; // gate: rush non iniziato
  const now = performance.now();
  if (now - lastClick < 50) return; // blocco 50ms
  lastClick = now;
  const team = (MY_TEAM === 'A' || MY_TEAM === 'B') ? MY_TEAM : 'A';
  // Trasforma in movimento della barra: A spinge a destra, B a sinistra
  const step = 4; // intensità per click (più visibile)
  setPos(pos + (team === 'A' ? +step : -step));
  // Messaggio contestuale
  updateHint(team);
});

// Tasti scorciatoia: A per Re A, L per Re B
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.key === 'a' || e.key === 'A') { btnPush.click(); }
  if (e.key === 'l' || e.key === 'L') {
    // Simula push per B anche se MY_TEAM è A (per test locale)
    const now = performance.now();
    if (now - lastClick < 50) return;
    lastClick = now;
    setPos(pos - 0.8);
    updateHint('B');
  }
});

// Loop HUD e nomi
if (window.Hud) Hud.start(1000);
setInterval(applyTeamNames, 2000);

// Vittoria quando si raggiunge un estremo
function checkWin() {
  if (pos <= 0) {
    // Castello A assediato -> vince B
    endGame('B');
  } else if (pos >= 100) {
    // Castello B assediato -> vince A
    endGame('A');
  }
}

function endGame(winner){
  // Disabilita input
  btnPush.disabled = true;
  // Overlay semplice
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed'; overlay.style.inset = '0'; overlay.style.background = 'rgba(0,0,0,.7)'; overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center'; overlay.style.zIndex = '99';
  const box = document.createElement('div');
  box.className = 'card'; box.style.padding = '20px 28px'; box.style.textAlign = 'center';
  const s = window.GameState?.getStreamers ? GameState.getStreamers() : null;
  const name = winner==='A' ? (s?.A?.name || 'Re A') : (s?.B?.name || 'Re B');
  box.innerHTML = `<h2 style="margin:0 0 6px">Assedio riuscito!</h2><div class="subtitle">Vince ${name}</div>`;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  
  // Usa il router per navigare al prossimo minigioco
  if (window.MinigameRouter && winner) {
    setTimeout(() => {
      window.MinigameRouter.navigateToNext(winner);
    }, 3000);
  }
}

// Osserva i cambi di posizione ed esegue check vittoria
if (bar) new MutationObserver(checkWin).observe(bar, { attributes: true, attributeFilter: ['style'] });
