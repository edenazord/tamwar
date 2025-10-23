import { sendJson, getQuery } from '../_lib/util.js';
import { getMatch, isKVReady } from '../_lib/store.js';

// Fallback query-based endpoint: /api/matches/invite-check?id=...&token=...
export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
  if (!isKVReady()) return sendJson(res, 503, { error: 'storage not configured' });
  const q = getQuery(req);
  const id = q.get('id');
  const token = q.get('token');
  if (!id) return sendJson(res, 400, { error: 'missing id' });
  if (!token) return sendJson(res, 400, { error: 'missing token' });
  try {
    const rec = await getMatch(id);
    if (!rec || rec.status !== 'invited' || !rec.inviteKey) return sendJson(res, 410, { error: 'gone' });
    if (token !== rec.inviteKey) return sendJson(res, 410, { error: 'gone' });
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    return sendJson(res, 500, { error: 'internal' });
  }
}
