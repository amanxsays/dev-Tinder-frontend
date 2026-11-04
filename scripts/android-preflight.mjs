import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

// This checks local inputs only; it never authenticates, uploads, or prints secrets.
export function checkAndroidSetup({ root, env = {}, debug = false,
  isFile = path => existsSync(path) && statSync(path).isFile(),
  readJson = path => JSON.parse(readFileSync(path, 'utf8')) } = {}) {
  const checks = [];
  const add = (ok, message) => checks.push({ ok, message });
  for (const key of ['VITE_API_URL', 'VITE_STATS_SERVICE_URL']) {
    let valid = false;
    try {
      const url = new URL(env[key]);
      const local = debug && url.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname);
      valid = (url.protocol === 'https:' || local) &&
        !url.username && !url.password && !url.search && !url.hash;
    } catch { /* Report the setting name, never the value. */ }
    add(valid, `${key}: ${valid ? 'valid service URL' : 'set an absolute HTTPS URL (debug also permits emulator loopback HTTP)'}`);
  }

  const variant = debug ? 'debug' : 'release';
  const packageId = `com.amanxsays.devtinder${debug ? '.debug' : ''}`;
  const candidates = [`android/app/src/${variant}/google-services.json`, 'android/app/google-services.json'];
  const config = candidates.find(path => isFile(resolve(root, path)));
  if (!config) {
    add(false, `Firebase: supply android/app/src/${variant}/google-services.json for ${packageId}`);
  } else {
    try {
      const json = readJson(resolve(root, config));
      const matching = json.client?.find(client =>
        client.client_info?.android_client_info?.package_name === packageId);
      const valid = Boolean(json.project_info?.project_id &&
        json.project_info?.project_number && matching?.client_info?.mobilesdk_app_id &&
        matching.api_key?.some(key => typeof key.current_key === 'string' && key.current_key.trim()));
      add(valid, `Firebase: ${valid ? 'client metadata matches' : 'missing client metadata or wrong package; expected'} ${packageId}`);
    } catch {
      add(false, 'Firebase: configuration is not valid client JSON; download it again from your Firebase project');
    }
  }

  if (!debug) {
    for (const key of ['DEVTINDER_KEYSTORE_PATH', 'DEVTINDER_KEYSTORE_PASSWORD',
      'DEVTINDER_KEY_ALIAS', 'DEVTINDER_KEY_PASSWORD']) {
      const present = typeof env[key] === 'string' && Boolean(env[key].trim());
      add(present, `${key}: ${present ? 'set' : 'missing; supply through the release environment'}`);
    }
    if (env.DEVTINDER_KEYSTORE_PATH?.trim()) {
      const absolute = isAbsolute(env.DEVTINDER_KEYSTORE_PATH);
      add(absolute && isFile(env.DEVTINDER_KEYSTORE_PATH), 'Release keystore: must be an absolute path to an existing file');
    }
  }
  return { ok: checks.every(check => check.ok), checks };
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const debug = process.argv.includes('--debug');
  const result = checkAndroidSetup({ root, debug,
    env: { ...loadEnv('android', root, 'VITE_'), ...process.env } });
  process.stdout.write(`DevTinder Android ${debug ? 'debug' : 'release'} setup\n`);
  for (const check of result.checks) process.stdout.write(`${check.ok ? 'PASS' : 'MISSING'} ${check.message}\n`);
  process.stdout.write('Local input checks only: Firebase authorization/delivery, keystore validity, deployed backend compatibility, and real-device behavior still require verification.\n');
  process.exitCode = result.ok ? 0 : 1;
}
