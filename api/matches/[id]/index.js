import { sendJson, getPathParts } from '../../_lib/util.js';
import { getMatch } from '../../_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
  const parts = getPathParts(req);
  const id = parts[2]; // /api/matches/:id
  if (!id) return sendJson(res, 400, { error: 'missing id' });
  const rec = await getMatch(id);
  if (!rec) return sendJson(res, 404, { error: 'not found' });
  // Do not expose inviteKey
  const { inviteKey, ...safe } = rec;
  return sendJson(res, 200, safe);
}
