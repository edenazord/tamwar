const team = sessionStorage.getItem('team') || 'A';
const teamName = document.getElementById('teamName');
const btnCharge = document.getElementById('btnCharge');
const feed = document.getElementById('feed');
const canvas = document.getElementById('curve');
const ctx = canvas.getContext('2d');

teamName.textContent = `Re ${team}`;
if (window.Hud) Hud.start(1000);
let wave = 1;
let pressed = false;
let windowStart = 0;
let windowEnd = 0;
let density = new Array(20).fill(0);

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
  // distribuzione casuale con picco vicino alla finestra
  const bucket = Math.floor(Math.random()*density.length);
  density[bucket] += Math.random() < 0.7 ? 2 : 0.5;
  draw();
}
setInterval(simulateCrowd, 60);

btnCharge.addEventListener('click', () => {
  if (pressed) return; pressed = true;
  // mappa click in un bucket temporale
  const t = 2000; // ms
  const when = Math.floor(Math.random()*t); // demo: random
  const bucket = Math.min(density.length-1, Math.floor((when/2500)*density.length));
  density[bucket] += 10; // contributo locale
  draw();
  feed.prepend(Object.assign(document.createElement('div'), { textContent: 'Carica!' }));
});

setInterval(() => {
  wave++;
  document.getElementById('wave').textContent = `Ondata ${wave}`;
  newWave();
}, 3500);

newWave();
