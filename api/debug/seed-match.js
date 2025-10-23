import { sendJson, getQuery } from '../_lib/util.js';
import { isKVReady, getMatch, setMatch } from '../_lib/store.js';

// Debug utility: seeds a minimal match record if it doesn't exist
// Usage: GET /api/debug/seed-match?matchId=ID&owner=A123&name=Streamer%20A
export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
  if (!isKVReady()) return sendJson(res, 503, { error: 'storage not configured' });

  const q = getQuery(req);
  const matchId = q.get('matchId') || q.get('id');
  const ownerId = q.get('owner') || 'A123';
  const ownerName = q.get('name') || 'Streamer A';
  if (!matchId) return sendJson(res, 400, { error: 'missing matchId' });

  try {
    const existing = await getMatch(matchId);
    if (existing) {
      const { inviteKey, ...safe } = existing;
      return sendJson(res, 200, { ok: true, seeded: false, match: safe });
    }
    const rec = {
      matchId,
      ownerA: { id: ownerId, name: ownerName },
      invitedB: null,
      status: 'invited',
      inviteKey: 'debug-' + Math.random().toString(36).slice(2,10),
      createdAt: Date.now(),
      config: { bestOf: 3, minigamesPerRush: 3, names: { A: ownerName, B: '' } }
    };
    await setMatch(matchId, rec);
    const { inviteKey, ...safe } = rec;
    return sendJson(res, 200, { ok: true, seeded: true, match: safe });
  } catch (e) {
    return sendJson(res, 500, { error: 'internal', message: e?.message || 'unknown' });
  }
}
