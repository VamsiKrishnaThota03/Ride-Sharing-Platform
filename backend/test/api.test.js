// End-to-end API tests against an in-memory SQLite database.
process.env.JWT_SECRET = 'test-only-secret';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';
process.env.ADMIN_EMAILS = 'boss@example.com';
delete process.env.DATABASE_URL;

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const WebSocket = require('ws');
const sequelize = require('../config/db');
const app = require('../app');
const attachRealtime = require('../realtime');

let server;
let base;

before(async () => {
  await sequelize.sync({ force: true });
  server = app.listen(0);
  attachRealtime(server);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await sequelize.close();
});

const call = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

const signupAndLogin = async (name, email, mobile, role) => {
  const signup = await call('/api/signup', {
    method: 'POST',
    body: { name, email, password: 'secret12', mobile_number: mobile, role },
  });
  assert.strictEqual(signup.status, 201, JSON.stringify(signup.body));
  assert.strictEqual(signup.body.user.password, undefined, 'password hash must not be returned');
  const login = await call('/api/login', { method: 'POST', body: { email, password: 'secret12' } });
  assert.strictEqual(login.status, 200);
  return login.body;
};

let traveler;
let companion;
let admin;

test('sign up and log in for each role', async () => {
  traveler = await signupAndLogin('Tara', 'tara@example.com', '9000000001', 'traveler');
  companion = await signupAndLogin('Cody', 'cody@example.com', '9000000002', 'traveler_companion');
  assert.deepStrictEqual(companion.rideShareDetails, [], 'companions with no rides can still log in');
  admin = await signupAndLogin('Boss', 'boss@example.com', '9000000003', 'traveler');
  assert.strictEqual(admin.role, 'admin', 'ADMIN_EMAILS grants the admin role');
});

test('nobody can self-register as admin', async () => {
  const res = await call('/api/signup', {
    method: 'POST',
    body: { name: 'Eve', email: 'eve@example.com', password: 'secret12', mobile_number: '9000000009', role: 'admin' },
  });
  assert.strictEqual(res.status, 403);
});

test('signup validates input and rejects duplicates', async () => {
  const bad = await call('/api/signup', { method: 'POST', body: { name: 'X', email: 'nope', password: '1', mobile_number: '12' } });
  assert.strictEqual(bad.status, 400);
  const dup = await call('/api/signup', {
    method: 'POST',
    body: { name: 'Tara', email: 'tara@example.com', password: 'secret12', mobile_number: '9000000001' },
  });
  assert.strictEqual(dup.status, 409);
});

test('wrong password is a 401', async () => {
  const res = await call('/api/login', { method: 'POST', body: { email: 'tara@example.com', password: 'wrong' } });
  assert.strictEqual(res.status, 401);
});

test('traveler shares a ride and the companion sees it', async () => {
  const shared = await call('/api/rides/share', {
    method: 'POST',
    token: traveler.token,
    body: { tripId: 'TRIP-1', driverName: 'Ravi', driverPhone: '9876543210', cabNumber: 'TS09AB1234', companionMobile: '9000000002' },
  });
  assert.strictEqual(shared.status, 201);

  const mine = await call('/api/rides/shared', { token: traveler.token });
  assert.strictEqual(mine.body.length, 1);

  const theirs = await call('/api/rides/companion/details', { token: companion.token });
  assert.strictEqual(theirs.status, 200);
  assert.strictEqual(theirs.body[0].tripId, 'TRIP-1');
});

