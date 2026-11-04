# Android implementation validation

## Verified locally

- Frontend: 68 Node tests pass; focused ESLint passes; normal Vite website build passes.
- Backend: 34 Node tests pass. Existing dependency audit findings remain; unused
  optional Firebase Firestore/Storage dependencies are excluded by backend `.npmrc`.
- Spring: 67 isolated unit/controller tests pass with JDK 25. The production-connected
  `IntegrationServiceApplicationTests` context test was deliberately excluded.
- Android: `:app:testDebugUnitTest`, `:app:assembleDebug`, `:app:lintDebug`, and
  `:app:assembleDebugAndroidTest` pass with JDK 21, SDK 36, and the Gradle wrapper.
- Six native notification-policy JVM tests pass. All three native instrumentation
  tests ran and passed on an Android 16/API 36 emulator: encrypted session storage,
  notification revocation/binding cleanup, and duplicate-event state.
- Actual Android WebView checks passed against local HTTP fixtures: bundled launch,
  native mobile login, secure session save, reload restoration, authenticated AI
  incremental SSE, local logout clearing session/binding, mobile width, and no
  uncaught JavaScript exceptions. Native speech/TTS capabilities were available;
  physical microphone accuracy remains unverified. Later real FCM transport checks are recorded below.
- Headless Chrome fixtures exercised both normal browser and mocked Android bridge
  flows: cookie/native login, bearer requests, signed-in AI SSE, dictation review,
  notification registration, and local logout, without production/provider calls.
- A temporary, isolated MongoDB 7 replica set verified actual Express/native login,
  two authenticated Socket.IO users, canonical saved history, rejection of forged
  sender IDs/unauthorized history, a transactional notification outbox, rollback
  on duplicate-event failure, account rebinding, and stale-binding revocation.
  Firebase sends in that fixture were stubbed; there was no real FCM delivery.
- Artifact/config scan excludes APKs, generated bundles, node_modules, target,
  Firebase client/admin JSON, keystores, and local environment files from Git.

The Vite large-chunk warning remains. Android lint has nonfatal resource/translation
and dependency-version recommendations; no lint errors are suppressed as a baseline.

## Release gates still outstanding

- Production Firebase client files and server credentials are not supplied. Development Firebase inputs have been verified locally.
- Complete authenticated push delivery/tap flows, physical microphone, native TTS engine, and real-phone battery
  behavior remain release checks. Emulator transport success does not establish those capabilities.
- Production signing identity and website APK download publishing remain unset.
- Release preflight was tested and correctly refuses to proceed without production
  Firebase client configuration. The local APK is debug-signed and configured for
  emulator-only local fixtures on ports 17777 and 18080, not a production release.
- The new backend/mobile routes and coordinated signed AI gateway must be deployed
  before an Android build targets production. Existing deployments are unchanged.
- A MongoDB credential previously present in Spring's tracked configuration was moved
  to ignored local configuration. Its historical value must be rotated by the owner
  before production release; no history was rewritten or live database changed.

## Firebase development verification - 2026-11-05

- The ignored debug Firebase configuration matches `com.amanxsays.devtinder.debug` in project `devtinder-development`; the Firebase-enabled debug APK builds successfully.
- The backend's separate private credential passed an actual FCM validation-only request. The key remains outside the repositories and was supplied only through the test process environment.
- An API 36 Google APIs emulator obtained a real FCM token. Development-project data messages produced native generic **New message** and **New connection request** notifications while the app was in the background.
- Native binding deactivation cleared posted notifications. A subsequent event for the old binding produced no visible alert during a five-second observation window; this bounded observation does not guarantee delivery timing or prove every race.
- These checks used a synthetic local native session and binding, not a production account or database. They verify the native FCM transport/display boundary, not the complete authenticated server-registration/outbox flow. Local isolated server flows were tested separately as described above.
- No notification-tap navigation, killed-process delivery, or physical-phone battery behavior is claimed by this test. Those release checks remain pending. No live hosting settings were changed and no credential or Firebase configuration file was committed.
- Frontend Node tests: 68 passing, including six setup-preflight tests. Backend Node tests: 34 passing, including three validation-only Firebase setup tests.

## Repeatable local commands

Run `npm test` in frontend and Node backend, and `npm run build` in frontend.
For Android, build a development bundle using explicitly selected isolated endpoints,
run `npx cap sync android`, then the four Gradle tasks listed above. SDK location
belongs in process-local `ANDROID_HOME`/`ANDROID_SDK_ROOT` or ignored local.properties.

Run Spring tests using JDK 25:

```powershell
.\mvnw.cmd '-Dtest=*,!IntegrationServiceApplicationTests' test
```

For actual instrumented checks attach a test emulator/phone and run
`:app:connectedDebugAndroidTest`. Follow [RELEASE.md](RELEASE.md) before distribution.
