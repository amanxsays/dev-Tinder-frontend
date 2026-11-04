import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationDestination, createNotificationManager } from '../src/platform/nativeNotifications.js';

const binding = { bindingId: 'generation-1', userId: 'account-1', expiresAt: new Date(10000).toISOString() };
const event = { bindingId: 'generation-1', eventId: 'message-1', type: 'message', targetUserId: '68847cafa68d283cb2be86db', expiresAt: new Date(5000).toISOString() };

test('notification routing admits only validated account-bound internal destinations', () => {
  assert.equal(notificationDestination(event, binding, 'account-1', 1000), '/chat/' + event.targetUserId);
  assert.equal(notificationDestination({ ...event, type: 'connection_request' }, binding, 'account-1', 1000), '/requests');
  assert.equal(notificationDestination(event, binding, 'account-2', 1000), null);
  assert.equal(notificationDestination({ ...event, bindingId: 'old-generation' }, binding, 'account-1', 1000), null);
  assert.equal(notificationDestination(event, binding, 'account-1', 5000), null);
  assert.equal(notificationDestination(event, { ...binding, expiresAt: new Date(500).toISOString() }, 'account-1', 1000), null);
});

test('malformed routing IDs, arbitrary URLs and unknown event types are never navigated', () => {
  for (const targetUserId of ['https://evil.test', '../../login', '', 'not-an-id']) {
    assert.equal(notificationDestination({ ...event, targetUserId }, binding, 'account-1', 1000), null);
  }
  assert.equal(notificationDestination({ ...event, type: 'open_url', url: 'https://evil.test' }, binding, 'account-1', 1000), null);
  assert.equal(notificationDestination(null, binding, 'account-1', 1000), null);
});

test('default clock rejects expired payloads without throwing', () => {
  assert.equal(notificationDestination(event, binding, 'account-1'), null);
});

test('offline logout clears a local binding before network cleanup and fences its binding generation', async () => {
  let active = true;
  let headers;
  let release;
  const bridge = { getState: async () => ({ installationId: 'phone', installationSecret: 'capability', bindingId: 'old' }), deactivate: async () => { active = false; } };
  const client = { delete: async (url, config) => { headers = config.headers; await new Promise(resolve => { release = resolve; }); } };
  const manager = createNotificationManager({ native: () => true, bridge, client, apiBase: 'https://api.test', getSession: () => ({}) });
  await manager.disable({ awaitRemote: false });
  assert.equal(active, false);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(headers['X-Installation-Binding'], 'old');
  release();
});

test('an activation finishing after logout is cleared again before later registrations', async () => {
  let active = null;
  let release;
  const bridge = {
    getState: async () => ({ permission: 'granted', installationId: 'phone', installationSecret: 'capability', bindingId: active }),
    getToken: async () => ({ token: 'device-token' }),
    activate: async ({ bindingId }) => { await new Promise(resolve => { release = resolve; }); active = bindingId; },
    deactivate: async () => { active = null; },
  };
  const client = { put: async () => ({ data: { bindingId: 'stale', expiresAt: new Date(Date.now() + 10000).toISOString() } }), delete: async () => {} };
  const manager = createNotificationManager({ native: () => true, bridge, client, apiBase: 'https://api.test', getSession: () => ({ userId: 'a', token: 'jwt' }) });
  const enabling = manager.enable('a');
  await new Promise(resolve => setImmediate(resolve));
  await manager.disable({ awaitRemote: false });
  release();
  assert.equal(await enabling, null);
  assert.equal(active, null);
});

test('offline revocations survive a manager restart and cannot revoke a newer binding', async () => {
  let active = 'old-generation';
  const persisted = new Set();
  let offline = true;
  const attempts = [];
  const bridge = {
    getState: async () => ({ installationId: 'phone', installationSecret: 'capability', bindingId: active }),
    deactivate: async () => { if (active) persisted.add(active); active = null; },
    pendingRevocations: async () => ({ bindings: [...persisted] }),
    completeRevocation: async ({ bindingId }) => { persisted.delete(bindingId); },
  };
  const client = { delete: async (url, config) => {
    attempts.push(config.headers['X-Installation-Binding']);
    if (offline) throw new Error('offline');
    // A later account binding must remain enabled after this stale cleanup.
    if (config.headers['X-Installation-Binding'] !== active) throw { response: { status: 409 } };
    active = null;
  } };
  const options = { native: () => true, bridge, client, apiBase: 'https://api.test', getSession: () => ({}) };
  const manager = createNotificationManager(options);
  await manager.disable({ awaitRemote: false });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(active, null);
  assert.deepEqual([...persisted], ['old-generation']);
  active = 'new-generation'; offline = false;
  await createNotificationManager(options).retryCleanup();
  assert.equal(active, 'new-generation');
  assert.equal(persisted.size, 0);
  assert.deepEqual(attempts, ['old-generation', 'old-generation']);
});

test('logout during registration retains cleanup for the newly returned server binding', async () => {
  let resolveRegistration;
  let registered = false;
  const pending = new Set();
  const bridge = {
    getState: async () => ({ permission: 'granted', installationId: 'phone', installationSecret: 'capability' }),
    getToken: async () => ({ token: 'device-token' }),
    deactivate: async () => {},
    queueRevocation: async ({ bindingId }) => { pending.add(bindingId); },
    completeRevocation: async ({ bindingId }) => { pending.delete(bindingId); },
    activate: async () => { throw new Error('stale binding must not activate'); },
  };
  const client = {
    put: () => new Promise(resolve => { resolveRegistration = resolve; }),
    delete: async () => { registered = false; },
  };
  const manager = createNotificationManager({ native: () => true, bridge, client, apiBase: 'https://api.test', getSession: () => ({ userId: 'a', token: 'jwt' }) });
  const enabling = manager.enable('a');
  await new Promise(resolve => setImmediate(resolve));
  await manager.disable({ awaitRemote: false });
  registered = true;
  resolveRegistration({ data: { bindingId: 'late-binding', expiresAt: new Date(Date.now() + 10000).toISOString() } });
  assert.equal(await enabling, null);
  assert.equal(registered, false);
  assert.equal(pending.size, 0);
});
