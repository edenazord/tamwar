const bar = document.getElementById('bar');
const btnAction = document.getElementById('btnAction');
const nameEl = document.getElementById('teamName');

const teamName = sessionStorage.getItem('teamName');
if (nameEl && teamName) nameEl.textContent = `Re: ${teamName}`;

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
