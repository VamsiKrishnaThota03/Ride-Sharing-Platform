/**
 * Covers the hardening added alongside the bind fix.
 *
 * The listener was previously `app.listen(PORT)`, which binds every interface,
 * and the app had no helmet, no rate limiting and no readiness probe. These
 * tests pin what is observable over HTTP; the bind itself is asserted by the
 * `bind-address` CI job, which inspects the real listening socket.
 *
 * A PostgreSQL URL is set but never connected to: Sequelize does not dial on
 * construction, so this suite needs no database at all. That is the point of
 * splitting liveness from readiness — liveness answers, readiness does not.
 */
process.env.JWT_SECRET = 'test-only-secret';
process.env.AUTH_RATE_LIMIT_MAX = '3';
process.env.DATABASE_URL = 'postgres://nobody:nothing@127.0.0.1:59999/absent';
process.env.DB_SSL = 'false';
delete process.env.DB_DIALECT;

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../app');

let server;
let base;

before(async () => {
  // Loopback explicitly: an ephemeral port on all interfaces would briefly
  // expose the test server to the local network.
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('the test server itself listens only on loopback', () => {
  assert.strictEqual(server.address().address, '127.0.0.1');
});

test('liveness answers without any database connection', async () => {
  const res = await fetch(`${base}/health`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, 'ok');
  assert.strictEqual(typeof body.uptime, 'number');
});

test('the root route also reports liveness', async () => {
  const res = await fetch(`${base}/`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.status, 'ok');
  assert.strictEqual(body.service, 'ride-sharing-platform-backend');
});

test('readiness reports 503 with Retry-After when the database is unreachable', async () => {
  const res = await fetch(`${base}/health/ready`);
  assert.strictEqual(res.status, 503);
  assert.strictEqual(res.headers.get('retry-after'), '30');
  const body = await res.json();
  assert.strictEqual(body.status, 'unavailable');
  // The message must not leak the connection string or credentials.
  assert.ok(!JSON.stringify(body).includes('nothing'));
  assert.ok(!JSON.stringify(body).includes('59999'));
});

test('security headers are set and the server is not fingerprintable', async () => {
  const res = await fetch(`${base}/health`);
  assert.strictEqual(res.headers.get('x-powered-by'), null);
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
  assert.strictEqual(res.headers.get('referrer-policy'), 'no-referrer');
});

test('rate limit responses use the draft-7 header, not the legacy ones', async () => {
  const res = await fetch(`${base}/health`);
  assert.ok(res.headers.get('ratelimit') || res.headers.get('ratelimit-limit'));
  assert.strictEqual(res.headers.get('x-ratelimit-limit'), null);
});

test('the auth limiter fires and keys on IP plus email', async () => {
  const attempt = (email) =>
    fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'wrong-password' }),
    });

  // AUTH_RATE_LIMIT_MAX is 3 in this suite. The database is unreachable, so
  // these requests fail downstream — but the limiter runs first, which is what
  // is being measured.
  const victim = 'target@example.test';
  let sawLimit = false;
  for (let i = 0; i < 6; i += 1) {
    const res = await attempt(victim);
    if (res.status === 429) {
      sawLimit = true;
      break;
    }
  }
  assert.ok(sawLimit, 'expected a 429 once the auth limit was exceeded');

  // A different email from the same IP is a separate bucket, so one attacker
  // cannot lock out every account behind a shared address.
  const other = await attempt('someone-else@example.test');
  assert.notStrictEqual(other.status, 429);
});

test('an unknown route returns a JSON 404', async () => {
  const res = await fetch(`${base}/api/does-not-exist`);
  assert.strictEqual(res.status, 404);
  const body = await res.json();
  assert.strictEqual(body.message, 'Not found');
});

test('malformed JSON produces a 400, not a 500', async () => {
  const res = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"email": broken',
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.match(body.message, /Invalid JSON/);
});
