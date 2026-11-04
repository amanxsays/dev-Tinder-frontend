import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeSpeechEngines } from '../src/platform/nativeSpeech.js';
import { createSpeechRuntime } from '../src/utils/speechRuntime.js';

const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  const listeners = new Set();
  const calls = [];
  const plugin = {
    getCapabilities: async () => ({ recognition: true, synthesis: true }),
    addListener: async (name, callback) => { listeners.add(callback); return { remove: async () => listeners.delete(callback) }; },
    start: async value => calls.push(['start', value]), stop: async value => calls.push(['stop', value]),
    cancel: async value => calls.push(['cancel', value]), speak: async value => calls.push(['speak', value]),
    stopSpeaking: async () => calls.push(['stopSpeaking']),
  };
  return { plugin, calls, emit: event => [...listeners].forEach(callback => callback(event)) };
}

test('native partial/final recognition follows existing review/cancel boundaries and ignores stale sessions', async () => {
  const fake = fixture();
  const engines = await createNativeSpeechEngines(fake.plugin);
  const runtime = createSpeechRuntime({ ...engines, secureContext: true });
  let draft = 'Existing';
  runtime.start({ owner: 'a', draft, onDraft: text => { draft = text; } });
  await flush();
  const id = fake.calls.find(([name]) => name === 'start')[1].sessionId;
  fake.emit({ sessionId: id, type: 'start' });
  fake.emit({ sessionId: id, type: 'partial', text: 'Hello' });
  assert.equal(draft, 'Existing');
  assert.equal(runtime.getSnapshot().interim, 'Hello');
  fake.emit({ sessionId: id, type: 'final', text: 'Hello world' });
  assert.equal(draft, 'Existing Hello world');
  fake.emit({ sessionId: id, type: 'end' });
  assert.equal(runtime.getSnapshot().status, 'review');
  runtime.start({ owner: 'b', draft: '', onDraft: text => { draft = text; } });
  fake.emit({ sessionId: id, type: 'final', text: 'stale words' });
  assert.equal(draft, 'Existing Hello world');
  runtime.cancel('b');
  await flush();
  runtime.reset();
});

test('native read aloud speaks chunks sequentially and cancellation rejects late completion', async () => {
  const fake = fixture();
  const runtime = createSpeechRuntime({ ...await createNativeSpeechEngines(fake.plugin), secureContext: true });
  runtime.speak({ owner: 'a', messageId: 'answer-1', chunks: ['First.', 'Second.'] });
  await flush();
  const first = fake.calls.find(([name]) => name === 'speak')[1];
  fake.emit({ sessionId: first.sessionId, type: 'speechEnd' });
  await flush();
  assert.equal(fake.calls.filter(([name]) => name === 'speak').length, 2);
  runtime.stopSpeaking();
  const second = fake.calls.filter(([name]) => name === 'speak')[1][1];
  fake.emit({ sessionId: second.sessionId, type: 'speechEnd' });
  assert.equal(runtime.getSnapshot().speaking, null);
  runtime.reset();
});
