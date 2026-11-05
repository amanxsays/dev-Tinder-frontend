import test from 'node:test';
import assert from 'node:assert/strict';
import { resumeUploadError } from '../src/utils/resumeUploadError.js';

test('disabled Cloudinary response explains storage failure without blaming the connection', () => {
  const error = { response: { data: { error: { message: 'cloud_name is disabled' } } } };
  assert.match(resumeUploadError(error, 'Network error'), /Cloudinary cloud is disabled/);
  assert.match(resumeUploadError(error, 'Network error'), /existing resume has not been changed/);
});

test('ordinary upload and save failures retain their specific messages', () => {
  assert.equal(resumeUploadError({}, 'Upload failed'), 'Upload failed');
  assert.equal(resumeUploadError({ response: { data: { message: 'Resume changed during upload' } } }, 'Fallback'), 'Resume changed during upload');
});
