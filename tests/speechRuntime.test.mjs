import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpeechRuntime } from '../src/utils/speechRuntime.js';

function setup() {
  const engines = [];
  const timers = new Map();
  let timerId = 0;
  class Recognition {
    constructor() { engines.push(this); }
    start() {}
    stop() { this.stopped = true; }
    abort() { this.aborted = true; }
  }
  const utterances = [];
  const synthesis = {
    cancelled: 0,
    getVoices: () => [{ lang: 'en-IN', name: 'English' }],
    speak: utterance => utterances.push(utterance),
    cancel() { this.cancelled++; },
  };
  class Utterance { constructor(text) { this.text = text; } }
  const runtime = createSpeechRuntime({ Recognition, synthesis, Utterance, now: () => 123,
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
  });
  const drafts = new Map();
  const start = (owner = 'one', draft = 'Typed') => {
    drafts.set(owner, draft);
    runtime.start({ owner, draft, onDraft: text => drafts.set(owner, text) });
    return engines.at(-1);
  };
  const result = (engine, parts) => engine.onresult({ results: parts.map(([text, final]) => Object.assign([{ transcript: text }], { isFinal: final })) });
  const fire = delay => {
    for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.callback(); }
  };
  return { runtime, engines, timers, drafts, start, result, fire, synthesis, utterances };
}

test('interim revisions never duplicate confirmed text and do not enter the draft', () => {
  const { runtime, drafts, start, result } = setup();
  const engine = start();
  engine.onstart();
  result(engine, [['Hello', true], ['wor', false]]);
  result(engine, [['Hello', true], ['world', false]]);
  assert.equal(drafts.get('one'), 'Typed Hello');
  assert.equal(runtime.getSnapshot().interim, 'world');
  result(engine, [['Hello', true], ['world', true]]);
  result(engine, [['Hello', true], ['world', true]]);
  assert.equal(drafts.get('one'), 'Typed Hello world');
});

test('stop waits for final results, ends in review and never sends', () => {
  const { runtime, drafts, start, result } = setup();
  const engine = start();
  engine.onstart();
  runtime.stop('one');
  assert.equal(runtime.getSnapshot().status, 'finishing');
  assert.equal(engine.stopped, true);
  result(engine, [['final words', true]]);
  engine.onend();
  assert.equal(drafts.get('one'), 'Typed final words');
  assert.equal(runtime.getSnapshot().status, 'review');
});

test('cancel restores exact original draft and rejects saved late callbacks', () => {
  const { runtime, drafts, start, result } = setup();
  const engine = start('one', '  original\n');
  engine.onstart();
  const late = engine.onresult;
  result(engine, [['new text', true]]);
  runtime.cancel('one');
  assert.equal(drafts.get('one'), '  original\n');
  late({ results: [Object.assign([{ transcript: 'late' }], { isFinal: true })] });
  assert.equal(drafts.get('one'), '  original\n');
  assert.equal(engine.aborted, true);
});

test('another conversation interrupts prior capture and keeps confirmed text separate', () => {
  const { runtime, drafts, start, result } = setup();
  const old = start('one');
  old.onstart();
  result(old, [['saved', true], ['temporary', false]]);
  const late = old.onend;
  start('two', 'Second');
  late();
  assert.equal(drafts.get('one'), 'Typed saved');
  assert.equal(drafts.get('two'), 'Second');
  assert.equal(runtime.getSnapshot().owner, 'two');
  assert.equal(runtime.getSnapshot().status, 'permission');
});

test('60 second limit stops and finishing watchdog recovers without browser end', () => {
  const { runtime, start, fire } = setup();
  const engine = start();
  engine.onstart();
  fire(60000);
  assert.equal(runtime.getSnapshot().status, 'finishing');
  fire(2000);
  assert.equal(runtime.getSnapshot().status, 'review');
  assert.equal(engine.aborted, true);
});

test('permission timeout releases microphone and preserves the typed draft', () => {
  const { runtime, drafts, start, fire } = setup();
  const engine = start();
  fire(15000);
  assert.equal(runtime.getSnapshot().status, 'error');
  assert.equal(drafts.get('one'), 'Typed');
  assert.equal(engine.aborted, true);
});