test('companions cannot share rides and travelers cannot use the companion route', async () => {
  const res = await call('/api/rides/share', {
    method: 'POST',
    token: companion.token,
    body: { tripId: 'TRIP-X', driverName: 'A', driverPhone: '9876543210', cabNumber: 'C' },
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual((await call('/api/rides/companion/details', { token: traveler.token })).status, 403);
});

test('feedback is limited to people on the ride', async () => {
  const ok = await call('/api/feedback/send', { method: 'POST', token: companion.token, body: { rideShareId: 'TRIP-1', rating: 5, comment: 'Safe trip' } });
  assert.strictEqual(ok.status, 201);
  const bad = await call('/api/feedback/send', { method: 'POST', token: companion.token, body: { rideShareId: 'TRIP-1', rating: 9 } });
  assert.strictEqual(bad.status, 400);
  const stranger = await signupAndLogin('Sam', 'sam@example.com', '9000000004', 'traveler');
  const denied = await call('/api/feedback/send', { method: 'POST', token: stranger.token, body: { rideShareId: 'TRIP-1', rating: 3 } });
  assert.strictEqual(denied.status, 404);
});

test('admin routes need the admin role and never return password hashes', async () => {
  assert.strictEqual((await call('/api/admin/users', { token: traveler.token })).status, 403);
  assert.strictEqual((await call('/api/admin/users')).status, 401);
  const users = await call('/api/admin/users', { token: admin.token });
  assert.strictEqual(users.status, 200);
  assert.ok(users.body.every((u) => u.password === undefined));
  const feedbacks = await call('/api/admin/feedbacks', { token: admin.token });
  assert.strictEqual(feedbacks.body.length, 1);
});

test('profile can be read and updated', async () => {
  const profile = await call('/api/user/profile', { token: traveler.token });
  assert.strictEqual(profile.body.email, 'tara@example.com');
  const updated = await call('/api/user/profile', {
    method: 'PUT',
    token: traveler.token,
    body: { name: 'Tara M', email: 'tara@example.com', mobile_number: '9000000001' },
  });
  assert.strictEqual(updated.status, 200);
  assert.strictEqual(updated.body.user.name, 'Tara M');
});

const openSocket = (query) =>
  new Promise((resolve) => {
    const ws = new WebSocket(`${base.replace('http', 'ws')}/?${query}`);
    const messages = [];
    ws.on('message', (data) => messages.push(JSON.parse(data)));
    ws.on('open', () => resolve({ ws, messages, closed: null }));
    ws.on('close', (code) => resolve({ ws, messages, closed: code }));
  });

const waitFor = async (check, ms = 2000) => {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (check()) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return false;
};

test('websocket: auth required, owner updates reach the companion, trip completes', async () => {
  const anon = await openSocket('tripId=TRIP-1');
  assert.ok(await waitFor(() => anon.ws.readyState === WebSocket.CLOSED));

  const owner = await openSocket(`tripId=TRIP-1&token=${traveler.token}`);
  const viewer = await openSocket(`tripId=TRIP-1&token=${companion.token}`);
  const inbox = await openSocket(`token=${companion.token}`);
  assert.ok(await waitFor(() => viewer.messages.some((m) => m.type === 'joined')));

  owner.ws.send('not json');
  owner.ws.send(JSON.stringify({ type: 'updatePosition', lat: 20, lon: 78 }));
  assert.ok(await waitFor(() => viewer.messages.some((m) => m.type === 'position' && m.lat === 20)));

  viewer.ws.send(JSON.stringify({ type: 'destinationReached' })); // ignored: not the owner
  owner.ws.send(JSON.stringify({ type: 'destinationReached' }));
  assert.ok(await waitFor(() => inbox.messages.some((m) => m.type === 'tripComplete')));

  const rides = await call('/api/rides/shared', { token: traveler.token });
  assert.strictEqual(rides.body[0].isActive, false);
  [owner, viewer, inbox].forEach(({ ws }) => ws.close());
});

test('only the owner can end a ride over REST', async () => {
  await call('/api/rides/share', {
    method: 'POST',
    token: traveler.token,
    body: { tripId: 'TRIP-2', driverName: 'Ravi', driverPhone: '9876543210', cabNumber: 'TS09AB1234' },
  });
  const other = await signupAndLogin('Ola', 'ola@example.com', '9000000005', 'traveler');
  assert.strictEqual((await call('/api/rides/expire', { method: 'POST', token: other.token, body: { tripId: 'TRIP-2' } })).status, 403);
  assert.strictEqual((await call('/api/rides/expire', { method: 'POST', token: traveler.token, body: { tripId: 'TRIP-2' } })).status, 200);
});
