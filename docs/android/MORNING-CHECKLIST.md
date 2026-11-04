# Morning review - Android development build

## Completed locally

- Development Firebase configuration and the separate backend credential were verified without committing either file.
- Real FCM notifications reached the API 36 emulator through authenticated native registration, actual Socket.IO message persistence, a local MongoDB replica set, and the durable outbox.
- Message and connection-request notification PendingIntents opened their correct protected screens after process restart. Expired native sessions opened Login.
- Foreground chat delivery, native logout cancellation, stale-binding rejection, and durable logout cleanup after a confirmed cold restart were checked. The offline case blocked API requests and verified the failure before logging out.
- Frontend: 68 tests and production web build pass. Backend: 34 tests pass. Spring: 67 isolated tests pass; the production-connected application-context test remains excluded. Android: six JVM policy tests and four secure-state instrumentation tests pass; three opt-in navigation scenarios passed separately. Android lint passed in the preceding verification run.
- Release checks now require an absolute keystore path, matching Gradle. An actual negative Gradle run rejected a relative path; a subsequent normal JVM test run passed.
- `npm run android:inspect` verifies the existing APK signature, compiled package/SDK settings, checksum, and targeted credential patterns in web assets without installing or uploading it.

All implementation changes remain on `feature/android-fcm`. Existing Netlify/Render services, production databases, and main/master branches were not changed. Temporary test services and emulators are stopped when verification ends.

## First thing for you: connect a phone

1. Use an Android phone with Google Play services and a current Android System WebView.
2. Enable Developer options and USB debugging, connect it by USB, and approve the computer prompt.
3. Tell me that the phone is connected. We will use development Firebase and disposable local users for testing.

The morning phone check covers notification permission grant/deny, two-user messaging, actual system-tray taps, background/process-killed delivery, account switching, offline logout, dictation with the real microphone, Read aloud, and resume preview. Battery restrictions and force-stop limitations must also be observed. [Detailed matrix and commands](TESTING.md).

## Current APK

The locally generated file is `android/app/build/outputs/apk/debug/app-debug.apk`, inside this frontend repository. Its package is `com.amanxsays.devtinder.debug`, version `1.0-debug`, minimum API 26 and target API 36.

It is debug-signed and currently points at **emulator-only local fixture endpoints** (`10.0.2.2:17777` and `10.0.2.2:18080`). It is not an APK for production users. A USB-connected phone needs a rebuilt bundle with the documented localhost/reverse-port settings and running isolated services. Do not publish this APK or add a website download link yet.

Last inspected APK SHA-256 (changes after rebuilding):

```text
BBC57BEBF247BCFF7CF8D7F6C4059AF39ABD1D5EBEC84E53CDBC828450640D8B
```

## Decisions/setup needed before public release

| Item | Your part | Status |
|---|---|---|
| Real-device verification | Connect the phone and exercise microphone/system notification behavior | Pending |
| Production Firebase | Create a separate production project and register `com.amanxsays.devtinder`; save its client JSON under `android/app/src/release/` | Not configured; development project already works |
| Release signing | Retain and securely back up the release keystore and passwords outside Git; never paste passwords into chat | No release keystore generated |
| Existing server rollout | Review coordinated Node/Spring rollout and environment names after phone tests | No deployment activated |
| Database credential | Privately rotate the previously exposed MongoDB credential and update the authorized service configuration | Owner action still required; old Git history was preserved |
| Distribution | Review the signed APK and choose when to publish its download; Play publishing is separate | No release asset or website link published |

Keep service-account private keys, signing passwords, JWT secrets, and database values out of chat and Git. The development Firebase Admin key is already saved outside the repositories; no need to generate another one for development.

See [release checklist](RELEASE.md), [Firebase setup](FIREBASE.md), and [verification evidence/limits](VALIDATION.md).
