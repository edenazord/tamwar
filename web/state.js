(function(){
  const KEY = 'tamwar_state_v1';
  const DEF = {
    allegiance: { A: 0, B: 0 },
    series: {
      bestOf: 3,
      rushIndex: 1,
      rushWins: { A: 0, B: 0 },
      minigamesPerRush: 3,
      minigameIndex: 1,
      minigameWins: { A: 0, B: 0 },
      streamers: {
        A: { name: 'Streamer A', img: '' },
        B: { name: 'Streamer B', img: '' }
      }
    }
  };

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || JSON.parse(JSON.stringify(DEF)); }
    catch(e){ return JSON.parse(JSON.stringify(DEF)); }
  }
  function save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }

  const api = {
    resetAll(){ save(JSON.parse(JSON.stringify(DEF))); },
    get(){ return load(); },
    // Allegiance
    incrementAllegiance(team){ const s = load(); if(!s.allegiance[team]) s.allegiance[team]=0; s.allegiance[team]++; save(s); return s.allegiance[team]; },
    getAllegiance(){ const s = load(); return { ...s.allegiance }; },
    // Streamers meta
    setStreamers(meta){ const s = load(); if (meta && meta.A) s.series.streamers.A = { ...s.series.streamers.A, ...meta.A }; if (meta && meta.B) s.series.streamers.B = { ...s.series.streamers.B, ...meta.B }; save(s); },
    getStreamers(){ return load().series.streamers; },
    // Series config
    setBestOf(n){ const s = load(); s.series.bestOf = (n===5?5:3); save(s); },
    setMinigamesPerRush(n){ const s = load(); s.series.minigamesPerRush = Math.max(1, Math.min(9, parseInt(n||3,10))); save(s); },
    getSeries(){ const s = load(); return JSON.parse(JSON.stringify(s.series)); },
    // Progress
    recordMinigameWin(team){ const s = load(); if (!s.series.minigameWins[team] && s.series.minigameWins[team]!==0) s.series.minigameWins[team]=0; s.series.minigameWins[team]++; s.series.minigameIndex++; save(s); return { ...s.series.minigameWins }; },
    finalizeRush(){ const s = load(); const a = s.series.minigameWins.A|0, b = s.series.minigameWins.B|0; if (a===b){ /* tie breaker: none */ } else if (a>b){ s.series.rushWins.A++; } else { s.series.rushWins.B++; }
      s.series.rushIndex++; s.series.minigameIndex = 1; s.series.minigameWins = {A:0, B:0}; save(s); return { ...s.series.rushWins }; },
    seriesStatus(){ const s = load(); const need = Math.ceil(s.series.bestOf/2); const a = s.series.rushWins.A|0, b = s.series.rushWins.B|0; let winner=null; if (a>=need) winner='A'; if (b>=need) winner='B'; return { bestOf:s.series.bestOf, need, rushIndex:s.series.rushIndex, rushWins:{...s.series.rushWins}, winner };
    }
  };

  window.GameState = api;
})();
