const attempts = new Map();

// Best-effort wake-up only: an opaque response does not establish readiness.
export function warmIntegrationService(baseUrl, fetchImpl = globalThis.fetch) {
  const target = typeof baseUrl === 'string' ? baseUrl.trim().replace(/\/+$/, '') : '';
  if (!target || typeof fetchImpl !== 'function') return Promise.resolve();
  if (attempts.has(target)) return attempts.get(target);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  const attempt = Promise.resolve()
    .then(() => fetchImpl(target + '/api/ping', {
      method: 'GET',
      // The public ping endpoint need not expose its response through CORS.
      mode: 'no-cors',
      credentials: 'omit',
      cache: 'no-store',
      signal: controller.signal,
    }))
    .then(() => undefined, () => undefined)
    .finally(() => clearTimeout(timeout));
  attempts.set(target, attempt);
  return attempt;
}
