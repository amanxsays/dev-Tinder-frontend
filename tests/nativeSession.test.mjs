import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionStore } from '../src/platform/session.js';
import { isFirstPartyUrl } from '../src/platform/apiClient.js';

test('native session keeps a bearer only until expiry and delegates persistence to the native store', async () => {
  let now = 1000;
  let saved;
  const bridge = { read: async () => ({}), save: async value => { saved = value; }, clear: async () => { saved = null; } };
  const store = createSessionStore({ native: () => true, bridge, now: () => now });
  await store.load();
  assert.equal(store.token(), '');
  await store.save({ token: 'test-session', userId: 'account-a', expiresAt: new Date(2000).toISOString() });
  assert.equal(store.token(), 'test-session');
  assert.equal(saved.token, 'test-session');
  now = 2000;
  assert.equal(store.token(), '');
  assert.equal(store.snapshot().userId, 'account-a');
  await store.clear();
  assert.equal(saved, null);
  assert.equal(store.snapshot(), null);
});

test('late restore cannot overwrite a manually authenticated account or logout', async () => {
  let resolve;
  const bridge = { read: () => new Promise(done => { resolve = done; }), save: async () => {}, clear: async () => {} };
  const store = createSessionStore({ native: () => true, bridge, now: () => 0 });
  const pending = store.load();
  await store.save({ token: 'new', userId: 'new-user', expiresAt: new Date(10000).toISOString() });
  resolve({ token: 'old', userId: 'old-user', expiresAt: new Date(10000).toISOString() });
  await pending;
  assert.equal(store.token(), 'new');
  await store.clear();
  assert.equal(store.token(), '');
});

test('browser mode never touches native session persistence', async () => {
  const store = createSessionStore({ native: () => false, bridge: new Proxy({}, { get: () => { throw new Error('native access'); } }) });
  assert.equal(await store.load(), null);
  await store.save({}); await store.clear();
  assert.equal(store.token(), '');
});

test('logout serializes native clear after an in-flight save and cannot resurrect the old session', async () => {
  let release;
  let disk;
  const bridge = {
    read: async () => ({}),
    save: async value => { await new Promise(resolve => { release = resolve; }); disk = value; },
    clear: async () => { disk = null; },
  };
  const store = createSessionStore({ native: () => true, bridge, now: () => 0 });
  const saving = store.save({ token: 'old', userId: 'old-user', expiresAt: new Date(10000).toISOString() });
  await new Promise(resolve => setImmediate(resolve));
  const clearing = store.clear();
  release();
  await assert.rejects(saving, /session changed/);
  await clearing;
  assert.equal(store.token(), '');
  assert.equal(disk, null);
});

test('credential allowlist rejects lookalike origins and unrelated proxy paths', () => {
  assert.equal(isFirstPartyUrl('https://api.example.test/profile/view', 'https://api.example.test'), true);
  assert.equal(isFirstPartyUrl('https://api.example.test.evil.test/profile/view', 'https://api.example.test'), false);
  assert.equal(isFirstPartyUrl('https://api.cloudinary.com/upload', 'https://api.example.test'), false);
  assert.equal(isFirstPartyUrl('/api/profile/view', '/api', 'http://localhost:5173'), true);
  assert.equal(isFirstPartyUrl('/api-other/profile', '/api', 'http://localhost:5173'), false);
  assert.equal(isFirstPartyUrl('//evil.test/api/profile', '/api', 'http://localhost:5173'), false);
});
