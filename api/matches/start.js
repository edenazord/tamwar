import { sendJson, readBody } from '../_lib/util.js';
import { getMatch, setMatch, isKVReady } from '../_lib/store.js';

// Flat endpoint: POST /api/matches/start
// Body: { id, actor }
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' });
  if (!isKVReady()) return sendJson(res, 503, { error: 'storage not configured' });
  let body = {};
  try { body = await readBody(req); } catch { return sendJson(res, 400, { error: 'invalid json' }); }
  const id = body?.id;
  const actor = body?.actor;
  if (!id) return sendJson(res, 400, { error: 'missing id' });
  try {
    const rec = await getMatch(id);
    if (!rec) return sendJson(res, 404, { error: 'not found' });
    if (!actor || actor !== rec.ownerA?.id) return sendJson(res, 403, { error: 'forbidden' });
    rec.status = 'running';
    await setMatch(id, rec);
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    return sendJson(res, 500, { error: 'internal' });
  }
}
