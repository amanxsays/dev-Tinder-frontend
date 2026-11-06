# Android APK distribution

The existing Netlify frontend serves `/download` as a public route. It works without login, including when Render is sleeping. The browser header links to it; the native app hides this download navigation. No new Netlify project or service is needed. Keep the existing `npm run build`, `dist` publish directory, and SPA rewrite.

The download route has its own static layout outside the application lifecycle. It does not mount session restoration, request polling, AI source validation, or native notification setup, and does not issue a Spring warm-up ping. Opening the main app or Login mounts the normal application and starts its existing startup checks. Requests already sent before navigating away from the main app cannot be unsent.

Share `https://devtinderfront.netlify.app/download` directly with phone or desktop users. They do not need an account to view the page or download the APK. An account is required only when signing into the installed app.

## Current release: 1.0.3

- Package: `com.amanxsays.devtinder`; version name `1.0.3`, version code `4`.
- Source: `23bd9da3df10687b740b0cd0670d4a19a6e59ac5`.
- Release tag: `android-v1.0.3`; asset `DevTinder-1.0.3.apk`, 5,689,409 bytes.
- SHA-256: `b4129b1e390e2eec190498d6343d14372d5726248b68bffc873ad5dbb8a53a24`.
- Signing certificate unchanged: `aab1071e2f3d8c0e454946bdd598d99d91e3b669f892e9000a6f0ccd3e113ed0`.
- Primary: `https://devtinderfront.netlify.app/downloads/DevTinder-1.0.3.apk`.
- Alternative: `https://github.com/amanxsays/dev-Tinder-frontend/releases/download/android-v1.0.3/DevTinder-1.0.3.apk`.

See [1.0.3 changes and phone checks](1.0.3-DEVI.md). Signature, production endpoint, Devi and OTP bundle markers were inspected. Install over the existing app without uninstalling. Physical-device upgrade, password-manager behavior and notification previews remain for final testing. Current old Netlify paths redirect to 1.0.3; historical GitHub releases remain available.

## Previous release: 1.0.2

- Package: `com.amanxsays.devtinder`; version name `1.0.2`, version code `3`.
- Source: `b6d2784c795be291712aab1beafe3bf18cb9e033`.
- Release tag: `android-v1.0.2`; asset `DevTinder-1.0.2.apk`, 5,688,425 bytes.
- SHA-256: `502c362ea7b2025ebcb63fbaa885c007b621a06321e503386e144123e4c59f3c`.
- Signing certificate unchanged: `aab1071e2f3d8c0e454946bdd598d99d91e3b669f892e9000a6f0ccd3e113ed0`.
- Primary: `https://devtinderfront.netlify.app/downloads/DevTinder-1.0.2.apk`.
- Alternative: `https://github.com/amanxsays/dev-Tinder-frontend/releases/download/android-v1.0.2/DevTinder-1.0.2.apk`.

See [1.0.2 fixes and phone checks](1.0.2-FIXES.md). Signature/identity, production bundle/endpoints, native inset configuration, updated UI markers and targeted credential patterns were inspected. An anonymous GitHub download matched the signed APK hash. Install over the earlier app without uninstalling. Physical-device upgrade and keyboard checks remain pending. Old Netlify 1.0/1.0.1 links redirect to the current 1.0.2 asset; earlier explicit GitHub releases remain available separately.

## Previous release: 1.0.1

- Package: `com.amanxsays.devtinder`; version name `1.0.1`, version code `2`.
- Source: `649359930e69154baba8245ed7371d5af7b6b599`.
- Release tag: `android-v1.0.1`; asset `DevTinder-1.0.1.apk`, 5,687,817 bytes.
- SHA-256: `f015bef22bd2f7027647ad2767226199198bfd43f5360f2430adf40cd865e9d2`.
- Signing certificate SHA-256 remains `aab1071e2f3d8c0e454946bdd598d99d91e3b669f892e9000a6f0ccd3e113ed0`.
- Primary: `https://devtinderfront.netlify.app/downloads/DevTinder-1.0.1.apk`.
- Alternative: `https://github.com/amanxsays/dev-Tinder-frontend/releases/download/android-v1.0.1/DevTinder-1.0.1.apk`.

This release simplifies Android notification onboarding/settings and removes the website footer inside Android. Release inspection confirmed the production bundle, matching permanent signing certificate, increased version code, package identity, live HTTPS endpoints and targeted credential scan. The public GitHub artifact was downloaded anonymously and matched the checksum. Physical-device 1.0.1 upgrade/system-dialog confirmation remains pending; users should install over 1.0 without uninstalling.

