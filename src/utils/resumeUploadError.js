import { getApiErrorMessage } from './apiErrors.js';

export function resumeUploadError(error, fallback) {
  const message = getApiErrorMessage(error, fallback);
  if (/cloud[_ ]name\s+is\s+disabled/i.test(message)) {
    return 'Resume storage is unavailable because the configured Cloudinary cloud is disabled. Your existing resume has not been changed.';
  }
  return message;
}
