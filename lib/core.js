/* Shared backend logic for the MOCA feedback system (used by api/*.js on Vercel and by the tests). */
import crypto from 'node:crypto';
import { KEYS } from './store.js';

export const LIMITS = {
  maxBody: 8000, maxMessage: 1000, minMessage: 3, maxContact: 120, maxGame: 40,
  rateMax: 5, rateWindowSec: 600,          // 5 submissions / 10 min / IP (shared across instances via Redis)
  authFailMax: 10, authWindowSec: 600      // after 10 bad tokens / 10 min from one IP, refuse for the window
};
export const CATEGORIES = ['bug', 'idea', 'other'];
export const STATUSES = ['new', 'read', 'done'];
export const VIEWS = ['home', 'games', 'favs', 'stats'];
export const ID_RE = /^[a-f0-9]{12}$/;

export function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
}

/* CORS only for explicitly allowed origins (the admin site). The main site is same-origin and needs none. */
export function corsHeaders(origin, env) {
  if (!origin || !allowedOrigins(env).includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,PATCH,DELETE,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin'
  };
}

export function send(res, status, body, origin, env, extra = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...corsHeaders(origin, env),
    ...extra
  };
  res.statusCode = status;
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(status === 204 ? '' : JSON.stringify(body));
}

/* Constant-time token check. Both sides are hashed first so the comparison length never leaks. */
export function tokenOk(authHeader, env) {
  const expected = env.ADMIN_TOKEN || '';
  if (expected.length < 32) return false;   // refuse weak or missing configuration outright
  const m = /^Bearer\s+(\S+)$/.exec(authHeader || '');
  if (!m) return false;
  const a = crypto.createHash('sha256').update(m[1]).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/* Vercel sets x-real-ip itself and appends the real client to x-forwarded-for, so the first hop is client-controlled.
   Never trust the first x-forwarded-for entry: it would let anyone dodge the rate limits by changing a header. */
export function clientIp(req) {
  const h = req.headers || {};
  if (h['x-real-ip']) return String(h['x-real-ip']).trim();
  const hops = String(h['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean);
  return hops[hops.length - 1] || (req.socket && req.socket.remoteAddress) || 'unknown';
}

/* Keys in Redis never contain the raw IP: only a salted hash. */
export function hashIp(ip, env) {
  const salt = env.IP_HASH_SALT || env.ADMIN_TOKEN || 'moca';
  return crypto.createHash('sha256').update(salt + ':' + ip).digest('hex').slice(0, 32);
}

const clean = (s, max) => String(s == null ? '' : s)
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .trim().slice(0, max);

/* Returns { ok:true, value } or { ok:false, error } — never trusts client types or sizes. */
export function validateFeedback(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return { ok: false, error: 'invalid body' };
  const message = clean(p.message, LIMITS.maxMessage);
  if (message.length < LIMITS.minMessage) return { ok: false, error: 'message too short' };
  const category = CATEGORIES.includes(p.category) ? p.category : 'other';
  const contact = clean(p.contact, LIMITS.maxContact);
  const game = clean(p.game, LIMITS.maxGame).toLowerCase();
  if (game && !/^[a-z0-9-]+$/.test(game)) return { ok: false, error: 'invalid game' };
  const view = VIEWS.includes(p.view) ? p.view : '';
  return { ok: true, value: { category, message, contact, game, view } };
}

/* Fixed-window counter in Redis. Returns true while the caller is still under the limit. */
export async function rateHit(store, key, max, windowSec) {
  const n = await store.incr(key);
  if (n === 1) await store.expire(key, windowSec);
  return n <= max;
}

async function readBody(body, maxBytes) {
  if (typeof body === 'string') {
    if (body.length > maxBytes) return { error: 413 };
    try { return { value: JSON.parse(body || 'null') }; } catch (e) { return { error: 400 }; }
  }
  if (body == null) return { value: null };
  if (JSON.stringify(body).length > maxBytes) return { error: 413 };
  return { value: body };
}

/* Best-effort Discord/Slack-style webhook. The feedback is already stored, so failures are ignored. */
export async function notifyWebhook(env, item, fetchImpl = globalThis.fetch) {
  const url = env.FEEDBACK_WEBHOOK_URL;
  if (!url) return;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({ content: `New feedback [${item.category}]${item.game ? ' · ' + item.game : ''}: ${item.message.slice(0, 300)}` })
    });
    clearTimeout(t);
  } catch (e) { /* notification is best effort */ }
}

