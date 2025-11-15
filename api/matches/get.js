import { sendJson, getQuery } from '../_lib/util.js';
import { getMatch, isKVReady } from '../_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
  if (!isKVReady()) return sendJson(res, 503, { error: 'storage not configured' });
  const q = getQuery(req);
  const id = q.get('id');
  if (!id) return sendJson(res, 400, { error: 'missing id' });
  try {
    const rec = await getMatch(id);
    if (!rec) return sendJson(res, 404, { error: 'not found' });
    const { inviteKey, ...safe } = rec;
    // Uniforma il campo id nell'output per il frontend (compat con server locale)
    const idOut = rec.matchId || rec.id || id;
    return sendJson(res, 200, { id: idOut, ...safe });
  } catch (e) {
    return sendJson(res, 500, { error: 'internal' });
  }
}
