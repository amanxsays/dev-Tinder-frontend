import test from 'node:test';
import assert from 'node:assert/strict';
import { forgetSession, hasSessionHint, isSessionRejected, rememberSession, sessionReturnPath } from '../src/utils/sessionHint.js';

function storage(t, descriptor) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, ...descriptor });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  });
}

test('the remembered-session hint contains no account data and logout removes only that hint', t => {
  const values = new Map([['unrelated-setting', 'keep']]);
  storage(t, { value: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  } });
  assert.equal(hasSessionHint(), false);
  rememberSession();
  assert.equal(hasSessionHint(), true);
  assert.equal(values.get('devtinder.session-present'), '1');
  assert.equal(values.size, 2);
  forgetSession();
  assert.equal(hasSessionHint(), false);
  assert.deepEqual([...values], [['unrelated-setting', 'keep']]);
});

test('blocked browser storage cannot break cookie-based login or logout', t => {
  storage(t, { get() { throw new Error('Storage blocked'); } });
  assert.equal(hasSessionHint(), false);
  assert.doesNotThrow(rememberSession);
  assert.doesNotThrow(forgetSession);
});

test('unrecognized stored values do not claim that a session was remembered', t => {
  storage(t, { value: { getItem: () => '{"_id":"not-an-authenticated-user"}' } });
  assert.equal(hasSessionHint(), false);
});

test('post-login destinations remain within the site and cannot loop back to login', () => {
  for (const path of [undefined, '', 'https://example.test', '//example.test', '/\\example.test', '/login', '/login?next=/']) {
    assert.equal(sessionReturnPath(path), '/');
  }
  assert.equal(sessionReturnPath('/chat/ai-agent'), '/chat/ai-agent');
  assert.equal(sessionReturnPath('/connections?view=all#latest'), '/connections?view=all#latest');
});

test('expired sessions include the existing backend middleware 400 error format', () => {
  assert.equal(isSessionRejected({ status: 401 }), true);
  assert.equal(isSessionRejected({ status: 403 }), true);
  for (const message of ['Error: Invalid Token', 'Error: jwt expired', 'Error: maxAge exceeded', 'Error: jwt malformed', 'Error: invalid signature', 'Error: User Does Not Exist !!!!']) {
    assert.equal(isSessionRejected({ status: 400, data: message }), true);
  }
});

test('network, server and database failures do not discard a remembered session', () => {
  for (const response of [undefined, { status: 503 }, { status: 400, data: 'Error: MongoDB connection timed out' }, { status: 400, data: 'Error: secret or public key must be provided' }]) {
    assert.equal(isSessionRejected(response), false);
  }
});
