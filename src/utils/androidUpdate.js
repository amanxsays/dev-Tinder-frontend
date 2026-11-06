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

export async function checkAndroidUpdate({ getInfo, fetchImpl = globalThis.fetch, signal }) {
  const info = await getInfo();
  const installed = Number(info.build);
  if (info.id !== packageId || !Number.isSafeInteger(installed) || installed < 1) throw new Error('Cannot verify installed app');
  const response = await fetchImpl(UPDATE_MANIFEST_URL, { cache: 'no-store', credentials: 'omit', redirect: 'error', signal });
  if (!response.ok) throw new Error('Update check unavailable');
  const raw = await response.text();
  if (raw.length > 8192) throw new Error('Invalid update information');
  const release = validateAndroidRelease(JSON.parse(raw));
  return { status: installed < release.versionCode ? 'required' : 'current', release, installedVersion: info.version };
}
