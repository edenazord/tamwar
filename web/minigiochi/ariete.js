const bar = document.getElementById('bar');
const btnPush = document.getElementById('btnPush');
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

let pos = 50; // 0 = Castello A assediato (vince B), 100 = Castello B assediato (vince A)
let lastClick = 0; // anti-autoclicker 50ms

function setPos(p) {
  pos = Math.max(0, Math.min(100, p));
  bar.style.width = `${pos}%`;
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
// Hint iniziale
updateHint(MY_TEAM);

btnPush.addEventListener('click', () => {
  const now = performance.now();
  if (now - lastClick < 50) return; // blocco 50ms
  lastClick = now;
  const team = (MY_TEAM === 'A' || MY_TEAM === 'B') ? MY_TEAM : 'A';
  // Trasforma in movimento della barra: A spinge a destra, B a sinistra
  const step = 0.8; // intensità per click (tunabile)
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
  // Registra vittoria locale per la serie
  try { window.GameState?.recordMinigameWin?.(winner); } catch(e){}
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
}

// Osserva i cambi di posizione ed esegue check vittoria
new MutationObserver(checkWin).observe(bar, { attributes: true, attributeFilter: ['style'] });
