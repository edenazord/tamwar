(function(){
  const html = `
    <div class="hud-center"><div id="gameHud" class="game-hud">
      <div class="side a">
        <img id="hudImgA" class="avatar tiny" alt="A"/>
        <div class="stack">
          <span id="hudNameA" class="nm">Re A</span>
          <div class="sub alleg"><span class="knight">♞</span> <span id="hudAllegA">0</span></div>
        </div>
      </div>
      <div class="score">
        <div class="line"><span id="hudScoreA">0</span> — <span id="hudScoreB">0</span></div>
        <div class="sub">Rush <span id="hudRushIndex">1</span> • <span id="hudBestOf">BO3</span></div>
      </div>
      <div class="side b">
        <div class="stack">
          <span id="hudNameB" class="nm">Re B</span>
          <div class="sub alleg"><span class="knight">♞</span> <span id="hudAllegB">0</span></div>
        </div>
        <img id="hudImgB" class="avatar tiny" alt="B"/>
      </div>
    </div></div>`;

  function ensureMount(){
    const bar = document.querySelector('.app-bar');
    if (!bar) return;
    if (!bar.querySelector('#gameHud')){
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      bar.appendChild(wrap.firstElementChild);
    }
  }
  function $(id){ return document.getElementById(id); }
  function setImg(el, src, fallback){ if (!el) return; el.src = src || fallback; }
  function render(){
    if (!window.GameState) return;
    ensureMount();
    const series = GameState.getSeries();
    const streamers = GameState.getStreamers();
    const alleg = GameState.getAllegiance();
    if (!series) return;
    const st = GameState.seriesStatus();
    const aN = streamers?.A?.name || 'Re A';
    const bN = streamers?.B?.name || 'Re B';
    const aImg = streamers?.A?.img || '';
    const bImg = streamers?.B?.img || '';
    const ph = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%23111827"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="28" fill="%23cbd5e1">👑</text></svg>';

    if ($('hudNameA')) $('hudNameA').textContent = aN;
    if ($('hudNameB')) $('hudNameB').textContent = bN;
    setImg($('hudImgA'), aImg, ph);
    setImg($('hudImgB'), bImg, ph);
    if ($('hudScoreA')) $('hudScoreA').textContent = st.rushWins.A||0;
    if ($('hudScoreB')) $('hudScoreB').textContent = st.rushWins.B||0;
    if ($('hudBestOf')) $('hudBestOf').textContent = `BO${st.bestOf}`;
    if ($('hudRushIndex')) $('hudRushIndex').textContent = st.rushIndex;
    if ($('hudAllegA')) $('hudAllegA').textContent = alleg.A||0;
    if ($('hudAllegB')) $('hudAllegB').textContent = alleg.B||0;
  }
  let timer = null;
  function start(intervalMs=1000){ if (timer) clearInterval(timer); render(); timer = setInterval(render, intervalMs); }
  function stop(){ if (timer){ clearInterval(timer); timer=null; } }
  window.Hud = { render, start, stop };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start(1000));
  else start(1000);
})();
