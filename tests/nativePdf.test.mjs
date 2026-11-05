import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativePdfManager } from '../src/platform/nativePdf.js';
const source = { fileUrl: 'https://res.cloudinary.com/fixture/raw/upload/resume.pdf', fileName: 'Fixture.pdf' };
const tick = () => new Promise(resolve => setImmediate(resolve));

test('PDF manager reuses its listener and ignores closure from a replaced preview', async () => {
  let listen, count = 0; const opens = [];
  const bridge = { addListener: async (_, callback) => { count++; listen = callback; return {}; }, open: async data => opens.push(data), close: async () => {} };
  const manager = createNativePdfManager({ native: () => true, bridge });
  await manager.open(source); await manager.open(source);
  assert.equal(count, 1); assert.equal(manager.active(), true);
  listen({ previewId: opens[0].previewId }); assert.equal(manager.active(), true);
  listen({ previewId: opens[1].previewId }); assert.equal(manager.active(), false);
});

test('closing while the listener initializes prevents a late native open', async () => {
  let release, opened = 0;
  const manager = createNativePdfManager({ native: () => true, bridge: {
    addListener: () => new Promise(resolve => { release = resolve; }), open: async () => { opened++; }, close: async () => {},
  } });
  const opening = manager.open(source); assert.equal(manager.active(), true);
  await manager.close(); release({}); await opening;
  assert.equal(opened, 0); assert.equal(manager.active(), false);
});

test('a delayed open response cannot revive a closed preview', async () => {
  let release;
  const manager = createNativePdfManager({ native: () => true, bridge: {
    addListener: async () => ({}), open: () => new Promise(resolve => { release = resolve; }), close: async () => {},
  } });
  const opening = manager.open(source); await tick(); await manager.close(); release(); await opening;
  assert.equal(manager.active(), false);
});

test('out-of-order responses and close events cannot deactivate a newer preview', async () => {
  const pending = []; let closed;
  const manager = createNativePdfManager({ native: () => true, bridge: {
    addListener: async (_, callback) => { closed = callback; return {}; },
    open: data => new Promise(resolve => pending.push({ data, resolve })), close: async () => {},
  } });
  const first = manager.open(source); await tick();
  const second = manager.open(source); await tick();
  pending[1].resolve(); await second;
  pending[0].resolve(); await first;
  closed({ previewId: pending[0].data.previewId }); assert.equal(manager.active(), true);
  closed({ previewId: pending[1].data.previewId }); assert.equal(manager.active(), false);
});

test('listener failure recovers without leaving a false active preview', async () => {
  let fail = true;
  const manager = createNativePdfManager({ native: () => true, bridge: {
    addListener: async () => { if (fail) throw Error('bridge'); return {}; }, open: async () => {}, close: async () => {},
  } });
  await assert.rejects(manager.open(source)); assert.equal(manager.active(), false);
  fail = false; await manager.open(source); assert.equal(manager.active(), true);
});

test('native open failure leaves text usable and a subsequent preview can open', async () => {
  let fail = true;
  const manager = createNativePdfManager({ native: () => true, bridge: {
    addListener: async () => ({}), open: async () => { if (fail) throw Error('native unavailable'); }, close: async () => {},
  } });
  await assert.rejects(manager.open(source), /native unavailable/);
  assert.equal(manager.active(), false);
  fail = false; await manager.open(source); assert.equal(manager.active(), true);
});

test('PDF URL checks reject unsafe origins, credentials, ports and non-resume paths before native calls', async () => {
  let calls = 0;
  const manager = createNativePdfManager({ native: () => true, bridge: { addListener: async () => { calls++; } } });
  for (const fileUrl of ['http://res.cloudinary.com/a/raw/upload/r.pdf', 'https://evil.test/raw/upload/r.pdf', 'https://user:pass@res.cloudinary.com/a/raw/upload/r.pdf', 'https://res.cloudinary.com:444/a/raw/upload/r.pdf', 'https://res.cloudinary.com/a/image/upload/r.pdf', 'javascript:alert(1)']) {
    await assert.rejects(manager.open({ fileUrl }));
  }
  assert.equal(calls, 0);
});

test('browser PDF handling never calls an Android bridge', async () => {
  const manager = createNativePdfManager({ native: () => false, bridge: {} });
  await manager.open(source); await manager.close(); assert.equal(manager.active(), false);
});

test('only the current preview closes its React owner without echoing a late native close event', async () => {
  let listener; const opens = []; let first = 0, second = 0;
  const manager = createNativePdfManager({ native: () => true, bridge: {
    addListener: async (_, callback) => { listener = callback; return {}; },
    open: async data => opens.push(data), close: async () => {},
  } });
  await manager.open(source, { onClose: () => { first++; } });
  await manager.open(source, { onClose: () => { second++; } });
  listener({ previewId: opens[0].previewId }); assert.equal(first, 0); assert.equal(second, 0);
  await manager.close(); assert.equal(second, 1);
  listener({ previewId: opens[1].previewId }); assert.equal(second, 1);
});
