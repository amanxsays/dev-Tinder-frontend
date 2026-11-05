import axios from 'axios';
import { BASE_URL } from '../utils/constants.js';
import { isAndroid } from './platform.js';
import { session } from './session.js';
import { isSessionRejected } from '../utils/sessionHint.js';

export function isFirstPartyUrl(url, apiBase, pageUrl = 'https://localhost/') {
  try {
    const base = new URL(apiBase, pageUrl);
    const request = new URL(url, pageUrl);
    const path = base.pathname.replace(/\/+$/, '');
    return request.origin === base.origin && (!path || request.pathname === path || request.pathname.startsWith(path + '/'));
  } catch { return false; }
}

const api = axios.create();
api.isCancel = axios.isCancel;
api.interceptors.request.use(async config => {
  if (!isAndroid()) return config;
  if (!BASE_URL || !isFirstPartyUrl(config.url, BASE_URL, window.location.href)) throw new Error('Android credentials cannot be sent to this service.');
  await session.load();
  const token = session.token();
  config.withCredentials = false;
  config.__nativeSessionToken = token;
  if (token) config.headers.set('Authorization', 'Bearer ' + token);
  return config;
});
api.interceptors.response.use(response => response, error => {
  if (isAndroid() && isSessionRejected(error.response) && error.response?.status !== 403
    && error.config?.__nativeSessionToken && error.config.__nativeSessionToken === session.snapshot()?.token) {
    window.dispatchEvent(new Event('devtinder:session-expired'));
  }
  return Promise.reject(error);
});

export function authenticatedFetchOptions() {
  if (!isAndroid()) return { credentials: 'include', headers: {} };
  const token = session.token();
  if (!token) throw new Error('Please sign in again. Your Android session has expired.');
  return { credentials: 'omit', headers: { Authorization: 'Bearer ' + token } };
}
export default api;