## Initial artifact: 1.0

- App: DevTinder 1.0, version code 1; package `com.amanxsays.devtinder`.
- Minimum Android: 8.0 (API 26); target API 36.
- Source: frontend commit `8dac4a9` (the tested APK predates the website download page).
- Release tag: `android-v1.0.0`.
- Asset: `DevTinder-1.0.0.apk`, 5,684,757 bytes.
- SHA-256: `9c1751a457585713c4537e2535c2084f1679d803ef64d9f45023535f60368359`.
- Signing certificate SHA-256: `aab1071e2f3d8c0e454946bdd598d99d91e3b669f892e9000a6f0ccd3e113ed0`.
- Primary download: `https://devtinderfront.netlify.app/downloads/DevTinder-1.0.0.apk`.
- Alternative: `https://github.com/amanxsays/dev-Tinder-frontend/releases/download/android-v1.0.0/DevTinder-1.0.0.apk`.

The signed APK was inspected for identity, signature, production bundle marker, live Node/Spring endpoints, and targeted credential/fixture patterns. The owner confirmed production login and background message notification/tap behavior on a physical phone. Earlier development-device checks cover dictation, Read aloud, request notifications, and session restoration; the full regression matrix remains in FINAL-PHONE-CHECKLIST.md. Do not describe limited phone coverage as testing every Android version or device.

## Publish order

1. Keep the permanent signing keystore and passwords outside Git and back them up privately.
2. Copy the inspected APK into a local release staging folder outside the repository. Write `SHA256SUMS.txt` for the exact renamed asset; renaming does not change its checksum.
3. Authenticate GitHub CLI with browser login. Create a draft GitHub Release at the source commit, upload only the APK and checksum file, then verify asset names/sizes and publish the release. The repository and assets must be publicly accessible for anonymous website downloads.
4. Download the public release asset again and compare SHA-256 with the inspected APK. Do not publish a live website link until this succeeds.
5. Update the pinned release metadata in `src/utils/androidRelease.js`. `npm run build` runs Vite and then `scripts/prepare-android-download.mjs`, which fetches the public release, enforces exact size and SHA-256, and writes only verified bytes to `dist/downloads/`. Missing, truncated, oversized, or changed content fails the build. GitHub must be reachable during the web build; visitors download directly from Netlify afterward. The Android build does not run this staging step and never embeds an APK inside itself.
6. Keep `public/_headers` synchronized with the versioned APK path and filename. Netlify serves it as `application/vnd.android.package-archive` with `Content-Disposition: attachment`, a filename, and immutable versioned caching. The link also uses the browser's `download` attribute. No JavaScript blob download or backend proxy is involved. The existing SPA rewrite serves real files before its fallback.
7. Deploy through the existing GitHub/Netlify flow. Verify `/download` without login, then download the same-site APK and compare SHA-256. Check attachment headers, byte-range requests and the completed download in supported browsers. Physical Android browser behavior must still be checked; no website can bypass device policy, storage, browser restrictions or network failures.

No Firebase Admin JSON, signing key, password file, `.env`, or Android client configuration file belongs in a release upload. The APK necessarily includes the Firebase client configuration used by Android; server service-account credentials must never be bundled.

## Future updates

Increase Android `versionCode`, set the new `versionName`, build with the same application ID and permanent signing key, inspect and test an upgrade without uninstalling, then publish a new tag and asset name. Update `src/utils/androidRelease.js`, the displayed version/size in `src/components/DownloadAndroid.jsx`, and the exact APK path/filename in `public/_headers` together. Keep previous GitHub release assets available until intentionally retired. The current Netlify output mirrors only the pinned version; `public/_redirects` sends the older 1.0 Netlify APK path to the current 1.0.1 same-site APK, so stale website links cannot serve the outdated app. The download page revalidates on visits; the old-path redirect is not cached. Explicit historical GitHub releases remain available separately. Add an explicit old-path redirect when retiring each subsequent Netlify mirror.

Website deployments and backend deployments do not replace the app's bundled frontend. Users install updated APKs manually. No automatic updater or Google Play publishing is part of this change.

## Rollback

Revert the website download-page commit or link it to the last verified release. Stop distributing a faulty release without deleting application data. An APK fix for already-installed users requires a new build with a higher version code and the same signing identity; downgrading the APK is not the normal recovery path.
