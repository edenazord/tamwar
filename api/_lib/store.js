import { kv } from '@vercel/kv';

const PREFIX = 'match:';

export async function getMatch(id) {
  if (!id) return null;
  return await kv.get(PREFIX + id);
}

export async function setMatch(id, data) {
  await kv.set(PREFIX + id, data);
  return data;
}

export async function createMatch(rec) {
  const existing = await getMatch(rec.matchId);
  if (existing) return existing;
  await setMatch(rec.matchId, rec);
  return rec;
}
