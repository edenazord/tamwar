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

async function resolveStreamerNames(){
  // 1) Se passati via query, usa quelli
  if (params.nameA || params.nameB){
    return {
      a: params.nameA || 'Streamer A',
      b: params.nameB || 'Streamer B'
    };
  }
  // 2) Se c'è un match, leggi dal server
  if (params.match){
    try {
      const res = await fetch(`/api/matches/get?id=${encodeURIComponent(params.match)}`);
      if (res.ok){
        const s = await res.json();
        const a = s?.config?.names?.A || s?.ownerA?.name || 'Streamer A';
        const b = s?.config?.names?.B || s?.invitedB?.name || 'Streamer B';
        return { a, b };
      }
    } catch(e){}
  }
  // 3) Fallback
  return { a: 'Streamer A', b: 'Streamer B' };
}

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
  (async () => {
    const names = await resolveStreamerNames();
    aH2.textContent = names.a;
    bH2.textContent = names.b;
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
      GameState.setStreamers({ A: { name: names.a }, B: { name: names.b } });
      // Render counters
      const counts = GameState.getAllegiance();
      const maxParticipants = GameState.getMaxParticipants ? GameState.getMaxParticipants() : 500;
      const aCountEl = cardA.querySelector('[data-count="A"]');
      const bCountEl = cardB.querySelector('[data-count="B"]');
      if (aCountEl) aCountEl.textContent = `${counts.A ?? 0}/${maxParticipants}`;
      if (bCountEl) bCountEl.textContent = `${counts.B ?? 0}/${maxParticipants}`;
      if (window.Hud) Hud.render();
      
      // Aggiorna contatori periodicamente
      setInterval(() => {
        const updatedCounts = GameState.getAllegiance();
        if (aCountEl) aCountEl.textContent = `${updatedCounts.A ?? 0}/${maxParticipants}`;
        if (bCountEl) bCountEl.textContent = `${updatedCounts.B ?? 0}/${maxParticipants}`;
      }, 2000);
    }
  })();
}

const cards = document.querySelectorAll('.card[data-team]');
for (const c of cards) {
  c.addEventListener('click', async () => {
    const team = c.getAttribute('data-team');
    const name = c.querySelector('h2')?.textContent || team;
    const img = c.querySelector('img.avatar')?.getAttribute('src');
    
    // Controlla il limite prima di permettere l'iscrizione
    if (window.GameState && (team==='A' || team==='B')) {
      const counts = GameState.getAllegiance();
      const maxParticipants = GameState.getMaxParticipants ? GameState.getMaxParticipants() : 500;
      const currentCount = counts[team] || 0;
      
      if (currentCount >= maxParticipants) {
        // Mostra messaggio di limite raggiunto
        const countEl = c.querySelector('[data-count="' + team + '"]');
        const originalText = countEl ? countEl.textContent : '';
        if (countEl) {
          countEl.textContent = 'LIMITE RAGGIUNTO';
          countEl.style.color = '#ef4444';
          countEl.style.animation = 'pulse 0.5s ease';
        }
        
        // Mostra toast/notifica
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.top = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = 'rgba(239, 68, 68, 0.9)';
        toast.style.color = 'white';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '8px';
        toast.style.zIndex = '9999';
        toast.style.fontWeight = '600';
        toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        toast.textContent = `Limite di ${maxParticipants} partecipanti raggiunto per ${name}!`;
        document.body.appendChild(toast);
        
        setTimeout(() => {
          if (countEl) {
            countEl.textContent = originalText;
            countEl.style.color = '';
            countEl.style.animation = '';
          }
          toast.remove();
        }, 3000);
        
        return; // Blocca l'iscrizione
      }
      
      // Incrementa solo se sotto il limite
      const newCount = GameState.incrementAllegiance(team);
      if (window.Hud) Hud.render();
      
      // Aggiorna il contatore visuale
      const countEl = c.querySelector('[data-count="' + team + '"]');
      if (countEl) countEl.textContent = `${newCount}/${maxParticipants}`;
    }
    
    sessionStorage.setItem('team', team);
    sessionStorage.setItem('teamName', name);
    sessionStorage.setItem('teamImg', img || '');
    // Se c'è un match, attendi che sia running prima di entrare nel minigioco
    if (params.match){
      try{
        const r = await fetch(`/api/matches/get?id=${encodeURIComponent(params.match)}`);
        if (r.ok){
          const s = await r.json();
          if (s.status !== 'running'){
            // Rimani su choose per schieramenti, HUD continuerà ad aggiornarsi
            return;
          }
        }
      }catch(e){}
    }
    const qs = params.match ? `?match=${encodeURIComponent(params.match)}` : '';
    window.location.href = 'minigiochi/ariete.html' + qs;
  });
}
  