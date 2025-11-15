function getParams(){
  const p = new URLSearchParams(location.search);
  return { match: p.get('match') || null };
}
const params = getParams();
if (params.match && window.GameState) GameState.setCurrentMatch(params.match);
const MY_TEAM = sessionStorage.getItem('team'); // 'A' | 'B' | null

let matchRunning = false;
async function pollMatchStatus(){
  if (!params.match) { matchRunning = true; return; }
  try{
    const r = await fetch(`/api/matches/get?id=${encodeURIComponent(params.match)}`);
    if (!r.ok) return;
    const s = await r.json();
    matchRunning = (s && s.status === 'running');
  }catch(e){}
}
pollMatchStatus();
setInterval(pollMatchStatus, 2000);

const btnA = document.getElementById('btnA');
const btnB = document.getElementById('btnB');
const heightAEl = document.getElementById('heightA');
const heightBEl = document.getElementById('heightB');
const countAEl = document.getElementById('countA');
const countBEl = document.getElementById('countB');
const qteZone = document.getElementById('qteZone');
const qteFill = document.getElementById('qteFill');
const qteTarget = document.getElementById('qteTarget');
const btnQTE = document.getElementById('btnQTE');
const timerEl = document.getElementById('timer');
const nameAEl = document.getElementById('nameA');
const nameBEl = document.getElementById('nameB');

let heightA = 0, heightB = 0;
let countA = 0, countB = 0;
let timeLeft = 90;
let lastClick = 0;
let qteActive = false;
let qteTargetPos = 50;
let qteProgress = 0;
let qteDirection = 1;

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
setInterval(applyTeamNames, 2000);

function updateTowers(){
  if (heightAEl) heightAEl.style.height = `${Math.min(100, heightA)}%`;
  if (heightBEl) heightBEl.style.height = `${Math.min(100, heightB)}%`;
  if (countAEl) countAEl.textContent = countA;
  if (countBEl) countBEl.textContent = countB;
}

function triggerQTE(team, callback){
  if (qteActive) return;
  qteActive = true;
  qteZone.style.display = 'block';
  qteTargetPos = 30 + Math.random() * 40; // 30-70%
  qteProgress = 0;
  qteDirection = 1;
  
  if (qteTarget) qteTarget.style.left = `${qteTargetPos}%`;
  
  const interval = setInterval(() => {
    qteProgress += qteDirection * 2;
    if (qteProgress >= 100) { qteProgress = 100; qteDirection = -1; }
    if (qteProgress <= 0) { qteProgress = 0; qteDirection = 1; }
    
    if (qteFill) qteFill.style.width = `${qteProgress}%`;
  }, 20);
  
  btnQTE.onclick = () => {
    const accuracy = Math.abs(qteProgress - qteTargetPos) / 100;
    clearInterval(interval);
    qteZone.style.display = 'none';
    qteActive = false;
    callback(accuracy < 0.15); // Successo se entro 15% del target
  };
}

function addBrick(team, qteSuccess){
  const baseHeight = 3;
  const bonus = qteSuccess ? 5 : 0;
  const height = baseHeight + bonus;
  
  if (team === 'A') {
    heightA += height;
    countA++;
  } else {
    heightB += height;
    countB++;
  }
  updateTowers();
  
  // Controlla crollo (se supera 100%)
  if (heightA > 100 || heightB > 100) {
    endGame();
  }
}

// Mostra solo il bottone del proprio team (se selezionato)
if (btnA && MY_TEAM && MY_TEAM !== 'A') btnA.style.display = 'none';
if (btnB && MY_TEAM && MY_TEAM !== 'B') btnB.style.display = 'none';

if (btnA) btnA.addEventListener('click', () => {
  if (!matchRunning) return;
  if (MY_TEAM && MY_TEAM !== 'A') return; // Solo team A può usare btnA
  const now = performance.now();
  if (now - lastClick < 300) return;
  lastClick = now;
  
  if (Math.random() < 0.25) { // 25% chance QTE
    triggerQTE('A', (success) => {
      addBrick('A', success);
    });
  } else {
    addBrick('A', false);
  }
});

if (btnB) btnB.addEventListener('click', () => {
  if (!matchRunning) return;
  if (MY_TEAM && MY_TEAM !== 'B') return; // Solo team B può usare btnB
  const now = performance.now();
  if (now - lastClick < 300) return;
  lastClick = now;
  
  if (Math.random() < 0.25) { // 25% chance QTE
    triggerQTE('B', (success) => {
      addBrick('B', success);
    });
  } else {
    addBrick('B', false);
  }
});

// Timer
const timerInterval = setInterval(() => {
  timeLeft--;
  if (timerEl) timerEl.textContent = timeLeft;
  
  if (timeLeft <= 0) {
    clearInterval(timerInterval);
    endGame();
  }
}, 1000);

function endGame(){
  btnA.disabled = true;
  btnB.disabled = true;
  
  const winner = heightA > heightB ? 'A' : (heightB > heightA ? 'B' : null);
  
  if (winner) {
    try { window.GameState?.recordMinigameWin?.(winner); } catch(e){}
  }
  
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed'; overlay.style.inset = '0'; overlay.style.background = 'rgba(0,0,0,.7)';
  overlay.style.display = 'flex'; overlay.style.alignItems = 'center'; overlay.style.justifyContent = 'center';
  overlay.style.zIndex = '99';
  
  const box = document.createElement('div');
  box.className = 'card'; box.style.padding = '20px 28px'; box.style.textAlign = 'center';
  const s = window.GameState?.getStreamers ? GameState.getStreamers() : null;
  
  if (winner) {
    const name = winner==='A' ? (s?.A?.name || 'Re A') : (s?.B?.name || 'Re B');
    box.innerHTML = `<h2 style="margin:0 0 6px">Torre più alta!</h2><div class="subtitle">Vince ${name}</div><div class="meta" style="margin-top: 8px;">${Math.round(heightA)}% vs ${Math.round(heightB)}%</div>`;
  } else {
    box.innerHTML = `<h2 style="margin:0 0 6px">Pareggio!</h2><div class="subtitle">Torri equilibrate</div>`;
  }
  
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  
  if (window.MinigameRouter && winner) {
    setTimeout(() => {
      window.MinigameRouter.navigateToNext(winner);
    }, 3000);
  }
}

if (window.Hud) Hud.start(1000);

