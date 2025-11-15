import { sendJson } from '../_lib/util.js';
import dns from 'node:dns/promises';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
  const mysqlUrl = process.env.MYSQL_URL || process.env.MARIADB_URL;
  const host = mysqlUrl ? (()=>{ try { return new URL(mysqlUrl).hostname; } catch { return undefined; } })() : (process.env.MYSQL_HOST || process.env.MARIADB_HOST);
  if (!host) return sendJson(res, 400, { error: 'no-host', hint: 'Set MYSQL_URL or MYSQL_HOST' });
  try {
    const [a4, a6, any, look] = await Promise.allSettled([
      dns.resolve4(host),
      dns.resolve6(host),
      dns.resolveAny(host),
      dns.lookup(host, { all: true })
    ]);
    const toVal = (r)=> r.status === 'fulfilled' ? r.value : { error: r.reason && r.reason.code || 'ERR', message: String(r.reason && r.reason.message || r.reason) };
    return sendJson(res, 200, {
      host,
      resolve4: toVal(a4),
      resolve6: toVal(a6),
      resolveAny: toVal(any),
      lookup: toVal(look)
    });
  } catch (e) {
    return sendJson(res, 500, { error: 'dns-failed', host, message: (e && e.message) || 'internal' });
  }
}
