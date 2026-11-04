import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { warmIntegrationService, ensureIntegrationReady } from '../src/utils/integrationWarmup.js';

const READY = 'Integration Service is up and running!';
const healthy = () => new Response(READY);

test('startup shares one slow, readable ping without blocking rendering', async () => {
  const calls = [];
  let finish;
  const fetchImpl = (url, options) => {
    calls.push({ url, options });
    return new Promise(resolve => { finish = resolve; });
  };
  const first = warmIntegrationService(' https://spring.example.test/ ', fetchImpl);
  const second = warmIntegrationService('https://spring.example.test', fetchImpl);
  assert.equal(first, second);
  await nextTurn();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://spring.example.test/api/ping');
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.mode, 'cors');
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.body, undefined);
  finish(healthy());
  await first;
  await warmIntegrationService('https://spring.example.test/', fetchImpl);
  assert.equal(calls.length, 1);
});

test('missing configuration skips startup and gives a waiting message a useful error', async () => {
  let calls = 0;
  const fetchImpl = () => { calls++; };
  await warmIntegrationService('', fetchImpl);
  await warmIntegrationService('   ', fetchImpl);
  await warmIntegrationService(undefined, fetchImpl);
  await warmIntegrationService('https://no-fetch.example.test', null);
  await assert.rejects(ensureIntegrationReady('', { fetchImpl }), /not configured/);
  assert.equal(calls, 0);
});

test('startup failure is silent; a later question can make a fresh attempt', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    if (++calls === 1) throw new TypeError('Offline');
    return healthy();
  };
  await assert.doesNotReject(warmIntegrationService('https://offline.example.test', fetchImpl));
  await warmIntegrationService('https://offline.example.test', fetchImpl);
  assert.equal(calls, 1);
  await ensureIntegrationReady('https://offline.example.test', { fetchImpl });
  assert.equal(calls, 2);
});

test('a question joins the startup ping and sends no duplicate probe', async () => {
  let calls = 0, finish;
  const fetchImpl = () => { calls++; return new Promise(resolve => { finish = resolve; }); };
  const startup = warmIntegrationService('https://shared.example.test', fetchImpl);
  const waiting = ensureIntegrationReady('https://shared.example.test', { fetchImpl });
  await nextTurn();
  assert.equal(calls, 1);
  finish(healthy());
  await Promise.all([startup, waiting]);
});

test('a previous success is rechecked because the service might have slept again', async () => {
  let calls = 0, finish;
  const fetchImpl = () => ++calls === 1 ? healthy() : new Promise(resolve => { finish = resolve; });
  await warmIntegrationService('https://idle.example.test', fetchImpl);
  const waiting = ensureIntegrationReady('https://idle.example.test', { fetchImpl });
  await nextTurn();
  assert.equal(calls, 2);
  finish(healthy());
  await waiting;
});

test('HTML wake-up pages and HTTP failures never establish readiness', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const responses = [new Response('<html>Starting...</html>'), new Response('Unavailable', { status: 503 }), healthy()];
  const waiting = ensureIntegrationReady('https://starting.example.test', {
    fetchImpl: async () => responses[calls++],
  });
  await nextTurn();
  assert.equal(calls, 1);
  t.mock.timers.tick(3000);
  await nextTurn();
  assert.equal(calls, 2);
  t.mock.timers.tick(3000);
  await waiting;
  assert.equal(calls, 3);
  t.mock.timers.tick(600000);
  assert.equal(calls, 3);
});

test('opaque responses cannot falsely declare readiness', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const waiting = ensureIntegrationReady('https://opaque.example.test', {
    fetchImpl: async () => ++calls === 1 ? { ok: false, type: 'opaque', status: 0 } : healthy(),
  });
  await nextTurn();
  assert.equal(calls, 1);
  t.mock.timers.tick(3000);
  await waiting;
  assert.equal(calls, 2);
});

test('the development health request uses the existing proxy path', async () => {
  let requested;
  await ensureIntegrationReady('/integration-api/', {
    fetchImpl: async url => { requested = url; return healthy(); },
  });
  assert.equal(requested, '/integration-api/api/ping');
});

test('a stalled startup stops after three minutes and reports the unsent question', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal;
  const waiting = ensureIntegrationReady('https://stalled.example.test', {
    fetchImpl: (_url, options) => {
      signal = options.signal;
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted'))));
    },
  });
  const rejection = assert.rejects(waiting, /after 3 minutes.*question was not sent/);
  await nextTurn();
  t.mock.timers.tick(179999);
  assert.equal(signal.aborted, false);
  t.mock.timers.tick(1);
  await rejection;
  assert.equal(signal.aborted, true);
});

test('cancelling the only waiter aborts its pending health request', async () => {
  const controller = new AbortController();
  let signal;
  const waiting = ensureIntegrationReady('https://cancel.example.test', {
    signal: controller.signal,
    fetchImpl: (_url, options) => {
      signal = options.signal;
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted'))));
    },
  });
  const rejection = assert.rejects(waiting, { name: 'AbortError' });
  await nextTurn();
  controller.abort();
  await rejection;
  assert.equal(signal.aborted, true);
});

test('one cancelled consumer does not cancel another consumer of the same probe', async () => {
  let finish, signal, calls = 0;
  const fetchImpl = (_url, options) => {
    calls++; signal = options.signal;
    return new Promise(resolve => { finish = resolve; });
  };
  const controller = new AbortController();
  const first = ensureIntegrationReady('https://consumers.example.test', { signal: controller.signal, fetchImpl });
  const second = ensureIntegrationReady('https://consumers.example.test', { fetchImpl });
  const rejection = assert.rejects(first, { name: 'AbortError' });
  await nextTurn();
  controller.abort();
  await rejection;
  assert.equal(calls, 1);
  assert.equal(signal.aborted, false);
  finish(healthy());
  await second;
});

test('cancelling during retry backoff prevents all subsequent probes', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const controller = new AbortController();
  let calls = 0;
  const waiting = ensureIntegrationReady('https://backoff.example.test', {
    signal: controller.signal,
    fetchImpl: async () => { calls++; throw new TypeError('Offline'); },
  });
  const rejection = assert.rejects(waiting, { name: 'AbortError' });
  await nextTurn();
  controller.abort();
  await rejection;
  t.mock.timers.tick(600000);
  assert.equal(calls, 1);
});
