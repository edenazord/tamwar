import { kv } from '@vercel/kv';

const PREFIX = 'match:';

export function isKVReady() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function getMatch(id) {
  if (!id) return null;
  if (!isKVReady()) throw new Error('KV_NOT_CONFIGURED');
  return await kv.get(PREFIX + id);
}

export async function setMatch(id, data) {
  if (!isKVReady()) throw new Error('KV_NOT_CONFIGURED');
  await kv.set(PREFIX + id, data);
  return data;
}

export async function createMatch(rec) {
  if (!isKVReady()) throw new Error('KV_NOT_CONFIGURED');
  const existing = await getMatch(rec.matchId);
  if (existing) return existing;
  await setMatch(rec.matchId, rec);
  return rec;
}
