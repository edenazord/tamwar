// Demo login (mock). In produzione: redirect OAuth Twitch.
const btn = document.getElementById('btnLogin');
btn?.addEventListener('click', () => {
  // Simula token e passa a choose
  sessionStorage.setItem('demoUser', JSON.stringify({ id: 'u'+Math.random().toString(36).slice(2), name: 'Viewer', provider: 'twitch' }));
  // usa percorso relativo per evitare 404 su server statici
  window.location.href = 'choose.html';
});
