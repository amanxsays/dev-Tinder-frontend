import api from './apiClient.js';
import { BASE_URL } from '../utils/constants.js';
import { isAndroid, NativeNotifications } from './platform.js';
import { session } from './session.js';

const objectId = /^[a-f0-9]{24}$/i;
const optInKey = 'devtinder.notifications-opt-in';
export function notificationsOptedIn() { try { return localStorage.getItem(optInKey) === 'true'; } catch { return false; } }
export function notificationPreference() {
  try { const value = localStorage.getItem(optInKey); return value === null ? null : value === 'true'; }
  catch { return false; }
}
export function setNotificationsOptIn(value) { try { localStorage.setItem(optInKey, String(Boolean(value))); } catch { /* Permission UI remains available. */ } }

// Ask once after authentication, using only Android's system permission dialog.
// A stored false is an explicit opt-out or a previous dismissed/denied prompt.
export function createNotificationOnboarding({ native, getPreference, setPreference, getState, requestPermission, enable, getSession }) {
  let pending = null;
  const onboard = userId => {
    const current = () => getSession().userId === userId && Boolean(getSession().token);
    if (!native() || !userId || !current()) return Promise.resolve(null);
    if (pending) return pending.userId === userId ? pending.promise : pending.promise.catch(() => {}).then(() => onboard(userId));
    const promise = (async () => {
      if (getPreference() === false) return null;
      let state = await getState();
      if (!current()) return null;
      if (getPreference() === null) {
        setPreference(false);
        if (state.permission === 'prompt') {
          await requestPermission();
          state = await getState();
        }
        if (!current() || state.permission !== 'granted') return null;
        setPreference(true);
      }
      if (state.permission !== 'granted' || !current()) return null;
      return enable(userId);
    })();
    pending = { userId, promise };
    void promise.finally(() => { if (pending?.promise === promise) pending = null; }).catch(() => {});
    return promise;
  };
  return onboard;
}
export function notificationDestination(payload, binding, accountId, now = Date.now()) {
  if (!payload || !binding?.bindingId || payload.bindingId !== binding.bindingId
    || binding.userId !== accountId || !(Date.parse(payload.expiresAt) > now)
    || !(Date.parse(binding.expiresAt) > now) || typeof payload.eventId !== 'string') return null;
  if (payload.type === 'connection_request') return '/requests';
  if (payload.type === 'message' && objectId.test(payload.targetUserId || '')) return '/chat/' + payload.targetUserId;
  return null;
}

export function createNotificationManager({ native, bridge, client, apiBase, getSession, environment = 'production' }) {
  let mutation = Promise.resolve();
  let generation = 0;
  const serialized = task => {
    const next = mutation.catch(() => {}).then(task);
    mutation = next;
    return next;
  };
  const revoke = async (state, bindingId) => {
    if (!state.installationId || !state.installationSecret || !bindingId) return;
    try {
      await client.delete(apiBase + '/push/installations/' + encodeURIComponent(state.installationId), {
        headers: { 'X-Installation-Secret': state.installationSecret, 'X-Installation-Binding': bindingId }, timeout: 15000,
      });
    } catch (error) {
      // Gone records and newer account generations no longer need this cleanup.
      if (![403, 404, 409, 410].includes(error.response?.status)) throw error;
    }
    await bridge.completeRevocation?.({ bindingId });
  };
  const retryCleanup = async () => {
    if (!bridge.pendingRevocations) return;
    const state = await bridge.getState();
    const pending = await bridge.pendingRevocations();
    for (const bindingId of pending.bindings || []) await revoke(state, bindingId);
  };
  return {
    getState: () => native() ? bridge.getState() : Promise.resolve({ permission: 'unavailable' }),
    retryCleanup: () => native() ? serialized(retryCleanup) : Promise.resolve(),
    enable(userId, { requestPermission = false } = {}) {
      if (!native()) return Promise.resolve(null);
      const epoch = generation;
      return serialized(async () => {
        await retryCleanup().catch(() => {});
        let state = await bridge.getState();
        if (requestPermission) { await bridge.requestPermission(); state = await bridge.getState(); }
        if (state.permission !== 'granted') throw new Error('Notifications are not enabled. You can change this in Android settings.');
        const result = await bridge.getToken();
        const token = result?.token || (typeof result === 'string' ? result : '') || state.token;
        if (!token) throw new Error('Notification registration is unavailable. Check Google Play services and the Firebase setup.');
        if (epoch !== generation || getSession().userId !== userId || !getSession().token) return null;
        const response = await client.put(apiBase + '/push/installations/' + encodeURIComponent(state.installationId), {
          token, installationSecret: state.installationSecret, platform: 'android', environment,
        }, { timeout: 30000 });
        if (epoch !== generation || getSession().userId !== userId || !getSession().token) {
          await bridge.queueRevocation?.({ bindingId: response.data.bindingId });
          await revoke(state, response.data.bindingId).catch(() => {});
          return null;
        }
        await bridge.activate({ ...response.data, userId });
        // Logout may have cleared the binding while native activation was in flight.
        // This task owns the mutation queue until stale activation is removed.
        if (epoch !== generation || getSession().userId !== userId || !getSession().token) {
          await bridge.deactivate();
          await bridge.queueRevocation?.({ bindingId: response.data.bindingId });
          await revoke(state, response.data.bindingId).catch(() => {});
          return null;
        }
        return bridge.getState();
      });
    },
    async disable({ awaitRemote = true } = {}) {
      if (!native()) return;
      generation++;
      const state = await bridge.getState();
      await bridge.deactivate();
      const cleanup = serialized(async () => {
        await revoke(state, state.bindingId);
        await retryCleanup();
      });
      if (awaitRemote) return cleanup;
      void cleanup.catch(() => {});
    },
    rotate(token) {
      if (!native() || !token) return Promise.resolve();
      return serialized(async () => {
        const state = await bridge.getState();
        if (!state.bindingId || !state.installationSecret) return;
        await client.put(apiBase + '/push/installations/' + encodeURIComponent(state.installationId) + '/token',
          { token }, { headers: { 'X-Installation-Secret': state.installationSecret, 'X-Installation-Binding': state.bindingId }, timeout: 15000 });
      });
    },
  };
}

const manager = createNotificationManager({ native: isAndroid, bridge: NativeNotifications, client: api, apiBase: BASE_URL,
  getSession: () => ({ userId: session.snapshot()?.userId, token: session.token() }),
  environment: import.meta.env?.VITE_ANDROID_ENV === 'development' ? 'development' : 'production',
});
export const getNotificationState = manager.getState;
export const enableNotifications = (...args) => manager.enable(...args);
export const disableNotifications = (...args) => manager.disable(...args);
export const rotateNotificationToken = (...args) => manager.rotate(...args);
export const retryNotificationCleanup = (...args) => manager.retryCleanup(...args);
export const onboardNotifications = createNotificationOnboarding({
  native: isAndroid, getPreference: notificationPreference, setPreference: setNotificationsOptIn,
  getState: getNotificationState, requestPermission: () => NativeNotifications.requestPermission(),
  enable: enableNotifications, getSession: () => ({ userId: session.snapshot()?.userId, token: session.token() }),
});
