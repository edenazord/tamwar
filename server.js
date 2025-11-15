#!/usr/bin/env node
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// In-memory store for matches (demo only)
const MATCHES = new Map();
function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 1e6) req.socket.destroy(); });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); } catch(e){ resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || '/';

  // Minimal CORS for local testing
  if (pathname.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return send(res, 204, '');
  }

  // API routes
  if (pathname === '/api/matches' && req.method === 'POST') {
    const body = await parseBody(req);
    const id = body.matchId;
    if (!id) return send(res, 400, JSON.stringify({ error: 'matchId required' }), { 'Content-Type': 'application/json' });
    const owner = body.ownerA; // { id, name }
    if (!owner || !owner.id) return send(res, 400, JSON.stringify({ error: 'ownerA required' }), { 'Content-Type': 'application/json' });
    const inviteKey = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const record = {
      id,
      ownerA: owner,
      invitedB: null,
      config: body.config || { bestOf: 3, minigamesPerRush: 3, names: { A: 'Streamer A', B: 'Streamer B' } },
      status: 'invited', // invited -> accepted -> running
      inviteKey
    };
    MATCHES.set(id, record);
    return send(res, 200, JSON.stringify({ ok: true, id, inviteKey }), { 'Content-Type': 'application/json' });
  }
  if (pathname.match(/^\/api\/matches\/[^/]+$/) && req.method === 'GET') {
    const id = pathname.split('/').pop();
    const rec = MATCHES.get(id);
    if (!rec) return send(res, 404, JSON.stringify({ error: 'not found' }), { 'Content-Type': 'application/json' });
    return send(res, 200, JSON.stringify({ id: rec.id, status: rec.status, ownerA: rec.ownerA, invitedB: rec.invitedB, config: rec.config }), { 'Content-Type': 'application/json' });
  }
  if (pathname.match(/^\/api\/matches\/[^/]+\/invite-check$/) && req.method === 'GET') {
    const id = pathname.split('/')[3];
    const rec = MATCHES.get(id);
    if (!rec) return send(res, 404, JSON.stringify({ error: 'not found' }), { 'Content-Type': 'application/json' });
    const token = parsed.query?.token || '';
    if (rec.status !== 'invited' || !rec.inviteKey || token !== rec.inviteKey) {
      return send(res, 410, JSON.stringify({ ok: false, error: 'invite consumed or invalid' }), { 'Content-Type': 'application/json' });
    }
    return send(res, 200, JSON.stringify({ ok: true }), { 'Content-Type': 'application/json' });
  }
  if (pathname.match(/^\/api\/matches\/[^/]+\/accept$/) && req.method === 'POST') {
    const id = pathname.split('/')[3];
    const rec = MATCHES.get(id);
    if (!rec) return send(res, 404, JSON.stringify({ error: 'not found' }), { 'Content-Type': 'application/json' });
    const body = await parseBody(req);
    if (rec.status !== 'invited' || !rec.inviteKey) return send(res, 410, JSON.stringify({ error: 'already accepted' }), { 'Content-Type': 'application/json' });
    if (body.token !== rec.inviteKey) return send(res, 403, JSON.stringify({ error: 'bad token' }), { 'Content-Type': 'application/json' });
    if (!body.b || !body.b.id) return send(res, 400, JSON.stringify({ error: 'b required' }), { 'Content-Type': 'application/json' });
    rec.invitedB = body.b;
    if (rec.config && rec.config.names) { rec.config.names.B = body.b.name || rec.config.names.B; }
    rec.status = 'accepted';
    rec.inviteKey = null; // invalidate invite link
    return send(res, 200, JSON.stringify({ ok: true, id, status: rec.status }), { 'Content-Type': 'application/json' });
  }
  if (pathname.match(/^\/api\/matches\/[^/]+\/start$/) && req.method === 'POST') {
    const id = pathname.split('/')[3];
    const rec = MATCHES.get(id);
    if (!rec) return send(res, 404, JSON.stringify({ error: 'not found' }), { 'Content-Type': 'application/json' });
    const body = await parseBody(req);
    if (!body.actor || body.actor !== rec.ownerA.id) return send(res, 403, JSON.stringify({ error: 'owner only' }), { 'Content-Type': 'application/json' });
    rec.status = 'running';
    return send(res, 200, JSON.stringify({ ok: true, status: rec.status }), { 'Content-Type': 'application/json' });
  }

  // Static files
  let filePath = safePath(pathname === '/' ? '/index.html' : pathname);
  if (!filePath) return send(res, 403, 'Forbidden');

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    fs.readFile(filePath, (err2, data) => {
      if (err2) return send(res, 404, 'Not Found');
      const ext = path.extname(filePath).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      const headers = { 'Content-Type': type };
      if (ext && ext !== '.html') headers['Cache-Control'] = 'public, max-age=0';
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
