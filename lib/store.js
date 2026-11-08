/* Storage adapters. Production: Upstash Redis (Vercel Marketplace integration, REST API, no npm deps).
   Memory adapter: local tests only, refused outright when running on Vercel production. */

export const KEYS = { feedbackIndex: 'fb:index', item: (id) => `fb:${id}` };

export function createMemoryStore() {
  const kv = new Map();          // key -> string
  const exp = new Map();         // key -> expiry ms
  const zsets = new Map();       // key -> [{ m, s }]
  const live = (k) => { const e = exp.get(k); if (e && Date.now() > e) { kv.delete(k); exp.delete(k); } };
  return {
    async incr(k) { live(k); const n = (Number(kv.get(k)) || 0) + 1; kv.set(k, String(n)); return n; },
    async expire(k, sec) { exp.set(k, Date.now() + sec * 1000); return 1; },
    async get(k) { live(k); const v = kv.get(k); return v == null ? null : JSON.parse(v); },
    async set(k, v) { kv.set(k, JSON.stringify(v)); return 'OK'; },
    async del(k) { kv.delete(k); zsets.delete(k); return 1; },
    async zadd(k, score, m) {
      const arr = (zsets.get(k) || []).filter(x => x.m !== m); arr.push({ m, s: score });
      zsets.set(k, arr); return 1;
    },
    async zrem(k, m) { zsets.set(k, (zsets.get(k) || []).filter(x => x.m !== m)); return 1; },
    async zrevrange(k, start, stop) {
      const arr = [...(zsets.get(k) || [])].sort((a, b) => b.s - a.s);
      return arr.slice(start, stop + 1).map(x => x.m);
    },
    async mget(keys) { return keys.map(k => { live(k); const v = kv.get(k); return v == null ? null : JSON.parse(v); }); }
  };
}

export function createUpstashStore(url, token, fetchImpl = globalThis.fetch) {
  const base = url.replace(/\/$/, '');
  async function cmd(args) {
    const r = await fetchImpl(base, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error('storage request failed');
    return j.result;
  }
  return {
    incr: (k) => cmd(['INCR', k]),
    expire: (k, sec) => cmd(['EXPIRE', k, sec]),
    get: async (k) => { const v = await cmd(['GET', k]); return v == null ? null : JSON.parse(v); },
    set: (k, v) => cmd(['SET', k, JSON.stringify(v)]),
    del: (k) => cmd(['DEL', k]),
    zadd: (k, score, m) => cmd(['ZADD', k, score, m]),
    zrem: (k, m) => cmd(['ZREM', k, m]),
    zrevrange: (k, start, stop) => cmd(['ZREVRANGE', k, start, stop]),
    mget: async (keys) => {
      if (!keys.length) return [];
      const arr = await cmd(['MGET', ...keys]);
      return arr.map(v => (v == null ? null : JSON.parse(v)));
    }
  };
}

let memoryInstance = null;
/* Picks the storage backend from the environment. Throws if it is not configured (the handler turns that into a 500). */
export function getStore(env = process.env) {
  if (env.FEEDBACK_STORE === 'memory') {
    if (env.VERCEL_ENV === 'production') throw new Error('memory store is not allowed in production');
    memoryInstance = memoryInstance || createMemoryStore();
    return memoryInstance;
  }
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('storage not configured');
  return createUpstashStore(url, token);
}

/* test helper */
export function resetMemoryStore() { memoryInstance = null; }
