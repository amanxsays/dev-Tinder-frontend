# Android implementation validation

## Verified locally

- Frontend: 62 Node tests pass; focused ESLint passes; normal Vite website build passes.
- Backend: 31 Node tests pass. Existing dependency audit findings remain; unused
  optional Firebase Firestore/Storage dependencies are excluded by backend `.npmrc`.
- Spring: 67 isolated unit/controller tests pass with JDK 25. The production-connected
  `IntegrationServiceApplicationTests` context test was deliberately excluded.
- Android: `:app:testDebugUnitTest`, `:app:assembleDebug`, `:app:lintDebug`, and
  `:app:assembleDebugAndroidTest` pass with JDK 21, SDK 36, and the Gradle wrapper.
- Six native notification-policy JVM tests pass. Native instrumented tests compile;
  compilation does not mean those tests have run on a device.
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

- Development/production Firebase client files and server credentials are not supplied.
- No real Firebase push, physical microphone, native TTS engine, or real-phone battery
  behavior has been verified. Permission handling and plugin mocks do not establish
  those external capabilities.
- Production signing identity and website APK download publishing remain unset.
- The new backend/mobile routes and coordinated signed AI gateway must be deployed
  before an Android build targets production. Existing deployments are unchanged.
- A MongoDB credential previously present in Spring's tracked configuration was moved
  to ignored local configuration. Its historical value must be rotated by the owner
  before production release; no history was rewritten or live database changed.

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
