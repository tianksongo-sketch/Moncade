import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleFeedback, handleAdmin, send, notifyWebhook, clientIp, LIMITS } from '../lib/core.js';
import { createMemoryStore, createUpstashStore, getStore } from '../lib/store.js';

const TOKEN = 'x'.repeat(40) + 'Q9';
const ENV = { ADMIN_TOKEN: TOKEN, ALLOWED_ORIGINS: 'https://admin.example.com', IP_HASH_SALT: 'test-salt' };
const JSONH = { 'content-type': 'application/json' };
const auth = { authorization: 'Bearer ' + TOKEN };
let n = 0; const ip = () => '10.0.0.' + (++n);   // fresh IP per call so tests do not share the rate limit

const fb = (store, body, extra = {}) => handleFeedback({
  method: 'POST', headers: JSONH, body, ip: extra.ip || ip(), store, env: extra.env || ENV, fetchImpl: extra.fetchImpl
});
const adm = (store, method, extra = {}) => handleAdmin({
  method, headers: extra.headers ?? auth, query: extra.query || {}, body: extra.body, ip: extra.ip || ip(),
  store, env: extra.env || ENV
});
const good = { category: 'bug', message: 'Tetris kadang ngebug pas rotasi', contact: 'a@b.co', game: 'tetris', view: 'games' };

test('valid feedback is stored and indexed', async () => {
  const s = createMemoryStore();
  const r = await fb(s, good);
  assert.equal(r.status, 200);
  const ids = await s.zrevrange('fb:index', 0, 10);
  assert.equal(ids.length, 1);
  const item = await s.get('fb:' + ids[0]);
  assert.equal(item.message, good.message);
  assert.equal(item.status, 'new');
  assert.equal(item.game, 'tetris');
});

test('honeypot: bot fills "website" -> 200 but nothing is stored', async () => {
  const s = createMemoryStore();
  const r = await fb(s, { ...good, website: 'http://spam.example' });
  assert.equal(r.status, 200);
  assert.equal((await s.zrevrange('fb:index', 0, 10)).length, 0);
});

