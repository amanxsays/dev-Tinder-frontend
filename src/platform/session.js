import { isAndroid, NativeSession } from './platform.js';

export function createSessionStore({ native, bridge, now = Date.now }) {
  let value = null;
  let loading;
  let revision = 0;
  let writes = Promise.resolve();
  const write = task => {
    const operation = writes.catch(() => {}).then(task);
    writes = operation;
    return operation;
  };
  return {
    load() {
      if (!native()) return Promise.resolve(null);
      if (!loading) {
        const version = revision;
        loading = bridge.read().then(saved => {
          if (revision === version) value = saved?.token && saved?.userId ? saved : null;
          return value;
        }).catch(() => null);
      }
      return loading;
    },
    token: () => value && Date.parse(value.expiresAt) > now() ? value.token : '',
    snapshot: () => value,
    async save(next) {
      if (!native()) return;
      if (!next?.token || !next.userId || !(Date.parse(next.expiresAt) > now())) throw new Error('Invalid Android session response.');
      const version = ++revision;
      await write(() => bridge.save(next));
      if (revision !== version) throw new Error('The session changed while signing in. Please try again.');
      value = { token: next.token, userId: next.userId, expiresAt: next.expiresAt };
      loading = Promise.resolve(value);
    },
    async clear() {
      revision++;
      value = null;
      loading = Promise.resolve(null);
      if (native()) await write(() => bridge.clear());
    },
  };
}

export const session = createSessionStore({ native: isAndroid, bridge: NativeSession });
export async function acceptNativeSession(response) {
  if (!isAndroid()) return;
  await session.save({ token: response.token, userId: response.data?._id, expiresAt: response.expiresAt });
  window.dispatchEvent(new Event('devtinder:session-changed'));
}
