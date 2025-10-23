import { sendJson, readBody } from '../_lib/util.js';
import { getMatch, setMatch, isKVReady } from '../_lib/store.js';

// Flat endpoint: POST /api/matches/accept
// Body: { id, token, b: { id, name } }
export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' });
  if (!isKVReady()) return sendJson(res, 503, { error: 'storage not configured' });
  let body = {};
  try { body = await readBody(req); } catch { return sendJson(res, 400, { error: 'invalid json' }); }
  const id = body?.id;
  const token = body?.token;
  const b = body?.b;
  if (!id) return sendJson(res, 400, { error: 'missing id' });
  if (!token) return sendJson(res, 400, { error: 'missing token' });
  try {
    const rec = await getMatch(id);
    if (!rec) return sendJson(res, 404, { error: 'not found' });
    if (rec.status !== 'invited' || !rec.inviteKey) return sendJson(res, 410, { error: 'already accepted' });
    if (token !== rec.inviteKey) return sendJson(res, 410, { error: 'invalid token' });
    const nameB = b?.name || 'Streamer B';
    rec.invitedB = { id: b?.id || 'B', name: nameB };
    rec.config = rec.config || {};
    rec.config.names = rec.config.names || {};
    rec.config.names.B = nameB;
    rec.status = 'accepted';
    rec.inviteKey = null; // invalidate invite
    await setMatch(id, rec);
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    return sendJson(res, 500, { error: 'internal' });
  }
}
