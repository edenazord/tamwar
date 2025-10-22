#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
let port = 5173;
let root = path.join(__dirname, 'web');
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i+1]) { port = parseInt(args[++i], 10) || port; }
  else if ((args[i] === '--root' || args[i] === '-r') && args[i+1]) { root = path.resolve(args[++i]); }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf'
};

function send(res, code, body, headers={}) {
  res.writeHead(code, { 'Cache-Control': 'no-store', ...headers });
  if (body && Buffer.isBuffer(body)) res.end(body);
  else if (body) res.end(String(body));
  else res.end();
}

function safePath(p) {
  const decoded = decodeURIComponent(p.split('?')[0]);
  let filePath = path.normalize(path.join(root, decoded));
  if (!filePath.startsWith(path.normalize(root))) return null; // path traversal guard
  return filePath;
}

// In-memory match state
const matches = Object.create(null);
const json = (res, code, obj) => send(res, code, JSON.stringify(obj||{}), { 'Content-Type':'application/json; charset=utf-8' });
const readJson = (req) => new Promise((resolve) => {
  let body='';
  req.on('data', (c)=> body += c);
  req.on('end', ()=>{ try{ resolve(JSON.parse(body||'{}')); } catch(e){ resolve({}); } });
});
function id8(){ return Math.random().toString(16).slice(2,10) + Math.random().toString(16).slice(2,10); }

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';

  // API routes
  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/createMatch' && req.method === 'POST') {
      const body = await readJson(req);
      const matchId = id8();
      matches[matchId] = {
        createdAt: Date.now(),
        config: {
          bestOf: body?.bestOf === 5 ? 5 : 3,
          minigamesPerRush: Math.max(1, Math.min(9, parseInt(body?.minigamesPerRush||3,10)))
        },
        streamers: {
          A: { name: body?.streamers?.A?.name || 'Streamer A', img: body?.streamers?.A?.img || '' },
          B: { name: body?.streamers?.B?.name || 'Streamer B', img: body?.streamers?.B?.img || '' }
        },
        rushIndex: 1,
        rushWins: { A: 0, B: 0 },
        allegiance: { A: 0, B: 0 },
        minigameIndex: 1,
        minigameWins: { A: 0, B: 0 },
      };
      return json(res, 200, { ok:true, matchId });
    }
    if (pathname === '/api/state' && req.method === 'GET') {
      const id = parsed.query.match;
      const m = id && matches[id];
      if (!m) return json(res, 404, { ok:false, error:'match-not-found' });
      const need = Math.ceil(m.config.bestOf/2);
      return json(res, 200, { ok:true, matchId:id, config: m.config, streamers:m.streamers, rushIndex:m.rushIndex, rushWins:m.rushWins, allegiance:m.allegiance, minigameIndex:m.minigameIndex, minigameWins:m.minigameWins, need });
    }
    if (pathname === '/api/allegiance' && req.method === 'POST') {
      const id = parsed.query.match;
      const m = id && matches[id];
      if (!m) return json(res, 404, { ok:false, error:'match-not-found' });
      const body = await readJson(req);
      const team = body?.team === 'B' ? 'B' : 'A';
      m.allegiance[team] = (m.allegiance[team]||0) + 1;
      return json(res, 200, { ok:true, allegiance: m.allegiance });
    }
    if (pathname === '/api/reportMinigame' && req.method === 'POST') {
      const id = parsed.query.match;
      const m = id && matches[id];
      if (!m) return json(res, 404, { ok:false, error:'match-not-found' });
      const body = await readJson(req);
      const team = body?.winner === 'B' ? 'B' : 'A';
      m.minigameWins[team] = (m.minigameWins[team]||0) + 1;
      m.minigameIndex += 1;
      return json(res, 200, { ok:true, minigameWins:m.minigameWins, minigameIndex:m.minigameIndex });
    }
    if (pathname === '/api/finalizeRush' && req.method === 'POST') {
      const id = parsed.query.match;
      const m = id && matches[id];
      if (!m) return json(res, 404, { ok:false, error:'match-not-found' });
      const a = m.minigameWins.A|0, b = m.minigameWins.B|0;
      if (a!==b) {
        if (a>b) m.rushWins.A++; else m.rushWins.B++;
      }
      m.rushIndex += 1;
      m.minigameIndex = 1;
      m.minigameWins = {A:0,B:0};
      // reset allegiance for new rush
      m.allegiance = {A:0,B:0};
      const need = Math.ceil(m.config.bestOf/2);
      let winner = null;
      if (m.rushWins.A >= need) winner = 'A';
      if (m.rushWins.B >= need) winner = 'B';
      return json(res, 200, { ok:true, rushWins:m.rushWins, rushIndex:m.rushIndex, winner });
    }
    return json(res, 404, { ok:false, error:'not-found' });
  }

  // Static files
  let filePath = safePath(pathname === '/' ? '/index.html' : pathname);
  if (!filePath) return send(res, 403, 'Forbidden');
  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    fs.readFile(filePath, (err2, data) => {
      if (err2) {
        return send(res, 404, 'Not Found');
      }
      const ext = path.extname(filePath).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      const headers = { 'Content-Type': type };
      if (ext && ext !== '.html') {
        headers['Cache-Control'] = 'public, max-age=0';
      }
      res.writeHead(200, headers);
      res.end(data);
    });
  });
});

server.listen(port, () => {
  const urlStr = `http://localhost:${port}/`;
  console.log(`Static server running at ${urlStr} (root = ${root})`);
  // open browser
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', urlStr], { stdio: 'ignore', detached: true });
    } else if (process.platform === 'darwin') {
      spawn('open', [urlStr], { stdio: 'ignore', detached: true });
    } else {
      spawn('xdg-open', [urlStr], { stdio: 'ignore', detached: true });
    }
  } catch (e) {
    // ignore open errors
  }
});
