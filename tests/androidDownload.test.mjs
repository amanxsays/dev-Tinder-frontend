import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { prepareAndroidDownload } from '../scripts/prepare-android-download.mjs';

const payload = Buffer.from('fixture-apk');
const release = {
  filename: 'fixture.apk', bytes: payload.length,
  sha256: createHash('sha256').update(payload).digest('hex'),
  sourceUrl: 'https://release.fixture.invalid/fixture.apk',
};
async function output(t) {
  const directory = await mkdtemp(join(tmpdir(), 'devtinder-apk-test-'));
  assert.ok(directory.startsWith(join(tmpdir(), 'devtinder-apk-test-')));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('web mirror publishes only verified APK bytes and matching checksum', async t => {
  const outputDir = await output(t);
  const path = await prepareAndroidDownload({ outputDir, release,
    fetchImpl: async url => { assert.equal(url, release.sourceUrl); return new Response(payload); } });
  assert.deepEqual(await readFile(path), payload);
  assert.equal(await readFile(join(outputDir, 'SHA256SUMS.txt'), 'utf8'), `${release.sha256}  fixture.apk\n`);
});

test('changed APK hash fails the build instead of publishing unverified content', async t => {
  const outputDir = await output(t);
  await assert.rejects(prepareAndroidDownload({ outputDir, release,
    fetchImpl: async () => new Response(Buffer.alloc(payload.length)) }), /integrity/);
  await assert.rejects(access(join(outputDir, 'fixture.apk')));
});

test('truncated or oversized APK cannot become a download asset', async t => {
  const outputDir = await output(t);
  for (const bytes of [payload.subarray(0, 3), Buffer.concat([payload, payload])]) {
    await assert.rejects(prepareAndroidDownload({ outputDir, release,
      fetchImpl: async () => new Response(bytes) }), /integrity|expected size/);
  }
  await assert.rejects(access(join(outputDir, 'fixture.apk')));
});

test('release host failure fails the build instead of publishing an error page as APK', async t => {
  const outputDir = await output(t);
  await assert.rejects(prepareAndroidDownload({ outputDir, release,
    fetchImpl: async () => new Response('<html>Unavailable</html>', { status: 503 }) }), /HTTP 503/);
  await assert.rejects(access(join(outputDir, 'fixture.apk')));
});

test('version manifest is emitted only with a verified matching APK', async t => {
  const outputDir = join(await output(t), 'downloads');
  const metadata = { ...release, applicationId: 'com.amanxsays.devtinder', versionCode: 5, versionName: '1.0.4',
    downloadPath: '/downloads/DevTinder-1.0.4.apk' };
  await prepareAndroidDownload({ outputDir, release: metadata, fetchImpl: async () => new Response(payload) });
  const manifest = JSON.parse(await readFile(join(outputDir, '../android-version.json'), 'utf8'));
  assert.equal(manifest.versionCode, 5); assert.equal(manifest.sha256, release.sha256);
  const rejectedDir = join(await output(t), 'downloads');
  await assert.rejects(prepareAndroidDownload({ outputDir: rejectedDir, release: metadata, fetchImpl: async () => new Response('wrong') }));
  await assert.rejects(access(join(rejectedDir, '../android-version.json')));
});
