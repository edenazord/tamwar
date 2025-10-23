(function(){
  const CLIENT_ID = window.TWITCH_CLIENT_ID || '';
  const REDIRECT_URI = window.TWITCH_REDIRECT_URI || (location.origin + location.pathname.replace(/[^/]+$/, '') + 'login.html');
  const SCOPES = ['user:read:email'];

  function login(role){
    if (!CLIENT_ID){
      const name = prompt('Demo login: inserisci nome utente'); 
      const id = 'demo_'+Math.random().toString(36).slice(2);
      const user = { id, display_name: name||'Demo', role };
      sessionStorage.setItem('tam_user', JSON.stringify(user));
      window.location.href = sessionStorage.getItem('after_login') || 'index.html';
      return;
    }
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'token',
      scope: SCOPES.join(' '),
      force_verify: 'true',
      state: role
    });
    window.location.href = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
  }

  async function init(){
    if (location.hash.includes('access_token=')){
      const h = new URLSearchParams(location.hash.slice(1));
      const token = h.get('access_token');
      const role = h.get('state') || 'viewer';
      try {
        const uRes = await fetch('https://api.twitch.tv/helix/users', { headers: { 'Authorization': `Bearer ${token}`, 'Client-Id': CLIENT_ID } });
        const data = await uRes.json();
        const u = data.data && data.data[0] || null;
        if (u){
          const user = { id: u.id, display_name: u.display_name, login: u.login, role, token };
          sessionStorage.setItem('tam_user', JSON.stringify(user));
        }
      } catch(e){}
      const next = sessionStorage.getItem('after_login') || 'index.html';
      window.location.replace(next);
    }
  }

  function currentUser(){
    try { return JSON.parse(sessionStorage.getItem('tam_user')||'null'); } catch(e){ return null; }
  }
  function requireRole(role, nextUrl){
    const u = currentUser();
    if (!u || u.role !== role){
      if (nextUrl) sessionStorage.setItem('after_login', nextUrl);
      return false;
    }
    return true;
  }
  window.Auth = { login, init, currentUser, requireRole };
})();