test('bad requests are refused with clear status codes', async () => {
  const s = createMemoryStore();
  assert.equal((await handleFeedback({ method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}', ip: ip(), store: s, env: ENV })).status, 415);
  assert.equal((await handleFeedback({ method: 'POST', headers: JSONH, body: '{not json', ip: ip(), store: s, env: ENV })).status, 400);
  assert.equal((await handleFeedback({ method: 'POST', headers: JSONH, body: 'x'.repeat(LIMITS.maxBody + 1), ip: ip(), store: s, env: ENV })).status, 413);
  assert.equal((await fb(s, { ...good, message: 'hi' })).status, 400);
  assert.equal((await fb(s, { ...good, game: '../../etc' })).status, 400);
  assert.equal((await handleFeedback({ method: 'GET', headers: {}, ip: ip(), store: s, env: ENV })).status, 405);
});

test('unknown category falls back to "other"; control characters are stripped', async () => {
  const s = createMemoryStore();
  await fb(s, { ...good, category: 'hacker', message: 'halo\u0007 dunia\u0000 ok' });
  const item = await s.get('fb:' + (await s.zrevrange('fb:index', 0, 0))[0]);
  assert.equal(item.category, 'other');
  assert.equal(item.message, 'halo dunia ok');
});

test('rate limit: 5 submissions per IP, the 6th is refused', async () => {
  const s = createMemoryStore(); const addr = '203.0.113.7';
  for (let i = 0; i < LIMITS.rateMax; i++) assert.equal((await fb(s, good, { ip: addr })).status, 200);
  assert.equal((await fb(s, good, { ip: addr })).status, 429);
  assert.equal((await fb(s, good, { ip: '203.0.113.8' })).status, 200, 'other IPs are not affected');
});

test('admin: no token, wrong token and weak configured token are all refused', async () => {
  const s = createMemoryStore();
  assert.equal((await adm(s, 'GET', { headers: {} })).status, 401);
  assert.equal((await adm(s, 'GET', { headers: { authorization: 'Bearer nope' } })).status, 401);
  assert.equal((await adm(s, 'GET', { env: { ...ENV, ADMIN_TOKEN: 'short' } })).status, 401, 'token shorter than 32 chars is never accepted');
  assert.equal((await adm(s, 'GET', { env: { ...ENV, ADMIN_TOKEN: '' } })).status, 401, 'no token configured -> nothing is accepted');
});

test('admin: repeated bad tokens lock the IP out, even with the right token afterwards', async () => {
  const s = createMemoryStore(); const addr = '198.51.100.9';
  for (let i = 0; i < LIMITS.authFailMax; i++) await adm(s, 'GET', { headers: { authorization: 'Bearer wrong' }, ip: addr });
  assert.equal((await adm(s, 'GET', { ip: addr })).status, 429);
});

test('admin: list is newest-first, counts are right, status filter works', async () => {
  const s = createMemoryStore();
  await fb(s, { ...good, message: 'pertama' }); await fb(s, { ...good, message: 'kedua' });
  const list = await adm(s, 'GET');
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.items.map(i => i.message), ['kedua', 'pertama']);
  assert.deepEqual(list.body.counts, { all: 2, new: 2, read: 0, done: 0 });
  const id = list.body.items[0].id;
  await adm(s, 'PATCH', { query: { id }, body: { status: 'done' } });
  const done = await adm(s, 'GET', { query: { status: 'done' } });
  assert.equal(done.body.items.length, 1);
  assert.equal(done.body.items[0].id, id);
});

test('admin: PATCH validates status and id; DELETE removes from the index', async () => {
  const s = createMemoryStore();
  await fb(s, good);
  const id = (await adm(s, 'GET')).body.items[0].id;
  assert.equal((await adm(s, 'PATCH', { query: { id }, body: { status: 'hacked' } })).status, 400);
  assert.equal((await adm(s, 'PATCH', { query: { id: 'zzz' }, body: { status: 'read' } })).status, 404, 'malformed id');
  assert.equal((await adm(s, 'PATCH', { query: { id: 'aaaaaaaaaaaa' }, body: { status: 'read' } })).status, 404, 'unknown id');
  assert.equal((await adm(s, 'PATCH', { query: { id }, body: { status: 'read' } })).status, 200);
  assert.equal((await adm(s, 'DELETE', { query: { id } })).status, 200);
  assert.equal((await adm(s, 'GET')).body.items.length, 0);
});

test('stored text is kept verbatim (escaping is the admin page job, rendered with textContent)', async () => {
  const s = createMemoryStore();
  const evil = '<img src=x onerror="alert(1)"> <script>steal()</script>';
  await fb(s, { ...good, message: evil });
  assert.equal((await adm(s, 'GET')).body.items[0].message, evil);
});

test('CORS: only the admin origin gets Access-Control-Allow-Origin', () => {
  const mkRes = () => ({ statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } });
  const ok = mkRes(); send(ok, 200, {}, 'https://admin.example.com', ENV);
  assert.equal(ok.headers['Access-Control-Allow-Origin'], 'https://admin.example.com');
  const bad = mkRes(); send(bad, 200, {}, 'https://evil.example', ENV);
  assert.equal(bad.headers['Access-Control-Allow-Origin'], undefined);
  assert.equal(bad.headers['Cache-Control'], 'no-store');
});

test('webhook: called once per stored feedback, and a failing webhook does not break submission', async () => {
  const s = createMemoryStore(); const calls = [];
  const env = { ...ENV, FEEDBACK_WEBHOOK_URL: 'https://hooks.example/abc' };
  const ok = await fb(s, good, { env, fetchImpl: async (u, o) => { calls.push([u, JSON.parse(o.body).content]); return { ok: true }; } });
  assert.equal(ok.status, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0][1], /New feedback \[bug\] · tetris/);
  const r = await fb(s, good, { env, fetchImpl: async () => { throw new Error('webhook down'); } });
  assert.equal(r.status, 200, 'feedback is still accepted');
  assert.equal((await s.zrevrange('fb:index', 0, 10)).length, 2);
});

test('storage: no config -> error; memory store refused in production', () => {
  assert.throws(() => getStore({}), /storage not configured/);
  assert.throws(() => getStore({ FEEDBACK_STORE: 'memory', VERCEL_ENV: 'production' }), /not allowed in production/);
});