test('permission denial and network errors keep confirmed text', () => {
  for (const code of ['not-allowed', 'network', 'audio-capture', 'no-speech']) {
    const { runtime, start, drafts, result } = setup();
    const engine = start();
    engine.onstart();
    result(engine, [['confirmed', true], ['unconfirmed', false]]);
    engine.onerror({ error: code });
    assert.equal(drafts.get('one'), 'Typed confirmed');
    assert.equal(runtime.getSnapshot().status, 'error');
    assert.ok(runtime.getSnapshot().error);
  }
});

test('release on close/background keeps only confirmed results and ignores late end', () => {
  const { runtime, start, result, drafts } = setup();
  const engine = start();
  engine.onstart();
  result(engine, [['confirmed', true], ['interim', false]]);
  const late = engine.onend;
  runtime.release('one');
  late();
  assert.equal(drafts.get('one'), 'Typed confirmed');
  assert.equal(runtime.getSnapshot().interim, '');
  assert.equal(engine.aborted, true);
});

test('unsupported and insecure recognition preserve text without constructing capture', () => {
  let constructed = false;
  const runtime = createSpeechRuntime({ Recognition: class { constructor() { constructed = true; } }, secureContext: false });
  assert.equal(runtime.start({ owner: 'one', draft: 'text', onDraft: () => assert.fail() }), false);
  assert.equal(constructed, false);
  assert.match(runtime.getSnapshot().error, /HTTPS/);
  const unsupported = createSpeechRuntime();
  assert.equal(unsupported.recognitionSupported, false);
});

test('synthesis speaks chunks sequentially and stop rejects queued late callbacks', () => {
  const { runtime, utterances, synthesis } = setup();
  runtime.speak({ owner: 'one', messageId: 'answer', chunks: ['First.', 'Second.'] });
  assert.equal(utterances.length, 1);
  utterances[0].onend();
  assert.equal(utterances.length, 2);
  const late = utterances[1].onend;
  runtime.stopSpeaking();
  late();
  assert.equal(runtime.getSnapshot().speaking, null);
  assert.equal(synthesis.cancelled, 1);
  assert.equal(utterances.length, 2);
});

test('dictation cancels playback; playback releases microphone', () => {
  const { runtime, start, utterances } = setup();
  runtime.speak({ owner: 'one', messageId: 'a', chunks: ['Answer'] });
  const oldEnd = utterances[0].onend;
  const engine = start();
  assert.equal(runtime.getSnapshot().speaking, null);
  oldEnd();
  engine.onstart();
  runtime.speak({ owner: 'one', messageId: 'b', chunks: ['Other answer'] });
  assert.equal(engine.aborted, true);
  assert.equal(runtime.getSnapshot().speaking.messageId, 'b');
});

test('speech errors keep content usable, and reset invalidates every active session', () => {
  const { runtime, utterances, start, drafts } = setup();
  runtime.speak({ owner: 'one', messageId: 'a', chunks: ['Answer'] });
  utterances[0].onerror();
  assert.equal(runtime.getSnapshot().speaking, null);
  assert.ok(runtime.getSnapshot().speechError);
  const engine = start();
  const late = engine.onresult;
  runtime.reset();
  late({ results: [Object.assign([{ transcript: 'late' }], { isFinal: true })] });
  assert.equal(drafts.get('one'), 'Typed');
  assert.equal(runtime.getSnapshot().status, 'idle');
});

test('Brave network failures explain browser fallback and preserve the draft', () => {
  for (const code of ['network', 'service-not-allowed']) {
    let engine;
    let draft = 'Keep this draft';
    const runtime = createSpeechRuntime({ Recognition: class {
      constructor() { engine = this; }
      start() {}
      abort() { this.aborted = true; }
    }});
    runtime.setBrowserName('Brave');
    assert.match(runtime.getSnapshot().recognitionHint, /Brave/);
    runtime.start({ owner: 'one', draft, onDraft: value => { draft = value; } });
    engine.onerror({ error: code });
    assert.equal(draft, 'Keep this draft');
    assert.equal(engine.aborted, true);
    assert.match(runtime.getSnapshot().error, /Brave.*Chrome/);
    assert.equal(runtime.getSnapshot().status, 'error');
  }
});
test('Chrome errors keep their normal guidance instead of a Brave diagnosis', () => {
  const { runtime, start } = setup();
  const engine = start();
  engine.onerror({ error: 'network' });
  assert.match(runtime.getSnapshot().error, /could not connect/);
  assert.doesNotMatch(runtime.getSnapshot().error, /Brave/);
});
