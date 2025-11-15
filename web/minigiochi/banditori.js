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

const btnDrum = document.getElementById('btnDrum');
const btnHorn = document.getElementById('btnHorn');
const scoreAEl = document.getElementById('scoreA');
const scoreBEl = document.getElementById('scoreB');
const totalAEl = document.getElementById('totalA');
const totalBEl = document.getElementById('totalB');
const qteDrum = document.getElementById('qteDrum');
const qteHorn = document.getElementById('qteHorn');
const timerEl = document.getElementById('timer');
const nameAEl = document.getElementById('nameA');
const nameBEl = document.getElementById('nameB');

let scoreA = 0, scoreB = 0;
let totalA = 0, totalB = 0;
let timeLeft = 60;
let lastClick = 0;
let qteActive = false;

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

function updateScores(){
  if (scoreAEl) scoreAEl.textContent = scoreA;
  if (scoreBEl) scoreBEl.textContent = scoreB;
  if (totalAEl) totalAEl.textContent = totalA;
  if (totalBEl) totalBEl.textContent = totalB;
}

function triggerQTE(type, callback){
  if (qteActive) return;
  qteActive = true;
  const el = type === 'drum' ? qteDrum : qteHorn;
  if (!el) { qteActive = false; callback(false); return; }
  
  el.style.display = 'block';
  el.innerHTML = '<div style="text-align:center; padding: 8px; background: #0b1020; border-radius: 8px;">Premi quando la barra è piena!</div>';
  
  let progress = 0;
  const target = 50 + Math.random() * 50; // 50-100ms
  const start = performance.now();
  
  const interval = setInterval(() => {
    const elapsed = performance.now() - start;
    progress = Math.min(100, (elapsed / target) * 100);
    
    if (el.querySelector('.bar')) {
      el.querySelector('.bar').style.width = `${progress}%`;
    } else {
      el.innerHTML = `<div style="height: 8px; background: #223; border-radius: 4px; overflow: hidden; margin: 8px 0;">
        <div class="bar" style="height: 100%; background: linear-gradient(90deg, #8b5cf6, #22d3ee); width: ${progress}%; transition: width 0.05s;"></div>
      </div>`;
    }
    
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        el.style.display = 'none';
        qteActive = false;
        callback(false);
      }, 200);
    }
  }, 10);
  
  const clickHandler = () => {
    const elapsed = performance.now() - start;
    const accuracy = Math.abs(elapsed - target) / target;
    clearInterval(interval);
    el.style.display = 'none';
    qteActive = false;
    callback(accuracy < 0.3); // Successo se entro 30% del target
    document.removeEventListener('click', clickHandler);
  };
  
  setTimeout(() => {
    document.addEventListener('click', clickHandler, { once: true });
  }, 50);
}

function addScore(type, qteSuccess){
  const team = MY_TEAM || 'A';
  if (!team || (team !== 'A' && team !== 'B')) return; // Solo team validi
  
  const basePoints = 1;
  const qteBonus = qteSuccess ? 3 : 0;
  const points = basePoints + qteBonus;
  
  if (team === 'A') {
    scoreA += points;
    totalA += points;
  } else {
    scoreB += points;
    totalB += points;
  }
  updateScores();
}

if (btnDrum) btnDrum.addEventListener('click', () => {
  if (!matchRunning) return;
  const now = performance.now();
  if (now - lastClick < 200) return;
  lastClick = now;
  
  if (Math.random() < 0.3) { // 30% chance QTE
    triggerQTE('drum', (success) => {
      addScore('drum', success);
    });
  } else {
    addScore('drum', false);
  }
});

if (btnHorn) btnHorn.addEventListener('click', () => {
  if (!matchRunning) return;
  const now = performance.now();
  if (now - lastClick < 200) return;
  lastClick = now;
  
  if (Math.random() < 0.3) { // 30% chance QTE
    triggerQTE('horn', (success) => {
      addScore('horn', success);
    });
  } else {
    addScore('horn', false);
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
  btnDrum.disabled = true;
  btnHorn.disabled = true;
  
  const winner = totalA > totalB ? 'A' : (totalB > totalA ? 'B' : null);
  
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
    box.innerHTML = `<h2 style="margin:0 0 6px">Eco più forte!</h2><div class="subtitle">Vince ${name}</div><div class="meta" style="margin-top: 8px;">${totalA} vs ${totalB}</div>`;
  } else {
    box.innerHTML = `<h2 style="margin:0 0 6px">Pareggio!</h2><div class="subtitle">Eco equilibrato</div>`;
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

