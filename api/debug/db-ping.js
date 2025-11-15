import { sendJson } from '../_lib/util.js';
import { createMatch, getMatch, setMatch, isKVReady } from '../_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });

  // Identify expected backend based on env precedence
  const hasPg = !!(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NO_SSL);
  const hasMy = !!(process.env.MYSQL_URL || process.env.MARIADB_URL || (process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_PASSWORD && process.env.MYSQL_DATABASE));
  const hasRedisTcp = !!(process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL);
  const hasKvRest = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) || !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  const expected = hasPg ? 'postgres' : hasMy ? 'mysql' : hasRedisTcp ? 'redis' : hasKvRest ? 'kv' : 'none';

  // Minimal sanitized diagnostics for MySQL env
  let diag = undefined;
  if (hasMy) {
    try {
      if (process.env.MYSQL_URL || process.env.MARIADB_URL) {
        const u = new URL(process.env.MYSQL_URL || process.env.MARIADB_URL);
        diag = { mysql: { mode: 'url', host: u.hostname, port: u.port || '3306', database: (u.pathname || '').replace(/^\//,'') || undefined } };
      } else {
        diag = { mysql: { mode: 'parts', host: process.env.MYSQL_HOST || process.env.MARIADB_HOST, port: process.env.MYSQL_PORT || process.env.MARIADB_PORT || '3306', database: process.env.MYSQL_DATABASE || process.env.MARIADB_DATABASE } };
      }
    } catch {}
  }

  if (!isKVReady()) return sendJson(res, 503, { ok: false, error: 'storage not configured', expected });

  const id = `debug-ping-${Date.now()}`;
  const payload = { ping: 'ok', t: Date.now(), expected };

  try {
    await setMatch(id, payload);
    const roundtrip = await getMatch(id);
    const ok = !!roundtrip && roundtrip.ping === 'ok';
    return sendJson(res, 200, { ok, expected, stored: payload, loaded: roundtrip, diag });
  } catch (e) {
    return sendJson(res, 500, { ok: false, expected, error: (e && e.message) || 'internal', diag });
  }
}
