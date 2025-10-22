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

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  let pathname = parsed.pathname || '/';

  // Map root to index.html inside root
  let filePath = safePath(pathname === '/' ? '/index.html' : pathname);
  if (!filePath) return send(res, 403, 'Forbidden');

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      // try directory index
      filePath = path.join(filePath, 'index.html');
    }
    fs.readFile(filePath, (err2, data) => {
      if (err2) {
        return send(res, 404, 'Not Found');
      }
      const ext = path.extname(filePath).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      const headers = { 'Content-Type': type };
      // Allow caching for non-HTML assets for faster dev reloads
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