test('client IP: x-real-ip first; forged first x-forwarded-for hop is ignored', () => {
  assert.equal(clientIp({ headers: { 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1, 9.9.9.9' } }), '9.9.9.9');
  // attacker sends a fake first hop; the platform appends the real client as the last hop
  assert.equal(clientIp({ headers: { 'x-forwarded-for': 'fake-1, fake-2, 7.7.7.7' } }), '7.7.7.7');
  assert.equal(clientIp({ headers: {}, socket: { remoteAddress: '5.6.7.8' } }), '5.6.7.8');
});

test('rate limit cannot be dodged by rotating a forged x-forwarded-for', async () => {
  const s = createMemoryStore();
  const sent = [];
  for (let i = 0; i < 6; i++) {
    const r = await handleFeedback({ method: 'POST', headers: JSONH, body: JSON.stringify(good), ip: clientIp({ headers: { 'x-forwarded-for': 'forged-' + i + ', 4.4.4.4' } }), store: s, env: ENV });
    sent.push(r.status);
  }
  assert.deepEqual(sent, [200, 200, 200, 200, 200, 429]);
});

/* Fake Upstash REST endpoint. Implements the commands the adapter uses, so the real REST shape is exercised. */
function fakeUpstash() {
  const kv = new Map(), z = new Map(); const calls = [];
  const fetchImpl = async (url, opts) => {
    const args = JSON.parse(opts.body); calls.push({ url, auth: opts.headers.Authorization, args });
    const [c, ...a] = args; let result;
    switch (c) {
      case 'INCR': kv.set(a[0], String((Number(kv.get(a[0])) || 0) + 1)); result = Number(kv.get(a[0])); break;
      case 'EXPIRE': result = 1; break;
      case 'GET': result = kv.has(a[0]) ? kv.get(a[0]) : null; break;
      case 'SET': kv.set(a[0], a[1]); result = 'OK'; break;
      case 'DEL': result = kv.delete(a[0]) ? 1 : 0; z.delete(a[0]); break;
      case 'ZADD': { const arr = (z.get(a[0]) || []).filter(x => x.m !== a[2]); arr.push({ s: Number(a[1]), m: a[2] }); z.set(a[0], arr); result = 1; break; }
      case 'ZREM': z.set(a[0], (z.get(a[0]) || []).filter(x => x.m !== a[1])); result = 1; break;
      case 'ZREVRANGE': result = [...(z.get(a[0]) || [])].sort((x, y) => y.s - x.s).slice(a[1], a[2] + 1).map(x => x.m); break;
      case 'MGET': result = a.map(k => (kv.has(k) ? kv.get(k) : null)); break;
      default: return { ok: false, status: 400, json: async () => ({ error: 'unknown command' }) };
    }
    return { ok: true, status: 200, json: async () => ({ result }) };
  };
  return { fetchImpl, calls, kv, z };
}

test('Upstash adapter: round trip submit -> admin list -> PATCH -> DELETE over REST', async () => {
  const fake = fakeUpstash();
  const s = createUpstashStore('https://redis.example.test', 'rest-token', fake.fetchImpl);
  const r = await fb(s, good);
  assert.equal(r.status, 200);
  const list = await adm(s, 'GET');
  assert.equal(list.body.items.length, 1);
  assert.equal(list.body.items[0].message, good.message);
  const id = list.body.items[0].id;
  assert.equal((await adm(s, 'PATCH', { query: { id }, body: { status: 'read' } })).status, 200);
  assert.equal((await adm(s, 'DELETE', { query: { id } })).status, 200);
  assert.equal((await adm(s, 'GET')).body.items.length, 0);
  // every request authenticates with the REST token and goes to the base URL as a single command array
  assert.ok(fake.calls.length > 0);
  assert.ok(fake.calls.every(c => c.auth === 'Bearer rest-token' && c.url === 'https://redis.example.test' && Array.isArray(c.args)));
});

test('Upstash adapter: storage errors surface as exceptions (handler then returns 500 without leaking details)', async () => {
  const s = createUpstashStore('https://redis.example.test', 'bad', async () => ({ ok: false, status: 401, json: async () => ({ error: 'WRONGPASS' }) }));
  await assert.rejects(() => s.get('fb:x'), /storage request failed/);
});
