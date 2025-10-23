import { kv as defaultKv, createClient } from '@vercel/kv';

const PREFIX = 'match:';

// Supporto sia Vercel KV (KV_*) che Upstash Redis (UPSTASH_REDIS_* via REST)
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Crea un client esplicito se vengono fornite URL e TOKEN; altrimenti usa quello di default
const kvClient = (KV_URL && KV_TOKEN)
  ? createClient({ url: KV_URL, token: KV_TOKEN })
  : defaultKv;

export function isKVReady() {
  // Considera pronto se sono presenti le variabili di Vercel KV o di Upstash
  const hasVercelKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  return hasVercelKV || hasUpstash;
}

export async function getMatch(id) {
  if (!id) return null;
  if (!isKVReady()) throw new Error('KV_NOT_CONFIGURED');
  return await kvClient.get(PREFIX + id);
}

export async function setMatch(id, data) {
  if (!isKVReady()) throw new Error('KV_NOT_CONFIGURED');
  await kvClient.set(PREFIX + id, data);
  return data;
}

export async function createMatch(rec) {
  if (!isKVReady()) throw new Error('KV_NOT_CONFIGURED');
  const existing = await getMatch(rec.matchId);
  if (existing) return existing;
  await setMatch(rec.matchId, rec);
  return rec;
}
 