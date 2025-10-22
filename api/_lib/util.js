export function sendJson(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

export async function readBody(req) {
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export function getPathParts(req) {
  const u = new URL(req.url, 'http://x');
  return u.pathname.split('/').filter(Boolean);
}

export function getQuery(req) {
  const u = new URL(req.url, 'http://x');
  return u.searchParams;
}

export function randomKey() {
  return Math.random().toString(36).slice(2,10) + '-' + Date.now().toString(36).slice(-4);
}
