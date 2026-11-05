import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationOnboarding } from '../src/platform/nativeNotifications.js';

function setup({ preference = null, permission = 'prompt', granted = true, native = true } = {}) {
  const calls = { prompts: 0, registrations: [] };
  let account = 'alice';
  let afterPrompt = () => {};
  const onboard = createNotificationOnboarding({
    native: () => native, getPreference: () => preference, setPreference: value => { preference = value; },
    getState: async () => ({ permission }),
    requestPermission: async () => { calls.prompts++; permission = granted === null ? 'prompt' : granted ? 'granted' : 'denied'; afterPrompt(); },
    enable: async userId => { calls.registrations.push(userId); return { bindingId: 'registered' }; },
    getSession: () => ({ userId: account, token: account ? 'fixture' : '' }),
  });
  return { onboard, calls, preference: () => preference,
    afterPrompt: fn => { afterPrompt = fn; }, account: value => { account = value; } };
}

test('first sign-in asks through Android once and registers only after Allow', async () => {
  const f = setup();
  await Promise.all([f.onboard('alice'), f.onboard('alice')]);
  assert.equal(f.calls.prompts, 1);
  assert.deepEqual(f.calls.registrations, ['alice']);
  assert.equal(f.preference(), true);
  await f.onboard('alice');
  assert.equal(f.calls.prompts, 1);
});

test('denial or dismissal is remembered and never automatically prompts again', async () => {
  for (const granted of [false, null]) {
    const f = setup({ granted });
    await f.onboard('alice');
    await f.onboard('alice');
    assert.equal(f.calls.prompts, 1);
    assert.deepEqual(f.calls.registrations, []);
    assert.equal(f.preference(), false);
  }
});

test('existing app opt-out and Android denial remain respected', async () => {
  for (const config of [{ preference: false, permission: 'granted' }, { permission: 'denied' }]) {
    const f = setup(config);
    await f.onboard('alice');
    assert.equal(f.calls.prompts, 0);
    assert.deepEqual(f.calls.registrations, []);
  }
});

test('pre-granted permission registers without an unnecessary dialog', async () => {
  const f = setup({ permission: 'granted' });
  await f.onboard('alice');
  assert.equal(f.calls.prompts, 0);
  assert.deepEqual(f.calls.registrations, ['alice']);
});

test('logout or account switch while permission is pending cannot bind the old account', async () => {
  for (const account of ['', 'bob']) {
    const f = setup();
    f.afterPrompt(() => f.account(account));
    await f.onboard('alice');
    assert.deepEqual(f.calls.registrations, []);
    assert.equal(f.preference(), false);
  }
});

test('web and signed-out visitors never trigger permission or registration', async () => {
  const web = setup({ native: false });
  await web.onboard('alice');
  const signedOut = setup(); signedOut.account('');
  await signedOut.onboard('alice');
  assert.equal(web.calls.prompts + signedOut.calls.prompts, 0);
  assert.deepEqual([...web.calls.registrations, ...signedOut.calls.registrations], []);
});
