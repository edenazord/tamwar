import { sendJson, getPathParts } from '../_lib/util.js';
import { getMatch, isKVReady } from '../_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
  const parts = getPathParts(req);
  const id = parts[2]; // /api/matches/:id
  if (!id) return sendJson(res, 400, { error: 'missing id' });
  if (!isKVReady()) {
    console.log('KV storage not configured - missing environment variables');
    return sendJson(res, 503, { error: 'storage not configured', hint: 'Add Vercel KV integration or set KV_REST_API_URL and KV_REST_API_TOKEN env vars' });
  }
  let rec = null;
  try { 
    rec = await getMatch(id); 
  } catch(e) { 
    console.error('Error fetching match:', e.message);
    return sendJson(res, 500, { error: 'internal', message: e.message }); 
  }
  if (!rec) {
    console.log(`Match not found: ${id}`);
    return sendJson(res, 404, { error: 'not found', matchId: id });
  }
  // Do not expose inviteKey
  const { inviteKey, ...safe } = rec;
  return sendJson(res, 200, safe);
}
