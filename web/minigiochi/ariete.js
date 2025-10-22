const bar = document.getElementById('bar');
const btnAction = document.getElementById('btnAction');
const nameEl = document.getElementById('teamName');

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
    const s = await (await fetch(`/api/matches/${params.match}`)).json();
    if (s && s.ownerA && s.ownerA.id === u.id) isHost = true;
  }catch(e){}
})();

let pos = 50; // 0 = difesa, 100 = attacco
let lastClick = 0; // anti-autoclicker 50ms

function setPos(p) {
  pos = Math.max(0, Math.min(100, p));
  bar.style.width = `${pos}%`;
}

btnAction.addEventListener('click', () => {
  if (!isHost) return; // solo l'host può dare il via/spingere
  const now = performance.now();
  if (now - lastClick < 50) return; // blocco 50ms
  lastClick = now;
  setPos(pos + 0.6); // spinta fissa per click
});

if (!isHost) {
  // Messaggio di attesa per i non-host
  const note = document.createElement('div');
  note.className = 'subtitle text-center';
  note.style.marginTop = '8px';
  note.textContent = 'In attesa del via dall\'Host…';
  btnAction?.parentElement?.appendChild(note);
  btnAction.disabled = true;
}

if (window.Hud) Hud.start(1000);
