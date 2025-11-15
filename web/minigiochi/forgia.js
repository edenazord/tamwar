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

const SYMBOLS = ['⚔️', '🛡️', '⚡', '🔥'];
let roleA = 'collect', roleB = 'collect';
let collectA = 0, forgeA = 0, deliverA = 0;
let collectB = 0, forgeB = 0, deliverB = 0;
let timeLeft = 120;
let lastClick = 0;
let patternActive = false;
let currentPattern = [];
let patternInput = [];

const btnRoleA = document.getElementById('btnRoleA');
const btnRoleB = document.getElementById('btnRoleB');
const btnActionA = document.getElementById('btnActionA');
const btnActionB = document.getElementById('btnActionB');
const roleAEl = document.getElementById('roleA');
const roleBEl = document.getElementById('roleB');
const collectAEl = document.getElementById('collectA');
const collectBEl = document.getElementById('collectB');
const forgeAEl = document.getElementById('forgeA');
const forgeBEl = document.getElementById('forgeB');
const deliverAEl = document.getElementById('deliverA');
const deliverBEl = document.getElementById('deliverB');
const patternZone = document.getElementById('patternZone');
const patternDisplay = document.getElementById('patternDisplay');
const patternInputEl = document.getElementById('patternInput');
const timerEl = document.getElementById('timer');
const nameAEl = document.getElementById('nameA');
const nameBEl = document.getElementById('nameB');

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

function updateCounters(){
  if (collectAEl) collectAEl.textContent = collectA;
  if (collectBEl) collectBEl.textContent = collectB;
  if (forgeAEl) forgeAEl.textContent = forgeA;
  if (forgeBEl) forgeBEl.textContent = forgeB;
  if (deliverAEl) deliverAEl.textContent = deliverA;
  if (deliverBEl) deliverBEl.textContent = deliverB;
  
  const roles = { collect: 'Raccolta', forge: 'Forgia', deliver: 'Consegna' };
  if (roleAEl) roleAEl.textContent = `Ruolo: ${roles[roleA]}`;
  if (roleBEl) roleBEl.textContent = `Ruolo: ${roles[roleB]}`;
}

function triggerPattern(team, callback){
  if (patternActive) return;
  patternActive = true;
  patternZone.style.display = 'block';
  currentPattern = [];
  patternInput = [];
  
  // Genera pattern di 3 simboli
  for (let i = 0; i < 3; i++) {
    currentPattern.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
  }
  
  // Mostra pattern
  patternDisplay.innerHTML = currentPattern.map(s => 
    `<div style="font-size: 32px; padding: 8px; background: #0f172a; border-radius: 8px;">${s}</div>`
  ).join('');
  
  // Pulisci input
  patternInputEl.innerHTML = SYMBOLS.map((s, i) => 
    `<button class="btn" onclick="window.selectPatternSymbol(${i})" style="font-size: 24px; padding: 8px 12px;">${s}</button>`
  ).join('');
  
  window.selectPatternSymbol = (index) => {
    if (patternInput.length >= 3) return;
    patternInput.push(SYMBOLS[index]);
    
    patternInputEl.innerHTML = patternInput.map(s => 
      `<div style="font-size: 32px; padding: 8px; background: #0f172a; border-radius: 8px;">${s}</div>`
    ).join('') + SYMBOLS.map((s, i) => 
      `<button class="btn" onclick="window.selectPatternSymbol(${i})" style="font-size: 24px; padding: 8px 12px;">${s}</button>`
    ).join('');
    
    if (patternInput.length >= 3) {
      const match = patternInput.every((s, i) => s === currentPattern[i]);
      setTimeout(() => {
        patternZone.style.display = 'none';
        patternActive = false;
        callback(match);
      }, 500);
    }
  };
}

function performAction(team, role, patternSuccess){
  if (role === 'collect') {
    const amount = patternSuccess ? 2 : 1;
    if (team === 'A') collectA += amount;
    else collectB += amount;
  } else if (role === 'forge') {
    if (team === 'A' && collectA > 0) {
      collectA--;
      forgeA++;
    } else if (team === 'B' && collectB > 0) {
      collectB--;
      forgeB++;
    }
  } else if (role === 'deliver') {
    if (team === 'A' && forgeA > 0) {
      forgeA--;
      deliverA++;
    } else if (team === 'B' && forgeB > 0) {
      forgeB--;
      deliverB++;
    }
  }
  updateCounters();
}

if (btnRoleA) btnRoleA.addEventListener('click', () => {
  if (!matchRunning || MY_TEAM !== 'A') return;
  const roles = ['collect', 'forge', 'deliver'];
  const current = roles.indexOf(roleA);
  roleA = roles[(current + 1) % roles.length];
  updateCounters();
});

if (btnRoleB) btnRoleB.addEventListener('click', () => {
  if (!matchRunning || MY_TEAM !== 'B') return;
  const roles = ['collect', 'forge', 'deliver'];
  const current = roles.indexOf(roleB);
  roleB = roles[(current + 1) % roles.length];
  updateCounters();
});

if (btnActionA) btnActionA.addEventListener('click', () => {
  if (!matchRunning || MY_TEAM !== 'A') return;
  const now = performance.now();
  if (now - lastClick < 500) return;
  lastClick = now;
  
  if (roleA === 'forge' && Math.random() < 0.4) {
    triggerPattern('A', (success) => {
      performAction('A', roleA, success);
    });
  } else {
    performAction('A', roleA, false);
  }
});

if (btnActionB) btnActionB.addEventListener('click', () => {
  if (!matchRunning || MY_TEAM !== 'B') return;
  const now = performance.now();
  if (now - lastClick < 500) return;
  lastClick = now;
  
  if (roleB === 'forge' && Math.random() < 0.4) {
    triggerPattern('B', (success) => {
      performAction('B', roleB, success);
    });
  } else {
    performAction('B', roleB, false);
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
  btnActionA.disabled = true;
  btnActionB.disabled = true;
  btnRoleA.disabled = true;
  btnRoleB.disabled = true;
  
  const winner = deliverA > deliverB ? 'A' : (deliverB > deliverA ? 'B' : null);
  
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
    box.innerHTML = `<h2 style="margin:0 0 6px">Più equipaggiamenti!</h2><div class="subtitle">Vince ${name}</div><div class="meta" style="margin-top: 8px;">${deliverA} vs ${deliverB}</div>`;
  } else {
    box.innerHTML = `<h2 style="margin:0 0 6px">Pareggio!</h2><div class="subtitle">Produzione equilibrata</div>`;
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
updateCounters();

