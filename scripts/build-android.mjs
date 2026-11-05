import { build, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const debug = process.argv.includes('--debug');
const env = { ...loadEnv('android', root, 'VITE_'), ...process.env };
for (const key of ['VITE_API_URL', 'VITE_STATS_SERVICE_URL']) {
  let url;
  try { url = new URL(env[key]); } catch { throw new Error(`${key} must be an absolute service base URL. See .env.android.example.`); }
  const localDebug = debug && url.protocol === 'http:' && ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname);
  if ((!localDebug && url.protocol !== 'https:') || url.username || url.password || url.search || url.hash) {
    throw new Error(`${key} must use HTTPS without credentials, query, or fragment. Only --debug permits emulator loopback HTTP.`);
  }
}
await build({ root, mode: 'android', define: {
  'import.meta.env.VITE_ANDROID_ENV': JSON.stringify(debug ? 'development' : 'production'),
} });
await writeFile(new URL('../dist-android/devtinder-build.json', import.meta.url),
  JSON.stringify({ environment: debug ? 'development' : 'production', application: 'DevTinder' }) + '\n');
