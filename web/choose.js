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

if (cardA && cardB) {
  const aImg = cardA.querySelector('img.avatar');
  const bImg = cardB.querySelector('img.avatar');
  const aH2 = cardA.querySelector('h2');
  const bH2 = cardB.querySelector('h2');
  setImageRobust(aImg, imgA);
  setImageRobust(bImg, imgB);
  aH2.textContent = decodeURIComponent(basename(imgA));
  bH2.textContent = decodeURIComponent(basename(imgB));
}

const cards = document.querySelectorAll('.card[data-team]');
for (const c of cards) {
  c.addEventListener('click', () => {
    const team = c.getAttribute('data-team');
    const name = c.querySelector('h2')?.textContent || team;
    const img = c.querySelector('img.avatar')?.getAttribute('src');
    sessionStorage.setItem('team', team);
    sessionStorage.setItem('teamName', name);
    sessionStorage.setItem('teamImg', img || '');
    window.location.href = 'ariete.html';
  });
}
