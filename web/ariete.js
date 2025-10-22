const bar = document.getElementById('bar');
const btnAction = document.getElementById('btnAction');
const nameEl = document.getElementById('teamName');
// HUD refs
const hud = {
  bestOf: document.getElementById('hudBestOf'),
  rushIndex: document.getElementById('hudRushIndex'),
  seriesA: document.getElementById('hudSeriesA'),
  seriesB: document.getElementById('hudSeriesB'),
  rushA: document.getElementById('hudRushA'),
  rushB: document.getElementById('hudRushB'),
  mgPerRush: document.getElementById('hudMgPerRush'),
  aName: document.getElementById('hudAName'),
  bName: document.getElementById('hudBName'),
  rushAName: document.getElementById('hudRushAName'),
  rushBName: document.getElementById('hudRushBName'),
};

function getParams(){
  const p = new URLSearchParams(location.search);
  return { match: p.get('match') || null };
}
const params = getParams();
if (params.match && window.GameState) GameState.setCurrentMatch(params.match);
const teamName = sessionStorage.getItem('teamName');
if (nameEl && teamName) nameEl.textContent = `Re: ${teamName}`;

function renderHud(){
  if (!window.GameState) return;
  const s = GameState.getSeries();
  const str = GameState.getStreamers();
  if (hud.bestOf) hud.bestOf.textContent = `BO${s.bestOf}`;
  if (hud.rushIndex) hud.rushIndex.textContent = s.rushIndex;
  if (hud.seriesA) hud.seriesA.textContent = s.rushWins.A || 0;
  if (hud.seriesB) hud.seriesB.textContent = s.rushWins.B || 0;
  if (hud.rushA) hud.rushA.textContent = s.minigameWins.A || 0;
  if (hud.rushB) hud.rushB.textContent = s.minigameWins.B || 0;
  if (hud.mgPerRush) hud.mgPerRush.textContent = s.minigamesPerRush || 3;
  const aN = str?.A?.name || 'Re A';
  const bN = str?.B?.name || 'Re B';
  if (hud.aName) hud.aName.textContent = aN;
  if (hud.bName) hud.bName.textContent = bN;
  if (hud.rushAName) hud.rushAName.textContent = aN;
  if (hud.rushBName) hud.rushBName.textContent = bN;
}
renderHud();

let pos = 50; // 0 = difesa, 100 = attacco
let lastClick = 0; // anti-autoclicker 50ms

function setPos(p) {
  pos = Math.max(0, Math.min(100, p));
  bar.style.width = `${pos}%`;
}

btnAction.addEventListener('click', () => {
  const now = performance.now();
  if (now - lastClick < 50) return; // blocco 50ms
  lastClick = now;
  setPos(pos + 0.6); // spinta fissa per click
});

if (window.Hud) Hud.render();
