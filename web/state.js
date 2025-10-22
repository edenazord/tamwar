(function(){
  const KEY = 'tamwar_state_v2';
  const CLONE = (o)=>JSON.parse(JSON.stringify(o));

  const DEF_MATCH = () => ({
    config: {
      bestOf: 3,
      minigamesPerRush: 3,
      streamers: {
        A: { name: 'Streamer A', img: '' },
        B: { name: 'Streamer B', img: '' }
      }
    },
    progress: {
      rushIndex: 1,
      rushWins: { A: 0, B: 0 },
      minigameIndex: 1,
      minigameWins: { A: 0, B: 0 }
    },
    allegianceByRush: { 1: { A: 0, B: 0 } }
  });

  const DEF = { v:2, currentMatchId: null, matches: {} };

  function load(){
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return CLONE(DEF);
      const parsed = JSON.parse(raw);
      if (!parsed.v) return CLONE(DEF); // ignore old v1 silently
      return parsed;
    } catch(e){ return CLONE(DEF); }
  }
  function save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }

  function ensureMatch(s, matchId){
    if (!s.matches[matchId]) s.matches[matchId] = DEF_MATCH();
    if (!s.currentMatchId) s.currentMatchId = matchId;
  }
  function current(s){
    const id = s.currentMatchId;
    return id ? { id, m: s.matches[id] } : null;
  }

  const api = {
    resetAll(){ save(CLONE(DEF)); },
    getRaw(){ return load(); },
    // Matches
    initMatch(matchId, cfg){ const s = load(); ensureMatch(s, matchId); const m = s.matches[matchId];
      if (cfg){
        if (cfg.bestOf) m.config.bestOf = (parseInt(cfg.bestOf,10)===5?5:3);
        if (cfg.minigamesPerRush) m.config.minigamesPerRush = Math.max(1, Math.min(9, parseInt(cfg.minigamesPerRush,10)));
        if (cfg.streamers){ m.config.streamers.A = { ...m.config.streamers.A, ...cfg.streamers.A };
                             m.config.streamers.B = { ...m.config.streamers.B, ...cfg.streamers.B }; }
      }
      s.currentMatchId = matchId; save(s); return matchId; },
    setCurrentMatch(id){ const s = load(); if (s.matches[id]) { s.currentMatchId = id; save(s);} return id; },
    getCurrentMatchId(){ return load().currentMatchId; },
    // Allegiance tied to current rush
    incrementAllegiance(team){ const s = load(); const cur = current(s); if (!cur) return 0; const m = cur.m; const r = m.progress.rushIndex;
      if (!m.allegianceByRush[r]) m.allegianceByRush[r] = { A:0, B:0 };
      m.allegianceByRush[r][team] = (m.allegianceByRush[r][team]||0) + 1; save(s); return m.allegianceByRush[r][team]; },
    getAllegiance(){ const s = load(); const cur = current(s); if (!cur) return {A:0,B:0}; const m=cur.m; const r=m.progress.rushIndex; return CLONE(m.allegianceByRush[r] || {A:0,B:0}); },
    // Streamers meta on current match
    setStreamers(meta){ const s = load(); const cur=current(s); if (!cur) return; const m=cur.m; if (meta && meta.A) m.config.streamers.A = { ...m.config.streamers.A, ...meta.A }; if (meta && meta.B) m.config.streamers.B = { ...m.config.streamers.B, ...meta.B }; save(s); },
    getStreamers(){ const s=load(); const cur=current(s); return cur? CLONE(cur.m.config.streamers) : {A:{name:'Re A',img:''},B:{name:'Re B',img:''}}; },
    // Series config on current match
    setBestOf(n){ const s=load(); const cur=current(s); if (!cur) return; cur.m.config.bestOf = (parseInt(n,10)===5?5:3); save(s); },
    setMinigamesPerRush(n){ const s=load(); const cur=current(s); if (!cur) return; cur.m.config.minigamesPerRush = Math.max(1, Math.min(9, parseInt(n||3,10))); save(s); },
    getSeries(){ const s=load(); const cur=current(s); if (!cur) return null; const m=cur.m; return {
      bestOf: m.config.bestOf,
      rushIndex: m.progress.rushIndex,
      rushWins: CLONE(m.progress.rushWins),
      minigamesPerRush: m.config.minigamesPerRush,
      minigameIndex: m.progress.minigameIndex,
      minigameWins: CLONE(m.progress.minigameWins)
    }; },
    // Progress on current match
    recordMinigameWin(team){ const s=load(); const cur=current(s); if (!cur) return; const m=cur.m; m.progress.minigameWins[team] = (m.progress.minigameWins[team]||0)+1; m.progress.minigameIndex++; save(s); return CLONE(m.progress.minigameWins); },
    finalizeRush(){ const s=load(); const cur=current(s); if (!cur) return; const m=cur.m; const a=m.progress.minigameWins.A|0, b=m.progress.minigameWins.B|0; if (a!==b){ if (a>b) m.progress.rushWins.A++; else m.progress.rushWins.B++; }
      m.progress.rushIndex++; m.progress.minigameIndex = 1; m.progress.minigameWins = {A:0,B:0}; m.allegianceByRush[m.progress.rushIndex] = {A:0,B:0}; save(s); return CLONE(m.progress.rushWins); },
    seriesStatus(){ const s=load(); const cur=current(s); if (!cur) return {bestOf:3, need:2, rushIndex:1, rushWins:{A:0,B:0}, winner:null}; const m=cur.m; const need = Math.ceil(m.config.bestOf/2);
      const a=m.progress.rushWins.A|0, b=m.progress.rushWins.B|0; let winner=null; if (a>=need) winner='A'; if (b>=need) winner='B'; return { bestOf:m.config.bestOf, need, rushIndex:m.progress.rushIndex, rushWins:CLONE(m.progress.rushWins), winner };
    }
  };

  window.GameState = api;
})();
