(function(){
  let CURRENT = { id: null, bo: 3, mg: 3 };
  function randId(){ return Math.random().toString(36).slice(2, 8) + '-' + Date.now().toString(36).slice(-4); }
  function val(name){ const el = document.getElementById(name); return el ? el.value.trim() : ''; }
  function getBestOf(){ const els = document.querySelectorAll('input[name="bestof"]'); for (const e of els){ if (e.checked) return parseInt(e.value,10); } return 3; }
  function getParams(){ const p = new URLSearchParams(location.search); return { match: p.get('match')||'' }; }

  const actionLink = document.getElementById('actionLink');
  const out = document.getElementById('out');
  const linkLabel = document.getElementById('linkLabel');
  const prePanel = document.getElementById('prestartPanel');
  const preImgA = document.getElementById('preImgA');
  const preImgB = document.getElementById('preImgB');
  const preNameA = document.getElementById('preNameA');
  const preNameB = document.getElementById('preNameB');
  const preCountA = document.getElementById('preCountA');
  const preCountB = document.getElementById('preCountB');
  const startBox = document.getElementById('startBox');
  const btnStart = document.getElementById('btnStart');
  const btnWaiting = document.getElementById('btnWaiting');
  const btnAccepted = document.getElementById('btnAccepted');
  const preCardA = document.querySelector('#prestartPanel .card[data-team="A"]');
  const preCardB = document.querySelector('#prestartPanel .card[data-team="B"]');

  function updatePrestartVisibility(){
    const u = window.Auth?.currentUser();
    const role = u?.role;
    const s = window.GameState?.getStreamers ? GameState.getStreamers() : {};
    const bothKnown = !!(s?.A?.name && s?.B?.name);
    // Show panel only when logged as A or B
    const showPanel = role === 'A' || role === 'B';
    show(prePanel, showPanel);
    // Show only the logged king tab
    if (!showPanel){
      show(preCardA, false); show(preCardB, false);
    } else if (bothKnown){
      // Dopo accettazione (entrambi i nomi noti), mostra entrambe le schede per chiarezza
      show(preCardA, true); show(preCardB, true);
    } else if (role === 'A'){
      show(preCardA, true); show(preCardB, false);
    } else if (role === 'B'){
      show(preCardA, false); show(preCardB, true);
    } else {
      show(preCardA, false); show(preCardB, false);
    }
  }
  // Pre-start rendering (names, avatars, counters) - define early to avoid TDZ
  let preTimer = null;
  const PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='%2306b6d4'/><stop offset='1' stop-color='%238b5cf6'/></linearGradient></defs><rect width='640' height='360' fill='url(%23g)'/></svg>";
  function setImg(el, src){ if (!el) return; el.src = src || PLACEHOLDER; }
  function renderPrestart(){
    // Aggiorna visibilità del pannello e schede
    updatePrestartVisibility();
    // Sicurezza: leggi conteggi solo se GameState è disponibile
    const counts = (window.GameState?.getAllegiance ? GameState.getAllegiance() : { A: 0, B: 0 });
    // Se loggato come A/B e manca il nome in GameState, prova a impostarlo da Auth
    try{
      const u = window.Auth?.currentUser();
      const cur = window.GameState?.getStreamers ? GameState.getStreamers() : {};
      if (u && u.role==='A' && (!cur?.A?.name || cur.A.name==='Streamer A')){
        window.GameState?.setStreamers?.({ A: { name: u.display_name } });
      }
      if (u && u.role==='B' && (!cur?.B?.name || cur.B.name==='Streamer B')){
        window.GameState?.setStreamers?.({ B: { name: u.display_name } });
      }
    }catch(e){}
    const s2 = window.GameState?.getStreamers ? GameState.getStreamers() : {};
    if (preNameA) preNameA.textContent = s2?.A?.name || 'Streamer A';
    if (preNameB) preNameB.textContent = s2?.B?.name || 'Streamer B';
    if (preCountA) preCountA.textContent = counts?.A || 0;
    if (preCountB) preCountB.textContent = counts?.B || 0;
    setImg(preImgA, s2?.A?.img);
    setImg(preImgB, s2?.B?.img);
  }
  function startPrestartRender(){ if (preTimer) clearInterval(preTimer); renderPrestart(); preTimer = setInterval(renderPrestart, 1000); }

  function lockSettings(disabled){
    const mg = document.getElementById('mgpr'); if (mg) mg.disabled = disabled;
    document.querySelectorAll('input[name="bestof"]').forEach(r=>{ r.disabled = disabled; });
  }
  const loginCard = document.getElementById('loginCard');
  const createCard = document.getElementById('createCard');
  const btnLoginA = document.getElementById('btnLoginA');

  function show(el, yes){ if (el) el.style.display = yes ? '' : 'none'; }
  function setStatus(which){
    // which: 'waiting' | 'accepted' | null
    if (btnWaiting) { btnWaiting.style.display = (which==='waiting') ? '' : 'none'; btnWaiting.disabled = true; }
    if (btnAccepted) { btnAccepted.style.display = (which==='accepted') ? '' : 'none'; btnAccepted.disabled = true; }
  }
  function syncUI(){
    const u = window.Auth?.currentUser();
    const role = u?.role;
    // Mostra la card di login solo se non sei loggato (nascondi per B)
    show(loginCard, !role);
    show(createCard, role === 'A');
    // mostra il pre-start per A e B
    if ((role==='A' || role==='B') && prePanel) { prePanel.style.display = ''; startPrestartRender(); }
  }
  btnLoginA?.addEventListener('click', ()=>{ sessionStorage.setItem('after_login', location.href); Auth.login('A'); });

  async function ensureRoleA(){
    if (!window.Auth) return; // allow in demo if auth missing
    const u = Auth.currentUser();
    if (!u || u.role !== 'A'){ syncUI(); return false; }
    return true;
  }
  // nothing to prefill in inputs; names shown in preview
  // initial UI state
  syncUI();
  async function createOrResumeMatch(){
    const ok = await ensureRoleA(); if (!ok) return;
    // Try resume existing pending match from session
    let cur = null;
    try { cur = JSON.parse(sessionStorage.getItem('tam_current_match')||'null'); } catch(e){ cur = null; }
    let id = cur?.id || randId();
    CURRENT.id = id;
    // Uniforma l'URL includendo sempre il match per evitare pagine "differenti"
    try {
      const url = new URL(location.href);
      url.searchParams.set('match', id);
      history.replaceState(null, '', url.toString());
    } catch(e){}
    const bo = getBestOf();
    const mg = Math.max(1, Math.min(9, parseInt(val('mgpr')||'3',10)));
    CURRENT.bo = bo; CURRENT.mg = mg;
  const nameA = (window.Auth?.currentUser()?.display_name) || 'Streamer A';
  const nameB = '';
    const user = window.Auth?.currentUser() || { id: 'demoA', display_name: 'StreamerA' };
    // if new or status unknown, create a fresh match
    let inviteKey = cur?.inviteKey || null;
    if (!cur){
      try {
        const resp = await fetch('/api/matches', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ matchId: id, ownerA: { id: user.id, name: user.display_name }, config: { bestOf: bo, minigamesPerRush: mg, names: { A: nameA, B: nameB } } }) });
        if (!resp.ok) { out.textContent = 'Errore creazione match (server non disponibile)'; return; }
        const data = await resp.json();
        if (!data || !data.ok){ out.textContent = 'Errore creazione match'; return; }
        inviteKey = data.inviteKey;
        sessionStorage.setItem('tam_current_match', JSON.stringify({ id, inviteKey, bo, mg }));
      } catch(e){ out.textContent = 'Errore creazione match (nessuna risposta dal server)'; return; }
    }
    // build links
    const base = location.origin + location.pathname.replace(/create\.html$/, '');
    const invite = `${base}confirm.html?match=${encodeURIComponent(id)}&token=${encodeURIComponent(inviteKey)}`;
    // show only invite for now; spectators link after acceptance
  if (actionLink){ actionLink.href = invite; actionLink.textContent = invite; }
  if (linkLabel) linkLabel.textContent = 'Link privato';
  out.textContent = `Invia questo link PRIVATO allo Streamer B per accettare.`;
  // status buttons: mostra solo il bottone waiting
  setStatus('waiting');
    if (btnStart) btnStart.disabled = true;
    // Save local HUD config
    if (window.GameState){ GameState.initMatch(id, { bestOf: bo, minigamesPerRush: mg, streamers: { A: { name: nameA }, B: { name: '' } } }); }
    // poll acceptance to unlock spectators link
    const poll = setInterval(async () => {
      try{
        const res = await fetch(`/api/matches/${id}`);
        if (!res.ok) return; // retry
        const s = await res.json();
        if (s && s.status === 'accepted'){
          clearInterval(poll);
          const nameA2 = encodeURIComponent(s.config?.names?.A || nameA);
          const nameB2 = encodeURIComponent(s.config?.names?.B || s.invitedB?.name || 'Streamer B');
          // Genera e memorizza una chiave proprietario solo sul browser di A
          let ownerKey = localStorage.getItem('tamwar_owner_'+id);
          if (!ownerKey) {
            ownerKey = Math.random().toString(36).slice(2) + Date.now().toString(36).slice(-4);
            try { localStorage.setItem('tamwar_owner_'+id, ownerKey); } catch(e){}
          }
          // Link pubblico per A (include owner per abilitarne l'host lato client)
          const joinA = `${base}choose.html?match=${encodeURIComponent(id)}&bo=${bo}&mg=${mg}&nameA=${nameA2}&nameB=${nameB2}&owner=${encodeURIComponent(ownerKey)}`;
          if (actionLink){ actionLink.href = joinA; actionLink.textContent = joinA; }
          if (linkLabel) linkLabel.textContent = 'Link pubblico';
          lockSettings(true);
          out.textContent = 'La partita è stata accettata dallo Streamer B. Condividi ora il link pubblico per schierarsi.';
          // status buttons: mostra solo il bottone accepted
          setStatus('accepted');
          if (window.GameState){ GameState.setStreamers({ B: { name: decodeURIComponent(nameB2) } }); }
          sessionStorage.removeItem('tam_current_match');
          // Show pre-start preview and start button
          if (startBox) startBox.style.display = '';
          if (btnStart) btnStart.disabled = false;
          if (prePanel) prePanel.style.display = '';
          startPrestartRender();
        }
      } catch(e){ /* silent retry */ }
    }, 2000);
  }

  // Gestione iniziale: A crea/gestisce; B (se arriva con match) vede link pubblico senza owner
  (async function(){
    const u = window.Auth?.currentUser();
    const role = u?.role;
    const params = getParams();
    if (role === 'A'){
      const ok = await ensureRoleA();
      if (!ok) return;
      // Se A arriva con ?match=, prova a riprendere quella partita se è sua
      if (params.match){
        try{
          const r = await fetch(`/api/matches/${params.match}`);
          if (r.ok){
            const s = await r.json();
            if (s?.ownerA?.id && u?.id && s.ownerA.id === u.id){
              CURRENT.id = params.match;
              CURRENT.bo = s.config?.bestOf || CURRENT.bo;
              CURRENT.mg = s.config?.minigamesPerRush || CURRENT.mg;
              // Aggiorna URL (idempotente)
              try{ const url = new URL(location.href); url.searchParams.set('match', CURRENT.id); history.replaceState(null, '', url.toString()); }catch(e){}
              if (s.status === 'accepted' || s.status === 'running'){
                // Prepara link pubblico con owner per A
                let ownerKey = localStorage.getItem('tamwar_owner_'+CURRENT.id);
                if (!ownerKey) { ownerKey = Math.random().toString(36).slice(2) + Date.now().toString(36).slice(-4); try{ localStorage.setItem('tamwar_owner_'+CURRENT.id, ownerKey); }catch(e){} }
                const base = location.origin + location.pathname.replace(/create\.html$/, '');
                const nameA2 = encodeURIComponent(s.config?.names?.A || u.display_name || 'Streamer A');
                const nameB2 = encodeURIComponent(s.config?.names?.B || 'Streamer B');
                const joinA = `${base}choose.html?match=${encodeURIComponent(CURRENT.id)}&bo=${CURRENT.bo}&mg=${CURRENT.mg}&nameA=${nameA2}&nameB=${nameB2}&owner=${encodeURIComponent(ownerKey)}`;
                if (actionLink){ actionLink.href = joinA; actionLink.textContent = joinA; }
                if (linkLabel) linkLabel.textContent = 'Link pubblico';
                lockSettings(true);
                out.textContent = s.status === 'running' ? 'La partita è in corso.' : 'La partita è stata accettata dallo Streamer B.';
                if (prePanel) prePanel.style.display = '';
                if (startBox) startBox.style.display = '';
                if (btnStart) btnStart.disabled = false;
                setStatus('accepted');
                startPrestartRender();
                if (window.GameState){
                  GameState.initMatch(CURRENT.id, { bestOf: CURRENT.bo, minigamesPerRush: CURRENT.mg, streamers: { A: { name: decodeURIComponent(nameA2) }, B: { name: decodeURIComponent(nameB2) } } });
                }
                return; // evita di creare una nuova partita
              }
            }
          }
        }catch(e){}
      }
      // Altrimenti crea/recupera partita in corso (con inviteKey da sessione)
      createOrResumeMatch();
    } else if (role === 'B' && params.match){
      try{
        const r = await fetch(`/api/matches/${params.match}`);
        if (!r.ok) return;
        const s = await r.json();
        if (s && s.status === 'accepted'){
          const base = location.origin + location.pathname.replace(/create\.html$/, '');
          const nameA2 = encodeURIComponent(s.config?.names?.A || 'Streamer A');
          const nameB2 = encodeURIComponent(s.config?.names?.B || u.display_name || 'Streamer B');
          const joinB = `${base}choose.html?match=${encodeURIComponent(params.match)}&bo=${s.config?.bestOf||3}&mg=${s.config?.minigamesPerRush||3}&nameA=${nameA2}&nameB=${nameB2}`;
          if (actionLink){ actionLink.href = joinB; actionLink.textContent = joinB; }
          if (linkLabel) linkLabel.textContent = 'Link pubblico';
          if (prePanel) prePanel.style.display = '';
          setStatus('accepted');
          if (startBox) startBox.style.display = 'none';
          if (btnStart) btnStart.disabled = true;
          startPrestartRender();
          if (window.GameState){
            GameState.initMatch(params.match, { bestOf: s.config?.bestOf||3, minigamesPerRush: s.config?.minigamesPerRush||3, streamers: { A: { name: decodeURIComponent(nameA2) }, B: { name: decodeURIComponent(nameB2) } } });
          }
        }
      }catch(e){}
    }
  })();

  btnStart?.addEventListener('click', async () => {
    const u = window.Auth?.currentUser();
    if (!u || u.role !== 'A' || !CURRENT.id) return;
    try{
      await fetch(`/api/matches/${CURRENT.id}/start`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ actor: u.id }) });
    } catch(e){}
    // Vai al primo minigioco (Ariete) con il match corrente
    window.location.href = `minigiochi/ariete.html?match=${encodeURIComponent(CURRENT.id)}`;
  });

  // legacy copy handlers rimossi: UI usa un solo link dinamico
})();
