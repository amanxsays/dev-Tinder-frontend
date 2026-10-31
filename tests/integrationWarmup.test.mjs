import test from 'node:test';
import assert from 'node:assert/strict';
import { warmIntegrationService } from '../src/utils/integrationWarmup.js';

test('a slow wake-up is shared across repeated callers without blocking startup', async () => {
  const calls = [];
  let finish;
  const fetchImpl = (url, options) => {
    calls.push({ url, options });
    return new Promise(resolve => { finish = resolve; });
  };
  const first = warmIntegrationService(' https://spring.example.test/ ', fetchImpl);
  const second = warmIntegrationService('https://spring.example.test', fetchImpl);
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://spring.example.test/api/ping');
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.mode, 'no-cors');
  assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.body, undefined);
  assert.equal(calls[0].options.signal.aborted, false);
  finish({ type: 'opaque', status: 0 });
  assert.equal(await first, undefined);
  await warmIntegrationService('https://spring.example.test/', fetchImpl);
  assert.equal(calls.length, 1);
});

test('missing configuration or Fetch skips the request', async () => {
  let calls = 0;
  const fetchImpl = () => { calls++; };
  await warmIntegrationService('', fetchImpl);
  await warmIntegrationService('   ', fetchImpl);
  await warmIntegrationService(undefined, fetchImpl);
  await warmIntegrationService('https://no-fetch.example.test', null);
  assert.equal(calls, 0);
});

test('network failures are silent and do not cause automatic retries', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; throw new TypeError('Service unavailable'); };
  await assert.doesNotReject(warmIntegrationService('https://offline.example.test', fetchImpl));
  await warmIntegrationService('https://offline.example.test', fetchImpl);
  assert.equal(calls, 1);
});

test('the local proxy path is used unchanged apart from its trailing slash', async () => {
  let requested;
  await warmIntegrationService('/integration-api/', async url => { requested = url; });
  assert.equal(requested, '/integration-api/api/ping');
});

test('a stalled request is aborted after two minutes and resolves without an error', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let signal;
  const request = warmIntegrationService('https://stalled.example.test', (_url, options) => {
    signal = options.signal;
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Aborted'))));
  });
  await Promise.resolve();
  t.mock.timers.tick(119999);
  assert.equal(signal.aborted, false);
  t.mock.timers.tick(1);
  assert.equal(signal.aborted, true);
  await assert.doesNotReject(request);
});
