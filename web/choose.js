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

function getParams(){
  const p = new URLSearchParams(location.search);
  return {
    match: p.get('match') || null,
    bo: p.get('bo') ? parseInt(p.get('bo'),10) : null,
    mg: p.get('mg') ? parseInt(p.get('mg'),10) : null,
    nameA: p.get('nameA') || null,
    nameB: p.get('nameB') || null,
    owner: p.get('owner') || null,
  };
}

const params = getParams();
const [imgA, imgB] = pickTwo(STREAMERS);
const cardA = document.querySelector('.card[data-team="A"]');
const cardB = document.querySelector('.card[data-team="B"]');

function setImageRobust(imgEl, filename, onReady) {
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
    if (typeof onReady === 'function') onReady(imgEl.src);
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

if (cardA && cardB) {
  const aImg = cardA.querySelector('img.avatar');
  const bImg = cardB.querySelector('img.avatar');
  const aH2 = cardA.querySelector('h2');
  const bH2 = cardB.querySelector('h2');
  setImageRobust(aImg, imgA, (src)=>{ if (window.GameState) GameState.setStreamers({ A: { img: src } }); if (window.Hud) Hud.render(); });
  setImageRobust(bImg, imgB, (src)=>{ if (window.GameState) GameState.setStreamers({ B: { img: src } }); if (window.Hud) Hud.render(); });
  aH2.textContent = params.nameA || decodeURIComponent(basename(imgA));
  bH2.textContent = params.nameB || decodeURIComponent(basename(imgB));
  // Persist streamer meta for HUDs
  if (window.GameState) {
    // Host detection: only the creator (who has the local token) becomes host
    if (params.match && params.owner) {
      try {
        const key = localStorage.getItem('tamwar_owner_'+params.match);
        if (key && key === params.owner) sessionStorage.setItem('tamwar_host_'+params.match, '1');
        else sessionStorage.removeItem('tamwar_host_'+params.match);
      } catch(e){}
    }
    // Initialize match when arriving with a match param
    if (params.match) {
      GameState.initMatch(params.match, {
        bestOf: params.bo||undefined,
        minigamesPerRush: params.mg||undefined,
      });
    }
    GameState.setStreamers({
      A: { name: aH2.textContent },
      B: { name: bH2.textContent },
    });
    // Render counters
    const counts = GameState.getAllegiance();
    const aCountEl = cardA.querySelector('[data-count="A"]');
    const bCountEl = cardB.querySelector('[data-count="B"]');
    if (aCountEl) aCountEl.textContent = counts.A ?? 0;
    if (bCountEl) bCountEl.textContent = counts.B ?? 0;
    if (window.Hud) Hud.render();
  }
}

const cards = document.querySelectorAll('.card[data-team]');
for (const c of cards) {
  c.addEventListener('click', () => {
    const team = c.getAttribute('data-team');
    const name = c.querySelector('h2')?.textContent || team;
    const img = c.querySelector('img.avatar')?.getAttribute('src');
    if (window.GameState && (team==='A' || team==='B')) {
      GameState.incrementAllegiance(team);
      if (window.Hud) Hud.render();
    }
    sessionStorage.setItem('team', team);
    sessionStorage.setItem('teamName', name);
    sessionStorage.setItem('teamImg', img || '');
    const qs = params.match ? `?match=${encodeURIComponent(params.match)}` : '';
    // Avvia dal nuovo percorso dei minigiochi
    window.location.href = 'minigiochi/ariete.html' + qs;
  });
}
 