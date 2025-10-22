import { sendJson, readBody, randomKey } from '../_lib/util.js';
import { createMatch, isKVReady } from '../_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'method not allowed' });
  }
  let body = {};
  try { body = await readBody(req); } catch(e) { return sendJson(res, 400, { error: 'invalid json' }); }
  const { matchId, ownerA, config } = body || {};
  if (!matchId || !ownerA || !ownerA.id) {
    return sendJson(res, 400, { error: 'missing fields' });
  }
  if (!isKVReady()) {
    return sendJson(res, 503, { error: 'storage not configured', hint: 'Add Vercel KV integration or set KV_REST_API_URL and KV_REST_API_TOKEN env vars' });
  }
  const inviteKey = randomKey();
  const rec = {
    matchId,
    ownerA: { id: ownerA.id, name: ownerA.name || 'Streamer A' },
    invitedB: null,
    status: 'invited', // invited -> accepted -> running
    inviteKey,
    createdAt: Date.now(),
    config: {
      bestOf: config?.bestOf ?? 3,
      minigamesPerRush: config?.minigamesPerRush ?? 3,
      names: { A: config?.names?.A || ownerA.name || 'Streamer A', B: config?.names?.B || '' }
    }
  };
  try {
    await createMatch(rec);
    return sendJson(res, 200, { ok: true, matchId, inviteKey });
  } catch (e) {
    const msg = (e && e.message) || 'internal error';
    return sendJson(res, 500, { error: 'internal', message: msg });
  }
}
