import { kv as defaultKv, createClient } from '@vercel/kv';
import { sql } from '@vercel/postgres';
import mysql from 'mysql2/promise';
import Redis from 'ioredis';

const PREFIX = 'match:';

// Vercel Postgres detection
const PG_URL = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NO_SSL;
const PG_READY = !!PG_URL;
let PG_TABLE_ENSURED = false;
async function ensurePgTable() {
  if (PG_TABLE_ENSURED || !PG_READY) return;
  await sql`CREATE TABLE IF NOT EXISTS matches (
    match_id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  )`;
  PG_TABLE_ENSURED = true;
}

// MySQL/MariaDB (IONOS) detection
const MYSQL_URL = process.env.MYSQL_URL || process.env.MARIADB_URL;
const MYSQL_HOST = process.env.MYSQL_HOST || process.env.MARIADB_HOST;
const MYSQL_PORT = process.env.MYSQL_PORT || process.env.MARIADB_PORT || '3306';
const MYSQL_USER = process.env.MYSQL_USER || process.env.MARIADB_USER;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || process.env.MARIADB_PASSWORD;
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || process.env.MARIADB_DATABASE;
const MYSQL_SSL = (process.env.MYSQL_SSL || process.env.MARIADB_SSL || '').toLowerCase();
const MYSQL_SSL_ENABLED = MYSQL_SSL === '1' || MYSQL_SSL === 'true' || MYSQL_SSL === 'required';
const MYSQL_READY = !!(MYSQL_URL || (MYSQL_HOST && MYSQL_USER && MYSQL_PASSWORD && MYSQL_DATABASE));
let MY_POOL = null;
function getMyPool() {
  if (!MYSQL_READY) return null;
  if (MY_POOL) return MY_POOL;
  const baseOpts = { waitForConnections: true, connectionLimit: 5, queueLimit: 0 };
  const sslOpt = MYSQL_SSL_ENABLED ? { ssl: { rejectUnauthorized: false } } : {};
  if (MYSQL_URL) {
    // Parse the URL to feed explicit fields (mysql2 doesn't support { uri } reliably in all versions)
    let u;
    try { u = new URL(MYSQL_URL); }
    catch (e) { throw new Error('MYSQL_URL_PARSE_ERROR: ' + (e && e.message || 'invalid')); }
    const dbName = (u.pathname || '').replace(/^\//, '') || undefined;
    MY_POOL = mysql.createPool({
      host: u.hostname,
      port: Number(u.port || '3306'),
      user: decodeURIComponent(u.username || ''),
      password: decodeURIComponent(u.password || ''),
      database: dbName,
      ...baseOpts,
      ...sslOpt
    });
  } else {
    MY_POOL = mysql.createPool({
      host: MYSQL_HOST,
      port: Number(MYSQL_PORT) || 3306,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      ...baseOpts,
      ...sslOpt
    });
  }
  return MY_POOL;
}
let MY_TABLE_ENSURED = false;
async function ensureMySqlTable() {
  if (!MYSQL_READY || MY_TABLE_ENSURED) return;
  const pool = getMyPool();
  await pool.execute(`CREATE TABLE IF NOT EXISTS matches (
    match_id VARCHAR(191) PRIMARY KEY,
    data LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  MY_TABLE_ENSURED = true;
}

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
  // Pronto se esiste uno qualunque dei setup (Postgres, MySQL/MariaDB o KV/Redis)
  if (PG_READY || MYSQL_READY) return true;
  const hasVercelKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  const hasUpstashRest = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  const hasRedisTcp = !!(process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL);
  return hasVercelKV || hasUpstashRest || hasRedisTcp;
}

export async function getMatch(id) {
  if (!id) return null;
  if (!isKVReady()) throw new Error('KV_NOT_CONFIGURED');
  const key = PREFIX + id;
  // Prefer Postgres if available
  if (PG_READY) {
    await ensurePgTable();
    const { rows } = await sql`SELECT data FROM matches WHERE match_id = ${id}`;
    return rows?.[0]?.data || null;
  }
  if (MYSQL_READY) {
    await ensureMySqlTable();
    const pool = getMyPool();
    const [rows] = await pool.execute('SELECT data FROM matches WHERE match_id = ?', [id]);
    if (!rows || rows.length === 0) return null;
    const raw = rows[0].data;
    try { return JSON.parse(raw); } catch { return null; }
  }
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
  if (PG_READY) {
    await ensurePgTable();
    await sql`INSERT INTO matches (match_id, data) VALUES (${id}, ${sql.json(data)})
             ON CONFLICT (match_id) DO UPDATE SET data = EXCLUDED.data`;
    return data;
  }
  if (MYSQL_READY) {
    await ensureMySqlTable();
    const pool = getMyPool();
    const json = JSON.stringify(data);
    await pool.execute(
      'INSERT INTO matches (match_id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
      [id, json]
    );
    return data;
  }
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
 