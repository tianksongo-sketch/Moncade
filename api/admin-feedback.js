/* ADMIN endpoint: GET / PATCH / DELETE /api/admin-feedback — requires Authorization: Bearer <ADMIN_TOKEN>. */
import { handleAdmin, send, clientIp } from '../lib/core.js';
import { getStore } from '../lib/store.js';

export default async function handler(req, res) {
  let out;
  try {
    out = await handleAdmin({
      method: req.method, headers: req.headers || {}, query: req.query || {}, body: req.body,
      ip: clientIp(req), store: getStore(process.env), env: process.env
    });
  } catch (e) {
    console.error('admin failed:', e && e.message);
    out = { status: 500, body: { error: 'server error' } };
  }
  send(res, out.status, out.body, (req.headers || {}).origin, process.env, out.headers || {});
}
