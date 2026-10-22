import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMessage, messageTime } from '../src/utils/chatMessages.js';

test('historical IDs identify ownership even when first names are identical', () => {
  const a = normalizeMessage({ _id: 'm1', senderId: { _id: 'other', firstName: 'Aman', photoUrl: 'photo' }, text: 'Hi', createdAt: '2026-01-01T12:00:00Z' }, 'self');
  assert.equal(a.own, false);
  assert.equal(a.senderId, 'other');
  assert.equal(a.firstName, 'Aman');
  assert.equal(a.photoUrl, 'photo');
  assert.equal(a.time.toISOString(), '2026-01-01T12:00:00.000Z');
});
test('deleted senders and malformed dates do not break history', () => {
  const message = normalizeMessage({ senderId: null, text: 'Old text', updatedAt: 'invalid' }, 'self');
  assert.equal(message.firstName, 'Member');
  assert.equal(message.time, null);
  assert.equal(messageTime(message.time), '');
});
test('legacy live events retain content without inventing canonical identity', () => {
  const message = normalizeMessage({ firstName: 'Name', text: '<script>plain text</script>', photoUrl: 'photo' }, 'self');
  assert.equal(message.own, undefined);
  assert.equal(message.senderId, null);
  assert.equal(message.text, '<script>plain text</script>');
  assert.notEqual(message.id, normalizeMessage({ text: 'same' }, 'self').id);
});
