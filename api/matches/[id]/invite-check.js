import { sendJson, getPathParts, getQuery } from '../../_lib/util.js';
import { getMatch } from '../../_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
  const parts = getPathParts(req);
  const id = parts[2];
  if (!id) return sendJson(res, 400, { error: 'missing id' });
  const q = getQuery(req);
  const token = q.get('token');
  if (!token) return sendJson(res, 400, { error: 'missing token' });
  const rec = await getMatch(id);
  if (!rec || rec.status !== 'invited' || !rec.inviteKey) return sendJson(res, 410, { error: 'gone' });
  if (token !== rec.inviteKey) return sendJson(res, 410, { error: 'gone' });
  return sendJson(res, 200, { ok: true });
}
