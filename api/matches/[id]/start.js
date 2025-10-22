import { sendJson, readBody, getPathParts } from '../../_lib/util.js';
import { getMatch, setMatch } from '../../_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' });
  const parts = getPathParts(req);
  const id = parts[2];
  if (!id) return sendJson(res, 400, { error: 'missing id' });
  const rec = await getMatch(id);
  if (!rec) return sendJson(res, 404, { error: 'not found' });
  let body = {};
  try { body = await readBody(req); } catch(e) { return sendJson(res, 400, { error: 'invalid json' }); }
  const actor = body?.actor;
  if (!actor || actor !== rec.ownerA?.id) return sendJson(res, 403, { error: 'forbidden' });
  rec.status = 'running';
  await setMatch(id, rec);
  return sendJson(res, 200, { ok: true });
}
