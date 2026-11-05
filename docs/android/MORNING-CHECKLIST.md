# Morning review - Android development build

See [latest UI follow-up](UI-REVIEW.md) and the [final phone checklist](FINAL-PHONE-CHECKLIST.md) for the status-bar/layout/PDF updates that still need the final phone pass.

## Completed locally

- Development Firebase configuration and the separate backend credential were verified without committing either file.
- Real FCM notifications reached the API 36 emulator through authenticated native registration, actual Socket.IO message persistence, a local MongoDB replica set, and the durable outbox.
- Message and connection-request notification PendingIntents opened their correct protected screens after process restart. Expired native sessions opened Login.
- Foreground chat delivery, native logout cancellation, stale-binding rejection, and durable logout cleanup after a confirmed cold restart were checked. The offline case blocked API requests and verified the failure before logging out.
- Frontend: 77 tests and production web build pass. Backend: 35 tests pass. Spring: 67 isolated tests pass; the production-connected application-context test remains excluded. Android: six JVM policy tests and nine native instrumentation tests pass (five secure-state, one inset/layout and three PDF-preview tests); three opt-in navigation scenarios passed separately. Android lint passed in the preceding verification run.
- Release checks now require an absolute keystore path, matching Gradle. An actual negative Gradle run rejected a relative path; a subsequent normal JVM test run passed.
- `npm run android:inspect` verifies the existing APK signature, compiled package/SDK settings, checksum, and targeted credential patterns in web assets without installing or uploading it.

All implementation changes remain on `feature/android-fcm`. Existing Netlify/Render services, production databases, and main/master branches were not changed. Temporary test services and emulators are stopped when verification ends.

## Phone connected and initial checks complete

The physical I2219/Android 16 phone passed notification grant, message/request system-tray taps, dictation review, explicit Send, Read aloud, saved-login restoration, and persistent logout. See [physical-device results](PHYSICAL-DEVICE.md). Next device work covers PDF/resume behavior and extended permission, interruption, battery, and account/device scenarios.

The remaining phone matrix includes permission denial/re-enable, resume preview, longer speech/interruption scenarios, multiple devices/account switching, and battery/force-stop limitations. Basic positive-path phone checks are complete. [Detailed matrix and commands](TESTING.md).

## Android session change

Android login/signup now issue ten-day JWTs; browser cookies/JWTs remain one day. API expiry metadata matches the token exactly. Existing one-day Android tokens keep their original expiry. The updated native build and backend must be rolled out together before signing in for the longer session.

## Current APK

The locally generated file is `android/app/build/outputs/apk/debug/app-debug.apk`, inside this frontend repository. Its package is `com.amanxsays.devtinder.debug`, version `1.0-debug`, minimum API 26 and target API 36.

It is debug-signed and currently points at **USB-only local fixture endpoints** (`127.0.0.1:17777` and `127.0.0.1:18080`). It is not an APK for production users. This phone build needs the documented reverse-port settings and running isolated services. The completed session's services/forwards have been stopped; its disposable login will no longer work. Do not publish this APK or add a website download link yet.

Last inspected APK SHA-256 (changes after rebuilding):

```text
FD28105993AA65ED1110434139D22E7D52D3597FF98644D2FC2B98E32F20C93D
```

## Decisions/setup needed before public release

| Item | Your part | Status |
|---|---|---|
| Real-device verification | Complete the remaining permission/PDF/battery/device matrix | Core positive-path phone tests passed; extended checks pending |
| Production Firebase | Create a separate production project and register `com.amanxsays.devtinder`; save its client JSON under `android/app/src/release/` | Not configured; development project already works |
| Release signing | Retain and securely back up the release keystore and passwords outside Git; never paste passwords into chat | No release keystore generated |
| Existing server rollout | Review coordinated Node/Spring rollout and environment names after phone tests | No deployment activated |
| Database credential | Privately rotate the previously exposed MongoDB credential and update the authorized service configuration | Owner action still required; old Git history was preserved |
| Distribution | Review the signed APK and choose when to publish its download; Play publishing is separate | No release asset or website link published |

Keep service-account private keys, signing passwords, JWT secrets, and database values out of chat and Git. The development Firebase Admin key is already saved outside the repositories; no need to generate another one for development.

See [release checklist](RELEASE.md), [Firebase setup](FIREBASE.md), and [verification evidence/limits](VALIDATION.md).
