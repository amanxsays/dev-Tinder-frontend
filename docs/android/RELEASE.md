# Android release checklist

## Release gates

- Web tests/build and Android unit/instrumentation tests pass.
- Complete login/signup/OTP, ten-day Android sessions (one-day browser sessions), search, profile, connections, two-user messaging, AI SSE, resume lifecycle, dictation and Read aloud smoke tests.
- Test Android API 26, 33 and 36 with current WebView, plus at least one real Google Play-enabled phone.
- Verify the authenticated Node AI gateway is deployed before requiring signed-only Spring chat. Do not distribute the APK against a backend missing mobile authentication routes.
- Test notification privacy, account switching, offline logout, expired login, token rotation, duplicate dispatch, killed-process delivery, and force-stop limitations.
- Inspect the release bundle for development URLs, credentials, tokens, logs, and remote WebView navigation. Release network traffic must use HTTPS.
- Obtain explicit approval before production environment changes, deployment, Firebase setup, publishing a release asset, or adding a website download link.

## Signing

Create a release keystore only when the release owner is ready to retain and back it up. Keep it outside Git. The same package identity and compatible certificate are required for updates. Debug signing is never a production signing identity.

Set process-local values (do not paste secrets into shell history or documentation):

- `DEVTINDER_KEYSTORE_PATH` - absolute path to the existing keystore, outside Git
- `DEVTINDER_KEYSTORE_PASSWORD`
- `DEVTINDER_KEY_ALIAS`
- `DEVTINDER_KEY_PASSWORD`

Supply production `android/app/src/release/google-services.json`, set public HTTPS endpoints in ignored `.env.android.local`, then run:

```powershell
npm run android:release
```

Run `npm run android:check` first for a local configuration report. It exits nonzero when required inputs are absent. It does not contact Firebase, upload anything, validate private-key credentials, or replace artifact signing and real-device verification.

The Gradle release task deliberately fails without production Firebase configuration or explicit signing values. Verify the signed artifact with Android Build Tools `apksigner verify --print-certs`, record its SHA-256 checksum, and test an upgrade over the prior signed build without uninstalling.

On Windows, `npm run android:inspect` verifies the existing debug APK signature, reports its compiled identity/permissions and SHA-256, and scans bundled text assets for private-key, Mongo URI, and known fixture-session patterns. It reads files only. For a release APK use `npm.cmd run android:inspect -- -Apk android/app/build/outputs/apk/release/app-release.apk`. Configure `ANDROID_HOME` and Java first. Review the certificate digest against the intended signing identity; passing this targeted check alone does not make an APK production-ready.

## APK distribution first

After approval, publish the signed APK as a versioned release asset with version, checksum, minimum Android version, installation instructions, privacy information, and known limitations. A website download link should point to that asset. Do not commit APK files or repeatedly bundle them into the Netlify web output.

APK updates are separate from website deployments. Installed apps keep their bundled frontend until the user installs a newer compatible APK. Preserve backward-compatible server contracts during this period.

## Google Play later

Prepare an AAB with `gradlew.bat bundleRelease`, Play App Signing, store listing assets, Data safety/privacy disclosures, reviewer test access, and the testing required for the developer account. Review current target SDK and developer verification requirements before publishing. Play publishing is not activated by the local implementation.

## Rollback

Disable push dispatch server-side while retaining outbox records; stop distributing a faulty APK; provide a corrected APK with a higher version code. Keep browser endpoints and existing socket payload fields compatible. If AI gateway authorization fails, disable AI temporarily instead of exposing unsigned requests. Never delete production messages, registrations, outbox records, or user data to roll back.

Official references: [Android signing](https://developer.android.com/studio/publish/app-signing), [Play account setup](https://support.google.com/googleplay/android-developer/answer/6112435), [Android developer verification](https://developer.android.com/developer-verification).
