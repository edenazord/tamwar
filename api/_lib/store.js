import { kv as defaultKv, createClient } from '@vercel/kv';
import Redis from 'ioredis';

const PREFIX = 'match:';

// Supporto sia Vercel KV (KV_*) che Upstash Redis (UPSTASH_REDIS_* via REST)
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_TCP_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

// Crea un client esplicito se vengono fornite URL e TOKEN; altrimenti usa quello di default
const kvClient = (KV_URL && KV_TOKEN)
  ? createClient({ url: KV_URL, token: KV_TOKEN })
  : defaultKv;

// Redis TCP client (fallback) se abbiamo solo REDIS_URL/UPSTASH_REDIS_URL
const redisClient = REDIS_TCP_URL ? new Redis(REDIS_TCP_URL, {
  // Opzioni conservative per ambiente serverless
  maxRetriesPerRequest: 2,
  enableReadyCheck: false,
  lazyConnect: false,
  // timeouts brevi per evitare hanging
  connectTimeout: 5000
}) : null;

export function isKVReady() {
  // Pronto se esiste uno qualunque dei tre setup
  const hasVercelKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  const hasUpstashRest = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  const hasRedisTcp = !!(process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL);
  return hasVercelKV || hasUpstashRest || hasRedisTcp;
}

export async function getMatch(id) {
  if (!id) return null;
  if (!isKVReady()) throw new Error('KV_NOT_CONFIGURED');
  const key = PREFIX + id;
  if (redisClient) {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }
  return await kvClient.get(key);
}

export async function setMatch(id, data) {
  if (!isKVReady()) throw new Error('KV_NOT_CONFIGURED');
  const key = PREFIX + id;
  if (redisClient) {
    await redisClient.set(key, JSON.stringify(data));
    return data;
  }
  await kvClient.set(key, data);
  return data;
}

export async function createMatch(rec) {
  if (!isKVReady()) throw new Error('KV_NOT_CONFIGURED');
  const existing = await getMatch(rec.matchId);
  if (existing) return existing;
  await setMatch(rec.matchId, rec);
  return rec;
}
 