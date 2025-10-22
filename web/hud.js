(function(){
  function $(id){ return document.getElementById(id); }
  function render(){
    if (!window.GameState) return;
    const series = GameState.getSeries();
    const streamers = GameState.getStreamers();
    const alleg = GameState.getAllegiance();
    if (!series) return;
    const st = GameState.seriesStatus();
    const mid = GameState.getCurrentMatchId();
    if ($("navMatch")) $("navMatch").textContent = mid || "–";
    if ($("navBestOf")) $("navBestOf").textContent = `BO${st.bestOf}`;
    if ($("navRushIndex")) $("navRushIndex").textContent = st.rushIndex;
    if ($("navSeriesA")) $("navSeriesA").textContent = st.rushWins.A||0;
    if ($("navSeriesB")) $("navSeriesB").textContent = st.rushWins.B||0;
    if ($("navAllegA")) $("navAllegA").textContent = alleg.A||0;
    if ($("navAllegB")) $("navAllegB").textContent = alleg.B||0;
    const aN = streamers?.A?.name || 'Re A';
    const bN = streamers?.B?.name || 'Re B';
    if ($("navAName")) $("navAName").textContent = aN;
    if ($("navBName")) $("navBName").textContent = bN;
    // Winner banner (optional)
    const win = st.winner;
    const banner = $("navWinner");
    if (banner){
      banner.textContent = win ? `Vince la serie: ${win==='A'?aN:bN}` : '';
      banner.style.display = win ? 'inline' : 'none';
    }
  }
  window.Hud = { render };
  // auto render on load
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else setTimeout(render, 0);
})();
