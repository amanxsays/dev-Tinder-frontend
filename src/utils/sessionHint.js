const SESSION_HINT = 'devtinder.session-present';

// Presentation hint only. Never store a token, credentials or a user profile here.
export function hasSessionHint() {
  try { return globalThis.localStorage?.getItem(SESSION_HINT) === '1'; }
  catch { return false; }
}

export function rememberSession() {
  try { globalThis.localStorage?.setItem(SESSION_HINT, '1'); }
  catch { /* Cookie authentication still works when browser storage is blocked. */ }
}

export function forgetSession() {
  try { globalThis.localStorage?.removeItem(SESSION_HINT); }
  catch { /* A hint is never required for sign-out. */ }
}

export function sessionReturnPath(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
    && !path.includes('\\') && !/^\/login(?:[/?#]|$)/.test(path) ? path : '/';
}

export function isSessionRejected(response) {
  if ([401, 403].includes(response?.status)) return true;
  const message = typeof response?.data === 'string' ? response.data : response?.data?.message;
  // The current Express middleware uses 400 for token failures and database errors.
  // Only known authentication failures should discard a remembered-session hint.
  return response?.status === 400 && typeof message === 'string'
    && /^Error:\s*(?:Invalid Token|User Does Not Exist[ !]*|jwt expired|maxAge exceeded|jwt malformed|jwt must be provided|jwt must be a string|jwt not active|invalid signature|jwt signature is required|invalid algorithm)\s*$/i.test(message);
}
