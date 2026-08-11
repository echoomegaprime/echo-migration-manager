import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.ts';

const API_KEY = 'test-echo-api-key-0123456789abcdef';

function fakeD1() {
  const stmt = {
    bind() { return stmt; },
    async first() { return null; },
    async all() { return { results: [] }; },
    async run() { return { success: true, meta: { last_row_id: 1 } }; },
  };
  return { prepare() { return stmt; } };
}

function fakeKV() {
  const store = new Map();
  return {
    async get(k, type) {
      if (!store.has(k)) return null;
      const v = store.get(k);
      return type === 'json' ? JSON.parse(v) : v;
    },
    async put(k, v) { store.set(k, v); },
    async delete(k) { store.delete(k); },
  };
}

function fakeFetcher() {
  return { async fetch() { return new Response(JSON.stringify({ ok: true }), { status: 200 }); } };
}

function makeEnv(overrides = {}) {
  return {
    DB: fakeD1(),
    CACHE: fakeKV(),
    SHARED_BRAIN: fakeFetcher(),
    ALERT_ROUTER: fakeFetcher(),
    ECHO_API_KEY: API_KEY,
    ...overrides,
  };
}

async function req(path, opts = {}, env = makeEnv()) {
  const url = `https://echo-migration-manager.example${path}`;
  return worker.fetch(new Request(url, opts), env, {});
}

test('GET / is public', async () => {
  const res = await req('/');
  assert.equal(res.status, 200);
});

test('GET /health is public', async () => {
  const res = await req('/health');
  assert.equal(res.status, 200);
});

test('SECURITY FIX: GET /stats with no key is rejected 401', async () => {
  const res = await req('/stats');
  assert.equal(res.status, 401);
});

test('SECURITY FIX: GET /migrations with no key is rejected 401', async () => {
  const res = await req('/migrations');
  assert.equal(res.status, 401);
});

test('GET /migrations with correct X-Echo-API-Key header passes auth', async () => {
  const res = await req('/migrations', { headers: { 'X-Echo-API-Key': API_KEY } });
  assert.equal(res.status, 200);
});

test('GET /stats with wrong key is rejected 401', async () => {
  const res = await req('/stats', { headers: { 'X-Echo-API-Key': 'totally-wrong-key' } });
  assert.equal(res.status, 401);
});

test('SECURITY FIX: an explicitly empty X-Echo-API-Key header no longer bypasses auth', async () => {
  const res = await req('/stats', { headers: { 'X-Echo-API-Key': '' } });
  assert.equal(res.status, 401);
});

test('FAIL-CLOSED FIX: when ECHO_API_KEY is unset, every protected route 503s -- never falls through to 200', async () => {
  const env = makeEnv({ ECHO_API_KEY: undefined });
  const res = await req('/stats', { headers: { 'X-Echo-API-Key': 'anything' } }, env);
  assert.equal(res.status, 503);
});

test('FAIL-CLOSED FIX: an explicitly empty X-Echo-API-Key header against an unset ECHO_API_KEY still 503s, not 200', async () => {
  const env = makeEnv({ ECHO_API_KEY: '' });
  const res = await req('/stats', { headers: { 'X-Echo-API-Key': '' } }, env);
  assert.equal(res.status, 503);
});

test('Timing-shape: same-length wrong key and different-length wrong key are both rejected identically', async () => {
  const sameLength = 'x'.repeat(API_KEY.length);
  const shortKey = 'x';
  const r1 = await req('/stats', { headers: { 'X-Echo-API-Key': sameLength } });
  const r2 = await req('/stats', { headers: { 'X-Echo-API-Key': shortKey } });
  assert.equal(r1.status, 401);
  assert.equal(r2.status, 401);
});

test('POST /validate is public-blocked (auth applies to POST too, not just GET)', async () => {
  const res = await req('/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: 'SELECT 1' }),
  });
  assert.equal(res.status, 401);
});

test('POST /validate with correct key returns a syntax report', async () => {
  const res = await req('/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Echo-API-Key': API_KEY },
    body: JSON.stringify({ sql: 'CREATE TABLE foo (id INTEGER)' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.valid, true);
});
