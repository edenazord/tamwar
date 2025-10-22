function $(id){ return document.getElementById(id); }
async function post(path, body){
  const res = await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body||{}) });
  if (!res.ok) throw new Error('HTTP '+res.status);
  return res.json();
}

$('btnCreate').addEventListener('click', async () => {
  const bestOf = parseInt($('bestOf').value,10);
  const mg = Math.max(1, Math.min(9, parseInt($('mgPerRush').value,10)||3));
  const nameA = $('nameA').value.trim() || 'Streamer A';
  const nameB = $('nameB').value.trim() || 'Streamer B';
  try {
    const data = await post('/api/createMatch', { bestOf, minigamesPerRush: mg, streamers:{A:{name:nameA}, B:{name:nameB}} });
    const url = new URL(window.location.href);
    const join = `${url.origin}${url.pathname.replace('create.html','')}choose.html?match=${encodeURIComponent(data.matchId)}`;
    const input = $('joinLink');
    input.value = join;
    $('result').style.display = 'block';
    input.select();
    input.setSelectionRange(0, 99999);
    try { document.execCommand('copy'); } catch(e){}
  } catch (e) {
    alert('Errore nella creazione match. Assicurati che il server sia avviato.');
  }
});
