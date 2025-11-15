function getParams(){
  const p = new URLSearchParams(location.search);
  return { match: p.get('match') || null };
}
const params = getParams();
if (params.match && window.GameState) GameState.setCurrentMatch(params.match);
let isHost = params.match ? (sessionStorage.getItem('tamwar_host_'+params.match) === '1') : false;
// Also treat Streamer A (owner) as host if logged via Twitch
(async function(){
  try{
    const u = window.Auth?.currentUser();
    if (!u || !params.match) return;
  const s = await (await fetch(`/api/matches/get?id=${encodeURIComponent(params.match)}`)).json();
    if (s && s.ownerA && s.ownerA.id === u.id) isHost = true;
  }catch(e){}
})();

const btnCharge = document.getElementById('btnCharge');
const feed = document.getElementById('feed');
const canvas = document.getElementById('curve');
const ctx = canvas.getContext('2d');

if (window.Hud) Hud.start(1000);

let wave = 1;
let maxWaves = 3;
let pressed = false;
let windowStart = 0;
let windowEnd = 0;
let density = new Array(20).fill(0);
let scoreA = 0, scoreB = 0;
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

function resize() {
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  draw();
}
window.addEventListener('resize', resize);
resize();

function newWave() {
  pressed = false;
  density.fill(0);
  const base = 2000; // 2s ondata
  const jitter = 300 + Math.random()*300;
  windowStart = base - jitter;
  windowEnd = base - jitter + (600 + Math.random()*300);
  draw();
}

function draw() {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  // grid
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 1;
  for (let i=0;i<=10;i++){ ctx.beginPath(); ctx.moveTo(0, (h/10)*i); ctx.lineTo(w, (h/10)*i); ctx.stroke(); }
  // density curve
  ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i=0;i<density.length;i++){
    const x = (w/(density.length-1))*i;
    const y = h - (h*0.8)*(density[i]/Math.max(1, Math.max(...density)));
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.stroke();
  // window
  ctx.fillStyle = '#8b5cf644';
  const sx = (windowStart/2500)*w, ex = (windowEnd/2500)*w;
  ctx.fillRect(sx, 0, ex-sx, h);
}

function simulateCrowd() {
  // distribuzione casuale con picco vicino alla finestra (mock)
  const bucket = Math.floor(Math.random()*density.length);
  density[bucket] += Math.random() < 0.7 ? 2 : 0.5;
  draw();
}
setInterval(simulateCrowd, 60);

btnCharge.addEventListener('click', () => {
  if (!matchRunning) return;
  if (pressed) return; pressed = true;
  const team = MY_TEAM || 'A';
  // mappa click in un bucket temporale (mock)
  const t = 2000; // ms
  const when = Math.floor(Math.random()*t);
  const bucket = Math.min(density.length-1, Math.floor((when/2500)*density.length));
  const inWindow = when >= windowStart && when <= windowEnd;
  const points = inWindow ? 10 : 2;
  
  if (team === 'A') scoreA += points;
  else scoreB += points;
  
  density[bucket] += points; // contributo locale
  draw();
  if (feed) feed.prepend(Object.assign(document.createElement('div'), { 
    textContent: `Carica! ${inWindow ? '✓' : '✗'}`,
    style: `color: ${inWindow ? '#22c55e' : '#ef4444'}`
  }));
});

const waveInterval = setInterval(() => {
  wave++;
  const waveEl = document.getElementById('wave');
  if (waveEl) waveEl.textContent = `Ondata ${wave}`;
  
  if (wave > maxWaves) {
    clearInterval(waveInterval);
    endGame();
    return;
  }
  
  newWave();
}, 3500);

newWave();

function endGame(){
  btnCharge.disabled = true;
  clearInterval(waveInterval);
  
  const winner = scoreA > scoreB ? 'A' : (scoreB > scoreA ? 'B' : null);
  
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
    box.innerHTML = `<h2 style="margin:0 0 6px">Carica vincente!</h2><div class="subtitle">Vince ${name}</div><div class="meta" style="margin-top: 8px;">${scoreA} vs ${scoreB}</div>`;
  } else {
    box.innerHTML = `<h2 style="margin:0 0 6px">Pareggio!</h2><div class="subtitle">Cariche equilibrate</div>`;
  }
  
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  
  if (window.MinigameRouter && winner) {
    setTimeout(() => {
      window.MinigameRouter.navigateToNext(winner);
    }, 3000);
  }
}
