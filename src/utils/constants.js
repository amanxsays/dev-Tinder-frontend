import { isAndroid } from '../platform/platform.js';
const env = import.meta.env || {};
// Vite forwards local HTTP requests to the backend without a browser CORS preflight.
export const BASE_URL = env.DEV && !isAndroid() ? "/api" : env.VITE_API_URL;
export const SOCKET_URL = env.VITE_API_URL;
// The local proxy targets VITE_STATS_SERVICE_URL, the same integration service used in production.
export const AI_SERVICE_URL = env.DEV && !isAndroid()
  ? "/integration-api"
  : (env.VITE_STATS_SERVICE_URL || "").replace(/\/+$/, "");
// AI chat is opt-in so a missing deployment flag cannot enable paid requests.
export const AI_CHAT_ENABLED = env.VITE_AI_CHAT_ENABLED === "true";
