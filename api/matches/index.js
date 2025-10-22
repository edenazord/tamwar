import { sendJson, readBody, randomKey } from '../_lib/util.js';
import { createMatch } from '../_lib/store.js';

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
  await createMatch(rec);
  return sendJson(res, 200, { ok: true, matchId, inviteKey });
}
