import { createHash } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { androidRelease } from '../src/utils/androidRelease.js';

// Web builds mirror the published APK. No binary enters Git or the native bundle.
export async function prepareAndroidDownload({
  outputDir = fileURLToPath(new URL('../dist/downloads/', import.meta.url)),
  fetchImpl = globalThis.fetch,
  release = androidRelease,
} = {}) {
  const response = await fetchImpl(release.sourceUrl, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`APK download failed: HTTP ${response.status}`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > release.bytes) throw new Error('APK exceeds expected size; refusing to publish.');
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (size !== release.bytes || hash !== release.sha256) {
    throw new Error('APK integrity check failed; refusing to publish.');
  }
  const destination = join(outputDir, release.filename);
  const temporary = destination + '.tmp';
  await mkdir(dirname(destination), { recursive: true });
  try {
    await writeFile(temporary, bytes);
    await rename(temporary, destination);
    await writeFile(join(outputDir, 'SHA256SUMS.txt'), `${hash}  ${release.filename}\n`);
  } finally {
    await rm(temporary, { force: true });
  }
  return destination;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await prepareAndroidDownload();
  console.log('Verified Android APK staged for same-site download.');
}
