// Router per navigazione automatica tra minigiochi
(function(){
  const MINIGAMES = [
    'ariete',
    'carica',
    'banditori',
    'torre',
    'forgia'
  ];

  function getParams(){
    const p = new URLSearchParams(location.search);
    return { match: p.get('match') || null };
  }

  function getNextMinigame(currentIndex, totalPerRush){
    if (currentIndex > totalPerRush) {
      // Rush completato, torna a choose o mostra risultati
      return null;
    }
    // Usa l'indice corrente (1-based) per selezionare il minigioco
    // Se currentIndex è 1, primo minigioco, se 2 secondo, ecc.
    const gameIndex = (currentIndex - 1) % MINIGAMES.length;
    return MINIGAMES[gameIndex];
  }

  function navigateToNext(winner){
    const params = getParams();
    if (!params.match || !window.GameState) {
      // Fallback: torna a choose
      setTimeout(() => {
        window.location.href = '../choose.html' + (params.match ? `?match=${encodeURIComponent(params.match)}` : '');
      }, 3000);
      return;
    }

    try {
      const series = window.GameState.getSeries();
      if (!series) {
        setTimeout(() => {
          window.location.href = '../choose.html' + (params.match ? `?match=${encodeURIComponent(params.match)}` : '');
        }, 3000);
        return;
      }

      const currentIndex = series.minigameIndex || 1;
      const totalPerRush = series.minigamesPerRush || 3;

      // Registra la vittoria
      if (winner && (winner === 'A' || winner === 'B')) {
        window.GameState.recordMinigameWin(winner);
      }

      // Controlla se il rush è completato
      const updatedSeries = window.GameState.getSeries();
      if (updatedSeries.minigameIndex > totalPerRush) {
        // Rush completato
        window.GameState.finalizeRush();
        const finalStatus = window.GameState.seriesStatus();
        
        // Mostra risultati rush e naviga
        setTimeout(() => {
          if (finalStatus.winner) {
            // Serie completata
            window.location.href = '../choose.html' + (params.match ? `?match=${encodeURIComponent(params.match)}` : '');
          } else {
            // Nuovo rush, torna al primo minigioco
            window.location.href = `ariete.html?match=${encodeURIComponent(params.match)}`;
          }
        }, 4000);
        return;
      }

      // Vai al prossimo minigioco
      const nextIndex = updatedSeries.minigameIndex;
      const nextGame = getNextMinigame(nextIndex, totalPerRush);
      
      if (nextGame) {
        setTimeout(() => {
          window.location.href = `${nextGame}.html?match=${encodeURIComponent(params.match)}`;
        }, 3000);
      } else {
        setTimeout(() => {
          window.location.href = '../choose.html' + (params.match ? `?match=${encodeURIComponent(params.match)}` : '');
        }, 3000);
      }
    } catch(e) {
      console.error('Routing error:', e);
      setTimeout(() => {
        window.location.href = '../choose.html' + (params.match ? `?match=${encodeURIComponent(params.match)}` : '');
      }, 3000);
    }
  }

  window.MinigameRouter = {
    navigateToNext,
    getNextMinigame,
    MINIGAMES
  };
})();

