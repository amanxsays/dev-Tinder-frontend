// export const BASE_URL= location.hostname==="localhost" ? "http://localhost:7777" : "/api";
export const BASE_URL=import.meta.env.VITE_API_URL;
// AI chat is opt-in so a missing deployment flag cannot enable paid requests.
export const AI_CHAT_ENABLED = import.meta.env.VITE_AI_CHAT_ENABLED === "true";
