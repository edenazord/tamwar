import { sendJson, readBody, getPathParts } from '../../_lib/util.js';
import { getMatch, setMatch, isKVReady } from '../../_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' });
  const parts = getPathParts(req);
  const id = parts[2];
  if (!id) return sendJson(res, 400, { error: 'missing id' });
  if (!isKVReady()) return sendJson(res, 503, { error: 'storage not configured' });
  let rec = null;
  try { rec = await getMatch(id); } catch(e) { return sendJson(res, 500, { error: 'internal' }); }
  if (!rec) return sendJson(res, 404, { error: 'not found' });
  if (rec.status !== 'invited' || !rec.inviteKey) return sendJson(res, 410, { error: 'already accepted' });
  let body = {};
  try { body = await readBody(req); } catch(e) { return sendJson(res, 400, { error: 'invalid json' }); }
  const { token, b } = body || {};
  if (!token || token !== rec.inviteKey) return sendJson(res, 410, { error: 'invalid token' });
  const nameB = b?.name || 'Streamer B';
  rec.invitedB = { id: b?.id || 'B', name: nameB };
  rec.config = rec.config || {};
  rec.config.names = rec.config.names || {};
  rec.config.names.B = nameB;
  rec.status = 'accepted';
  rec.inviteKey = null; // invalidates invite
  try { await setMatch(id, rec); } catch(e) { return sendJson(res, 500, { error: 'internal' }); }
  return sendJson(res, 200, { ok: true });
}
