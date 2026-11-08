/* PUBLIC endpoint: POST /api/feedback — receives feedback from the MOCA site. No secrets, returns nothing sensitive. */
import { handleFeedback, send, clientIp } from '../lib/core.js';
import { getStore } from '../lib/store.js';

export default async function handler(req, res) {
  let out;
  try {
    out = await handleFeedback({
      method: req.method, headers: req.headers || {}, body: req.body, ip: clientIp(req),
      store: getStore(process.env), env: process.env
    });
  } catch (e) {
    console.error('feedback failed:', e && e.message);   // never log the payload
    out = { status: 500, body: { error: 'server error' } };
  }
  send(res, out.status, out.body, (req.headers || {}).origin, process.env, out.headers || {});
}