let feedbackSeq = 0;

/* PUBLIC: receives feedback from the main site. Returns { status, body, headers }. */
export async function handleFeedback({ method, headers = {}, body, ip, store, env, now = Date.now(), fetchImpl }) {
  if (method === 'OPTIONS') return { status: 204, body: {} };
  if (method !== 'POST') return { status: 405, body: { error: 'method not allowed' } };
  const ctype = String(headers['content-type'] || '').toLowerCase();
  if (!ctype.startsWith('application/json')) return { status: 415, body: { error: 'unsupported media type' } };

  const ok = await rateHit(store, 'rl:' + hashIp(ip, env), LIMITS.rateMax, LIMITS.rateWindowSec);
  if (!ok) return { status: 429, body: { error: 'too many requests' } };

  const parsed = await readBody(body, LIMITS.maxBody);
  if (parsed.error === 413) return { status: 413, body: { error: 'payload too large' } };
  if (parsed.error === 400) return { status: 400, body: { error: 'invalid json' } };
  const payload = parsed.value;

  /* honeypot: bots fill the hidden "website" field. Answer OK but store nothing. */
  if (payload && typeof payload.website === 'string' && payload.website.trim()) return { status: 200, body: { ok: true } };

  const v = validateFeedback(payload);
  if (!v.ok) return { status: 400, body: { error: v.error } };

  const id = crypto.randomBytes(6).toString('hex');
  const item = { id, createdAt: new Date(now).toISOString(), status: 'new', ...v.value };
  await store.set(KEYS.item(id), item);
  /* score = ms timestamp + a small sequence, so two submissions in the same millisecond keep their order */
  await store.zadd(KEYS.feedbackIndex, now * 1000 + (feedbackSeq++ % 1000), id);
  await notifyWebhook(env, item, fetchImpl);
  return { status: 200, body: { ok: true } };
}

/* ADMIN: list / update status / delete. Requires Authorization: Bearer <ADMIN_TOKEN>. */
export async function handleAdmin({ method, headers = {}, query = {}, body, ip, store, env }) {
  if (method === 'OPTIONS') return { status: 204, body: {} };
  const failKey = 'authfail:' + hashIp(ip, env);
  const fails = Number(await store.get(failKey)) || 0;
  if (fails >= LIMITS.authFailMax) return { status: 429, body: { error: 'too many failed attempts' } };
  if (!tokenOk(headers.authorization || headers.Authorization, env)) {
    const n = await store.incr(failKey);
    if (n === 1) await store.expire(failKey, LIMITS.authWindowSec);
    return { status: 401, body: { error: 'unauthorized' }, headers: { 'WWW-Authenticate': 'Bearer' } };
  }

  if (method === 'GET') {
    const ids = await store.zrevrange(KEYS.feedbackIndex, 0, 499);
    const items = (await store.mget(ids.map(KEYS.item))).filter(Boolean);
    const counts = { all: items.length, new: 0, read: 0, done: 0 };
    items.forEach(i => { if (counts[i.status] != null) counts[i.status]++; });
    const status = query.status;
    const out = status && STATUSES.includes(status) ? items.filter(i => i.status === status) : items;
    return { status: 200, body: { items: out, counts } };
  }

  let b = {};
  if (typeof body === 'string' && body) { try { b = JSON.parse(body); } catch (e) { return { status: 400, body: { error: 'invalid json' } }; } }
  else if (body && typeof body === 'object') b = body;
  const id = query.id || b.id;
  if (!ID_RE.test(String(id || ''))) return { status: 404, body: { error: 'not found' } };
  const key = KEYS.item(id);

  if (method === 'PATCH') {
    if (!STATUSES.includes(b.status)) return { status: 400, body: { error: 'invalid status' } };
    const item = await store.get(key);
    if (!item) return { status: 404, body: { error: 'not found' } };
    item.status = b.status; item.updatedAt = new Date().toISOString();
    await store.set(key, item);
    return { status: 200, body: { ok: true, item } };
  }
  if (method === 'DELETE') {
    await store.del(key);
    await store.zrem(KEYS.feedbackIndex, id);
    return { status: 200, body: { ok: true } };
  }
  return { status: 405, body: { error: 'method not allowed' } };
}
