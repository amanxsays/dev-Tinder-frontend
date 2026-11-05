# Android APK distribution

The existing Netlify frontend serves `/download` as a public route. It works without login, including when Render is sleeping. The browser header links to it; the native app hides this download navigation. No new Netlify project or service is needed. Keep the existing `npm run build`, `dist` publish directory, and SPA rewrite.

The download route has its own static layout outside the application lifecycle. It does not mount session restoration, request polling, AI source validation, or native notification setup, and does not issue a Spring warm-up ping. Opening the main app or Login mounts the normal application and starts its existing startup checks. Requests already sent before navigating away from the main app cannot be unsent.

Share `https://devtinderfront.netlify.app/download` directly with phone or desktop users. They do not need an account to view the page or download the APK. An account is required only when signing into the installed app.

## Initial artifact

- App: DevTinder 1.0, version code 1; package `com.amanxsays.devtinder`.
- Minimum Android: 8.0 (API 26); target API 36.
- Source: frontend commit `8dac4a9` (the tested APK predates the website download page).
- Release tag: `android-v1.0.0`.
- Asset: `DevTinder-1.0.0.apk`, 5,684,757 bytes.
- SHA-256: `9c1751a457585713c4537e2535c2084f1679d803ef64d9f45023535f60368359`.
- Signing certificate SHA-256: `aab1071e2f3d8c0e454946bdd598d99d91e3b669f892e9000a6f0ccd3e113ed0`.
- Download: `https://github.com/amanxsays/dev-Tinder-frontend/releases/download/android-v1.0.0/DevTinder-1.0.0.apk`.

The signed APK was inspected for identity, signature, production bundle marker, live Node/Spring endpoints, and targeted credential/fixture patterns. The owner confirmed production login and background message notification/tap behavior on a physical phone. Earlier development-device checks cover dictation, Read aloud, request notifications, and session restoration; the full regression matrix remains in FINAL-PHONE-CHECKLIST.md. Do not describe limited phone coverage as testing every Android version or device.

## Publish order

1. Keep the permanent signing keystore and passwords outside Git and back them up privately.
2. Copy the inspected APK into a local release staging folder outside the repository. Write `SHA256SUMS.txt` for the exact renamed asset; renaming does not change its checksum.
3. Authenticate GitHub CLI with browser login. Create a draft GitHub Release at the source commit, upload only the APK and checksum file, then verify asset names/sizes and publish the release. The repository and assets must be publicly accessible for anonymous website downloads.
4. Download the public release asset again and compare SHA-256 with the inspected APK. Do not publish a live website link until this succeeds.
5. Deploy the download-page frontend through the existing GitHub/Netlify flow. Verify `/download` directly in a signed-out browser and check the APK link from an Android browser.

No Firebase Admin JSON, signing key, password file, `.env`, or Android client configuration file belongs in a release upload. The APK necessarily includes the Firebase client configuration used by Android; server service-account credentials must never be bundled.

## Future updates

Increase Android `versionCode`, set the new `versionName`, build with the same application ID and permanent signing key, inspect and test an upgrade without uninstalling, then publish a new tag and asset name. Update the URL, version, size and checksum in `src/components/DownloadAndroid.jsx` together. Keep previous release assets available until intentionally retired.

Website deployments and backend deployments do not replace the app's bundled frontend. Users install updated APKs manually. No automatic updater or Google Play publishing is part of this change.

## Rollback

Revert the website download-page commit or link it to the last verified release. Stop distributing a faulty release without deleting application data. An APK fix for already-installed users requires a new build with a higher version code and the same signing identity; downgrading the APK is not the normal recovery path.
