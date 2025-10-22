(function(){
  function randId(){ return Math.random().toString(36).slice(2, 8) + '-' + Date.now().toString(36).slice(-4); }
  function val(name){ const el = document.getElementById(name); return el ? el.value.trim() : ''; }
  function getBestOf(){ const els = document.querySelectorAll('input[name="bestof"]'); for (const e of els){ if (e.checked) return parseInt(e.value,10); } return 3; }

  const btnGen = document.getElementById('btnGen');
  const btnCopy = document.getElementById('btnCopy');
  const aJoin = document.getElementById('joinLink');
  const out = document.getElementById('out');

  btnGen?.addEventListener('click', () => {
    const id = randId();
    const bo = getBestOf();
    const mg = Math.max(1, Math.min(9, parseInt(val('mgpr')||'3',10)));
    const nameA = encodeURIComponent(val('nameA')||'Streamer A');
    const nameB = encodeURIComponent(val('nameB')||'Streamer B');

    // Initialize local match so HUDs can load config even on host
    if (window.GameState){
      GameState.initMatch(id, { bestOf: bo, minigamesPerRush: mg, streamers: { A: { name: decodeURIComponent(nameA) }, B: { name: decodeURIComponent(nameB) } } });
    }

    const base = location.origin + location.pathname.replace(/create\.html$/, '');
    const join = `${base}choose.html?match=${encodeURIComponent(id)}&bo=${bo}&mg=${mg}&nameA=${nameA}&nameB=${nameB}`;

    aJoin.href = join; aJoin.style.display = 'inline-block';
    btnCopy.disabled = false;
    out.textContent = `Condividi questo link per far entrare i giocatori nel rush: ${join}`;
  });

  btnCopy?.addEventListener('click', async () => {
    if (!aJoin?.href) return;
    try{ await navigator.clipboard.writeText(aJoin.href); btnCopy.textContent = 'Copiato!'; setTimeout(()=>btnCopy.textContent='Copia link', 1200); }
    catch(e){ btnCopy.textContent = 'Copia fallita'; setTimeout(()=>btnCopy.textContent='Copia link', 1200); }
  });
})();
