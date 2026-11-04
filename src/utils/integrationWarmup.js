const startupAttempts = new Map();
const probes = new Map();
const READY_RESPONSE = 'Integration Service is up and running!';
const STARTUP_TIMEOUT_MS = 180000;
const normalize = baseUrl => typeof baseUrl === 'string' ? baseUrl.trim().replace(/\/+$/, '') : '';
const aborted = () => new DOMException('The request was cancelled.', 'AbortError');

function withSignal(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(aborted());
  return new Promise((resolve, reject) => {
    const onAbort = () => { signal.removeEventListener('abort', onAbort); reject(aborted()); };
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(value => {
      signal.removeEventListener('abort', onAbort); resolve(value);
    }, error => {
      signal.removeEventListener('abort', onAbort); reject(error);
    });
  });
}

// Share only an in-flight probe: an old success must not imply Spring is still awake.
function probe(target, fetchImpl, signal) {
  if (signal?.aborted) return Promise.reject(aborted());
  let flight = probes.get(target);
  if (!flight) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), STARTUP_TIMEOUT_MS);
    flight = { controller, users: 0, settled: false };
    flight.promise = Promise.resolve()
      .then(() => fetchImpl(target + '/api/ping', {
        method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal,
      }))
      .then(async response => {
        if (!response.ok || (await response.text()).trim() !== READY_RESPONSE) {
          throw new Error('The AI service is not ready.');
        }
      })
      .finally(() => {
        flight.settled = true;
        clearTimeout(timeout);
        if (probes.get(target) === flight) probes.delete(target);
      });
    probes.set(target, flight);
  }
  flight.users++;
  return withSignal(flight.promise, signal).finally(() => {
    flight.users--;
    if (!flight.users && !flight.settled) {
      flight.controller.abort();
      if (probes.get(target) === flight) probes.delete(target);
    }
  });
}

function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(aborted()); return; }
    const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, ms);
    const onAbort = () => { clearTimeout(timer); reject(aborted()); };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

// Page startup remains one quiet attempt, including when the AI UI is disabled.
export function warmIntegrationService(baseUrl, fetchImpl = globalThis.fetch) {
  const target = normalize(baseUrl);
  if (!target || typeof fetchImpl !== 'function') return Promise.resolve();
  if (!startupAttempts.has(target)) {
    startupAttempts.set(target, probe(target, fetchImpl).catch(() => {}));
  }
  return startupAttempts.get(target);
}

// Retry health checks only for a waiting question. Never retry its chat POST here.
export async function ensureIntegrationReady(baseUrl, {
  signal, fetchImpl = globalThis.fetch, timeoutMs = STARTUP_TIMEOUT_MS, retryDelayMs = 3000,
} = {}) {
  const target = normalize(baseUrl);
  if (!target || typeof fetchImpl !== 'function') throw new Error('AI service is not configured.');
  if (signal?.aborted) throw aborted();
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    for (;;) {
      try { await probe(target, fetchImpl, controller.signal); return; }
      catch (error) { if (controller.signal.aborted) throw error; }
      await pause(retryDelayMs, controller.signal);
    }
  } catch (error) {
    if (timedOut) throw new Error('The AI service is still starting after 3 minutes. Your question was not sent. Please try again.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
