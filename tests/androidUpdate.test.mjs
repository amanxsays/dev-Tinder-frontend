import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAndroidUpdate, validateAndroidRelease, UPDATE_MANIFEST_URL } from '../src/utils/androidUpdate.js';
const release = { applicationId: 'com.amanxsays.devtinder', versionCode: 5, versionName: '1.0.4',
  apkUrl: 'https://devtinderfront.netlify.app/downloads/DevTinder-1.0.4.apk', sha256: 'a'.repeat(64), bytes: 5000 };
const check = (build, value = release) => checkAndroidUpdate({ getInfo: async () => ({ id: release.applicationId, build: String(build), version: '1.0.3' }),
  fetchImpl: async (url, options) => { assert.equal(url, UPDATE_MANIFEST_URL); assert.equal(options.cache, 'no-store');
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error'); return new Response(JSON.stringify(value)); } });
test('older installed build requires update; equal/newer builds remain usable', async () => {
  assert.equal((await check(4)).status, 'required'); assert.equal((await check(5)).status, 'current'); assert.equal((await check(6)).status, 'current');
});
test('untrusted URL, package, version and hash cannot offer an update', () => {
  for (const patch of [{ apkUrl: 'https://evil.invalid/file.apk' }, { apkUrl: release.apkUrl + '?redirect=bad' },
    { applicationId: 'another.app' }, { versionCode: '5' }, { versionCode: -1 }, { versionName: '<script>' }, { sha256: '' }, { bytes: 0 }]) {
    assert.throws(() => validateAndroidRelease({ ...release, ...patch }));
  }
});
test('HTTP errors, invalid JSON, oversized response and invalid installed identity fail closed', async () => {
  const getInfo = async () => ({ id: release.applicationId, build: '4' });
  for (const response of [new Response('down', { status: 503 }), new Response('<html>not manifest</html>'), new Response(' '.repeat(8193))]) {
    await assert.rejects(checkAndroidUpdate({ getInfo, fetchImpl: async () => response }));
  }
  await assert.rejects(checkAndroidUpdate({ getInfo: async () => ({ id: 'wrong.app', build: '4' }), fetchImpl: async () => assert.fail('must not fetch') }));
});
test('network cancellation propagates instead of treating unknown version as current', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(checkAndroidUpdate({ getInfo: async () => ({ id: release.applicationId, build: '4' }), signal: controller.signal,
    fetchImpl: async (_url, options) => { assert.equal(options.signal.aborted, true); throw new DOMException('Cancelled', 'AbortError'); } }));
});
