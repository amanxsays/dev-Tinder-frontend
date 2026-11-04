import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAndroidSetup } from '../scripts/android-preflight.mjs';

const root = process.cwd();
const env = { VITE_API_URL: 'https://api.example.test', VITE_STATS_SERVICE_URL: 'https://ai.example.test' };
const firebase = packageName => ({ project_info: { project_id: 'fixture', project_number: '123' },
  client: [{ client_info: { android_client_info: { package_name: packageName }, mobilesdk_app_id: 'fixture-app' },
    api_key: [{ current_key: 'fixture-public-key' }] }] });
const run = options => checkAndroidSetup({ root, env, debug: true,
  isFile: () => true, readJson: () => firebase('com.amanxsays.devtinder.debug'), ...options });

test('debug accepts matching Firebase inputs without release credentials', () => {
  assert.equal(run().ok, true);
});

test('missing Firebase configuration fails push readiness without exposing values', () => {
  const result = run({ isFile: () => false });
  assert.equal(result.ok, false);
  assert.match(result.checks.at(-1).message, /src\/debug\/google-services.json/);
});

test('variant file takes precedence over root Firebase configuration', () => {
  let selected;
  assert.equal(run({ readJson: path => { selected = path; return firebase('com.amanxsays.devtinder.debug'); } }).ok, true);
  assert.match(selected.replaceAll('\\', '/'), /src\/debug\/google-services.json$/);
});

test('wrong package, incomplete metadata and malformed JSON fail safely', () => {
  for (const readJson of [() => firebase('another.app'), () => ({}), () => { throw Error('private content'); }]) {
    const result = run({ readJson });
    assert.equal(result.ok, false);
    assert.doesNotMatch(JSON.stringify(result), /private content/);
  }
});

test('cleartext loopback is debug-only; credentials, query and fragments are rejected', () => {
  assert.equal(run({ env: { ...env, VITE_API_URL: 'http://10.0.2.2:17777' } }).ok, true);
  for (const url of ['http://api.example.test', 'https://user:secret@example.test', 'https://example.test?key=secret', 'https://example.test#secret']) {
    const result = run({ env: { ...env, VITE_API_URL: url } });
    assert.equal(result.ok, false);
    assert.doesNotMatch(JSON.stringify(result), /secret/);
  }
});

test('release requires all signing inputs and an existing keystore', () => {
  const options = { debug: false, readJson: () => firebase('com.amanxsays.devtinder') };
  assert.equal(run(options).ok, false);
  const signing = { ...env, DEVTINDER_KEYSTORE_PATH: 'fixture.jks', DEVTINDER_KEYSTORE_PASSWORD: 'secret',
    DEVTINDER_KEY_ALIAS: 'release', DEVTINDER_KEY_PASSWORD: 'secret' };
  const result = run({ ...options, env: signing });
  assert.equal(result.ok, true);
  assert.doesNotMatch(JSON.stringify(result), /secret/);
  assert.equal(run({ ...options, env: signing, isFile: path => !path.endsWith('.jks') }).ok, false);
  assert.equal(run({ ...options, env: { ...signing, VITE_API_URL: 'http://10.0.2.2' } }).ok, false);
});
