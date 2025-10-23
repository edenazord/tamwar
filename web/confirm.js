(function(){
  function getParams(){ const p = new URLSearchParams(location.search); return { match: p.get('match')||'', token: p.get('token')||'' }; }
  const params = getParams();
  const out = document.getElementById('out');
  const desc = document.getElementById('desc');
  const btnLoginB = document.getElementById('btnLoginB');
  const btnAccept = document.getElementById('btnAccept');

  async function loadInfo(){
    try{
      // Check invite availability first
  const chk = await fetch(`/api/matches/invite-check?id=${encodeURIComponent(params.match)}&token=${encodeURIComponent(params.token)}`);
      if (!chk.ok){
        desc.textContent = 'Invito non valido o già usato.';
        btnLoginB.disabled = true; btnAccept.disabled = true;
        return;
      }
  const s = await (await fetch(`/api/matches/get?id=${encodeURIComponent(params.match)}`)).json();
      if (s.error){ desc.textContent = 'Invito non valido'; return; }
      desc.textContent = `Partita #${s.id} • BO${s.config?.bestOf||3} • ${s.config?.minigamesPerRush||3} minigiochi • Re: ${s.config?.names?.A} vs ${s.config?.names?.B}`;
    } catch(e){ desc.textContent = 'Errore nel recupero dettagli.'; }
  }

  btnLoginB?.addEventListener('click', ()=>{
    sessionStorage.setItem('after_login', location.href);
    Auth.login('B');
  });

  btnAccept?.addEventListener('click', async ()=>{
    const u = Auth.currentUser();
    if (!u || u.role !== 'B'){ out.textContent = 'Effettua il login come Streamer B'; return; }
    try{
  const r = await (await fetch(`/api/matches/accept`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: params.match, token: params.token, b: { id: u.id, name: u.display_name } }) })).json();
      if (!r || !r.ok) { out.textContent = 'Accettazione fallita'; return; }
      out.textContent = 'Accettato! Reindirizzamento alla schermata iniziale…';
      btnAccept.disabled = true;
      // Invalida subito l'invito a livello UI
      desc.textContent = 'Invito consumato. Puoi chiudere questa pagina.';
      setTimeout(()=>{ window.location.replace(`index.html?match=${encodeURIComponent(params.match)}`); }, 800);
    } catch(e){ out.textContent = 'Errore di rete'; }
  });

  // Enable accept if logged
  function checkLogin(){ const u = Auth.currentUser(); if (u && u.role==='B') btnAccept.disabled = false; }
  checkLogin();
  loadInfo();
})();
