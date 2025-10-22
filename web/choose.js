// immagini streamer disponibili (caricate staticamente)
const STREAMERS = [
  'blur.png','flokox.png','lollolacustre.png','marza.png','merrino.png','moccia.png','rosso.png','zano.png'
];

function pickTwo(arr) {
  const a = Math.floor(Math.random()*arr.length);
  let b = Math.floor(Math.random()*arr.length);
  if (b===a) b = (b+1) % arr.length;
  return [arr[a], arr[b]];
}

function basename(p){ return p.replace(/\.[^.]+$/, ''); }

const [imgA, imgB] = pickTwo(STREAMERS);
const params = new URLSearchParams(location.search);
const matchId = params.get('match');
const cardA = document.querySelector('.card[data-team="A"]');
const cardB = document.querySelector('.card[data-team="B"]');

function setImageRobust(imgEl, filename) {
  const BASES = [
    // Nuova posizione: assets/img
    '../assets/img/streamer/', '../assets/img/',
    '/assets/img/streamer/', '/assets/img/',
    './assets/img/streamer/', './assets/img/',
    // Compat (se il server è avviato dalla root precedente)
    '../img/streamer/', '../img/',
    '/img/streamer/', '/img/',
    './img/streamer/', './img/'
  ];
  const placeholder = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='%2306b6d4'/><stop offset='1' stop-color='%238b5cf6'/></linearGradient></defs><rect width='640' height='360' fill='url(%23g)'/></svg>";
  let idx = 0;
  imgEl.style.opacity = '0';
  const onload = () => {
    requestAnimationFrame(() => { imgEl.classList.add('fade-in'); imgEl.style.opacity = '1'; });
    imgEl.removeEventListener('load', onload);
  };
  imgEl.addEventListener('load', onload);
  const tryNext = () => {
    if (idx < BASES.length) {
      const src = BASES[idx++] + filename;
      imgEl.src = src;
    } else {
      imgEl.src = placeholder;
    }
  };
  imgEl.onerror = tryNext;
  tryNext();
}

async function refreshNav() {
  if (!matchId) return;
  try {
    const res = await fetch(`/api/state?match=${encodeURIComponent(matchId)}`);
    if (!res.ok) return;
    const data = await res.json();
  const elBest = document.getElementById('navBestOf');
  const elRush = document.getElementById('navRushIndex');
  const elAlA = document.getElementById('navAlA');
  const elAlB = document.getElementById('navAlB');
  const elWA = document.getElementById('navWinsA');
  const elWB = document.getElementById('navWinsB');
  const elId = document.getElementById('navMatchId');
  if (elId) { elId.textContent = matchId.slice(0,8); }
  if (elBest) elBest.textContent = `BO${data.config.bestOf}`;
  if (elRush) elRush.textContent = String(data.rushIndex);
  if (elAlA) elAlA.textContent = String(data.allegiance.A || 0);
  if (elAlB) elAlB.textContent = String(data.allegiance.B || 0);
  if (elWA) elWA.textContent = String(data.rushWins.A || 0);
  if (elWB) elWB.textContent = String(data.rushWins.B || 0);
  } catch {}
}

if (cardA && cardB) {
  const aImg = cardA.querySelector('img.avatar');
  const bImg = cardB.querySelector('img.avatar');
  const aH2 = cardA.querySelector('h2');
  const bH2 = cardB.querySelector('h2');
  setImageRobust(aImg, imgA);
  setImageRobust(bImg, imgB);
  aH2.textContent = decodeURIComponent(basename(imgA));
  bH2.textContent = decodeURIComponent(basename(imgB));
  // Persist streamer meta for HUDs
  if (window.GameState) {
    GameState.setStreamers({
      A: { name: aH2.textContent, img: aImg.getAttribute('src') || '' },
      B: { name: bH2.textContent, img: bImg.getAttribute('src') || '' },
    });
    // Render counters
    // Counters will be API driven if matchId is present
    if (!matchId) {
      const counts = GameState.getAllegiance();
      const aCountEl = cardA.querySelector('[data-count="A"]');
      const bCountEl = cardB.querySelector('[data-count="B"]');
      if (aCountEl) aCountEl.textContent = counts.A ?? 0;
      if (bCountEl) bCountEl.textContent = counts.B ?? 0;
    } else {
      refreshNav();
      setInterval(refreshNav, 2000);
    }
  }
}

const cards = document.querySelectorAll('.card[data-team]');
for (const c of cards) {
  c.addEventListener('click', async () => {
    const team = c.getAttribute('data-team');
    const name = c.querySelector('h2')?.textContent || team;
    const img = c.querySelector('img.avatar')?.getAttribute('src');
    if (matchId && (team==='A' || team==='B')) {
      try { await fetch(`/api/allegiance?match=${encodeURIComponent(matchId)}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ team })}); } catch {}
    } else if (window.GameState && (team==='A' || team==='B')) {
      GameState.incrementAllegiance(team);
    }
    sessionStorage.setItem('team', team);
    sessionStorage.setItem('teamName', name);
    sessionStorage.setItem('teamImg', img || '');
    const to = matchId ? `ariete.html?match=${encodeURIComponent(matchId)}` : 'ariete.html';
    window.location.href = to;
  });
}
