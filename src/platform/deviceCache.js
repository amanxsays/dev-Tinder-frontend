import { isAndroid, NativeDeviceData } from './platform';
import { session } from './session';
export async function readDeviceCache(userId, key) {
  if (!isAndroid() || !userId || session.snapshot()?.userId !== userId || !session.token()) return null;
  try {
    const result = await NativeDeviceData.readCache({ userId, key });
    const record = JSON.parse(result.value || 'null');
    if (session.snapshot()?.userId !== userId || !session.token()) return null;
    return record?.data ?? null;
  } catch { return null; }
}
export async function writeDeviceCache(userId, key, data) {
  if (!isAndroid() || !userId || session.snapshot()?.userId !== userId || !session.token()) return;
  try { await NativeDeviceData.writeCache({ userId, key, value: JSON.stringify({ data, savedAt: Date.now() }) }); } catch { /* Cache failures never block online operation. */ }
}
