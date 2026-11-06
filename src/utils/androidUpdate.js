export const UPDATE_ORIGIN = 'https://devtinderfront.netlify.app';
export const UPDATE_MANIFEST_URL = UPDATE_ORIGIN + '/android-version.json';
const packageId = 'com.amanxsays.devtinder';

export function validateAndroidRelease(value) {
  if (!value || value.applicationId !== packageId || !Number.isSafeInteger(value.versionCode) || value.versionCode < 1
    || !/^\d+\.\d+\.\d+$/.test(value.versionName || '') || !/^[a-f0-9]{64}$/.test(value.sha256 || '')
    || !Number.isSafeInteger(value.bytes) || value.bytes < 1) throw new Error('Invalid update information');
  const expected = UPDATE_ORIGIN + '/downloads/DevTinder-' + value.versionName + '.apk';
  if (value.apkUrl !== expected) throw new Error('Untrusted update URL');
  return { applicationId: packageId, versionCode: value.versionCode, versionName: value.versionName,
    apkUrl: expected, sha256: value.sha256, bytes: value.bytes };
}

export function cachedUpdateDecision(cached, installed, now = Date.now()) {
  if (!cached) return null;
  try {
    const release = validateAndroidRelease(cached.release);
    if (installed < release.versionCode) return { status: 'required', release };
    if (!Number.isFinite(cached.checkedAt) || cached.checkedAt > now || now - cached.checkedAt > 86400000) return null;
    return { status: 'current', release, offline: true };
  } catch { return null; }
}

export async function checkAndroidUpdate({ getInfo, fetchImpl = globalThis.fetch, signal,
  storage = globalThis.localStorage, offline = globalThis.navigator?.onLine === false, now = Date.now() }) {
  const info = await getInfo();
  const installed = Number(info.build);
  if (info.id !== packageId || !Number.isSafeInteger(installed) || installed < 1) throw new Error('Cannot verify installed app');
  if (offline) {
    let cached;
    try { cached = JSON.parse(storage?.getItem('devtinder.verified-release') || 'null'); } catch { /* Invalid cache stays blocked. */ }
    const decision = cachedUpdateDecision(cached, installed, now);
    if (decision) return { ...decision, installedVersion: info.version };
    throw new Error('Connect once to verify this app version');
  }
  try {
    const response = await fetchImpl(UPDATE_MANIFEST_URL, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal });
    if (!response.ok) throw new Error('Update check unavailable');
    const raw = await response.text();
    if (raw.length > 8192) throw new Error('Invalid update information');
    const release = validateAndroidRelease(JSON.parse(raw));
    try { storage?.setItem('devtinder.verified-release', JSON.stringify({ release, checkedAt: now })); } catch { /* Optional offline lease. */ }
    return { status: installed < release.versionCode ? 'required' : 'current', release, installedVersion: info.version };
  } catch (error) {
    if (offline && !signal?.aborted) {
      let cached;
      try { cached = JSON.parse(storage?.getItem('devtinder.verified-release') || 'null'); } catch { /* Reject invalid cache. */ }
      const result = cachedUpdateDecision(cached, installed, now);
      if (result) return { ...result, installedVersion: info.version };
    }
    throw error;
  }
}
