# DevTinder for Android

The Android application bundles the same React UI as the website through Capacitor. The native project lives in `android/`; Netlify still builds `dist/`, independently of APK builds. No production API, database, Firebase project, or hosting service is created by adding the Android source.

## Requirements

- Node 22+, npm, Android Studio 2025.2.1 or later, Android SDK Platform 36 and Build Tools 36.
- Java 21 for Android Gradle. Spring's Java 25 is separate; do not replace your global JDK to build Android.
- Android 8/API 26 or newer, updated Android System WebView, and Google Play services for push delivery. The React/Vite build requires a modern WebView; the minimum Android OS alone does not establish browser compatibility.
- A local/isolated Node backend and MongoDB replica set for end-to-end development. Never use production test messages or credentials in automated tests.

## Build locally

Before configuring push or signing a release, run `npm run android:check` (release) or `npm run android:check:debug`. This read-only check reports missing public service URLs, Firebase client metadata/package mismatches, and release signing inputs without printing credential values. It does not require Firebase CLI sign-in. Debug checks require Firebase configuration for push readiness even though a debug APK can compile without it. A passing check does not verify server credentials, actual notification delivery, or the signing certificate.

Run from the frontend repository:

```powershell
npm ci
Copy-Item .env.android.example .env.android.local
# Edit only public API URLs in .env.android.local.
npm run android:debug
```

The debug APK is `android/app/build/outputs/apk/debug/app-debug.apk`. It is named DevTinder, with application ID `com.amanxsays.devtinder.debug`. This is a development build, not a production release.

`build:android` validates absolute HTTPS service URLs and writes `dist-android/`. `android:debug` additionally permits HTTP only for `localhost`, `127.0.0.1`, and the emulator host `10.0.2.2`. A real phone's `localhost` is the phone itself. Production builds reject cleartext endpoints. No Vite development proxy is used inside Android.

`android:debug` compiles a development notification environment; normal `build:android` and `android:release` use production. Firebase files and backend `PUSH_ENVIRONMENT` must match the build environment. See [Firebase setup](FIREBASE.md).

To open Android Studio or sync without compiling:

```powershell
npm run android:open
npm run android:sync
```

The Windows npm build commands use `gradlew.bat`. On Linux/macOS use `npm run build:android`, `npx cap sync android`, then `cd android` and `./gradlew assembleDebug` (set the desired build environment with the debug build script where appropriate).

## Feature boundaries

- Browser cookies stay unchanged. Android uses a one-day bearer token encrypted using an Android Keystore-backed AES-GCM key. No refresh token or persistent password is stored.
- Browser speech remains browser-based. Android uses native `SpeechRecognizer` and `TextToSpeech`, preserves editable review and explicit Send, and stops capture/playback on backgrounding.
- PDFs remain in-app on Android using `PdfRenderer`; bounded temporary files are app-private, removed when closed, and abandoned files are cleared on the next launch. Citation validation still occurs before opening.
- Notification subscriptions are independent of JWT expiry. Generic alerts can continue after one day, but tapping one requires authentication. Explicit logout/account switching disables the old binding locally, including offline.
- Offline revocations remain in encrypted native storage and retry on app startup, foregrounding, connectivity restoration, or a later registration. Cleanup is fenced to the old binding generation so it cannot disable a newer account.
- Killed processes do not retain React drafts or AI transcripts. Human message history is persisted on the server and reloaded. No background AI job completion guarantee is introduced.
- No voice calls, recorded audio messages, background microphone service, Firebase Authentication, Firestore migration, or persistent background Socket.IO connection is included.

## Native bridges

`DevTinderSession`, `DevTinderSpeech`, `DevTinderNotifications`, and `DevTinderPdf` are registered by `MainActivity`. JavaScript integrations are in `src/platform/`. Secrets and notification capabilities never leave first-party backend requests; PDF and Cloudinary requests receive no bearer token.

## Validation

```powershell
npm test
npm run build
npm run build:android
npx cap sync android
cd android
.\gradlew.bat testDebugUnitTest assembleDebug
# With a Google Play-enabled emulator/device attached:
.\gradlew.bat connectedDebugAndroidTest
```

Unit tests cover native notification acceptance policy. Instrumentation tests cover encrypted storage, notification binding removal, and duplicate event state. Physical-device speech, PDF accessibility, background delivery, force-stop behavior, battery restrictions, and two-user Android/web messaging remain required release checks. A successful APK build does not prove FCM delivery or microphone behavior.

See [release checklist](RELEASE.md) before distribution.

See [notification and physical-device testing](TESTING.md) for isolated test setup, opt-in notification navigation checks, session expiry, and USB forwarding.
