import { sendJson } from '../_lib/util.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
  return sendJson(res, 200, { ok: true, path: '/api/matches/ping' });
}
