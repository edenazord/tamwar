import { sendJson } from '../_lib/util.js';
import { isKVReady } from '../_lib/store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
  
  const status = {
    kvReady: isKVReady(),
    vercelKV: {
      hasUrl: !!process.env.KV_REST_API_URL,
      hasToken: !!process.env.KV_REST_API_TOKEN
    },
    upstash: {
      hasRestUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasRestToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
    },
    redisTcp: {
      hasUrl: !!process.env.REDIS_URL || !!process.env.UPSTASH_REDIS_URL
    },
    environment: process.env.NODE_ENV || 'development'
  };
  
  return sendJson(res, 200, status);
}