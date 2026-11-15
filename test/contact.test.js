// Run: node --test
// Telegram is mocked: no network, no real token.
const test = require('node:test');
const assert = require('node:assert');
const handler = require('../api/contact.js');

function call(body, { method = 'POST', ip = '1.1.1.1' } = {}) {
  const out = { headers: {} };
  const res = {
    setHeader: (k, v) => { out.headers[k] = v; },
    status(c) { out.status = c; return this; },
    json(b) { out.body = b; return this; },
  };
  return handler({ method, body, headers: { 'x-forwarded-for': ip }, socket: {} }, res).then(() => out);
}

let sent;
test.beforeEach(() => {
  handler._resetRateLimit();
  sent = [];
  process.env.TELEGRAM_BOT_TOKEN = 'TEST_TOKEN';
  process.env.TELEGRAM_CHAT_ID = '123';
  global.fetch = async (url, init) => { sent.push({ url, body: JSON.parse(init.body) }); return { ok: true }; };
});

const good = { email: 'a@b.co', needs: 'Consulting, Front-end & UI' };

test('valid request is delivered to Telegram', async () => {
  const r = await call(good);
  assert.equal(r.status, 200); assert.equal(r.body.ok, true);
  assert.equal(sent.length, 1);
  assert.match(sent[0].url, /^https:\/\/api\.telegram\.org\/botTEST_TOKEN\/sendMessage$/);
  assert.equal(sent[0].body.chat_id, '123');
  assert.match(sent[0].body.text, /Consulting, Front-end & UI/);
  assert.match(sent[0].body.text, /a@b\.co/);
});
test('rejects non-POST', async () => { assert.equal((await call(good, { method: 'GET' })).status, 405); });
test('rejects bad email', async () => {
  let n = 0;
  for (const email of ['', 'nope', 'a@b', 'a b@c.co', 'x'.repeat(250) + '@b.co', 5]) {
    assert.equal((await call({ ...good, email }, { ip: '9.9.9.' + n++ })).status, 400, String(email).slice(0, 12));
  }
  assert.equal(sent.length, 0);
});
test('rejects needs outside the allowed list or empty', async () => {
  let n = 0;
  for (const needs of ['', 'Hacking', 'Consulting, Hacking', [], 42]) assert.equal((await call({ ...good, needs }, { ip: '8.8.8.' + n++ })).status, 400);
  assert.equal(sent.length, 0);
});
test('honeypot: pretends success, sends nothing', async () => {
  const r = await call({ ...good, website: 'http://spam' });
  assert.equal(r.status, 200); assert.equal(sent.length, 0);
});
test('rate limit: 6th request from one IP is refused', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await call(good)).status, 200);
  assert.equal((await call(good)).status, 429);
  assert.equal((await call(good, { ip: '2.2.2.2' })).status, 200);
});
test('Telegram error -> 502, and no token leaks in the response', async () => {
  global.fetch = async () => ({ ok: false });
  let r = await call(good); assert.equal(r.status, 502); assert.ok(!JSON.stringify(r.body).includes('TEST_TOKEN'));
  global.fetch = async () => { throw new Error('boom TEST_TOKEN'); };
  r = await call(good, { ip: '3.3.3.3' }); assert.equal(r.status, 502); assert.ok(!JSON.stringify(r.body).includes('TEST_TOKEN'));
});
test('missing env vars -> 500, nothing sent', async () => {
  delete process.env.TELEGRAM_BOT_TOKEN;
  assert.equal((await call(good)).status, 500); assert.equal(sent.length, 0);
});
