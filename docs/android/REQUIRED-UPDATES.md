# Required Android updates (1.0.4 / versionCode 5)

## User experience

The release Android bundle wraps the entire React app in AndroidUpdateGate. Before authentication, services or routes mount, it reads the installed package/versionCode via the existing Capacitor App plugin and fetches a static Netlify manifest. Older installed builds see Update to continue with no Later/dismiss action. Update now uses the existing AppLauncher plugin to open the exact versioned APK on Netlify in the phone browser. It does not navigate to GitHub or the website download page. The user must finish the browser download and approve Android installation; silent/in-process installation is not implemented.

The update gate stays blocked after download/cancellation/return, until a valid version check confirms that the installed build is current. Native Back minimizes the app while blocked. Rechecks run on foreground, online/visibility events, Check again, and every five minutes while visible. This is UI gating, not a tamper-proof backend access control or an instantaneous server-side revocation mechanism. A new version may take until the next check to be noticed.

In 1.0.4, failed checks strictly block with Retry. Starting with 1.0.5, the requested cached offline mode allows an unexpired session to use saved data when the version was verified within the last 24 hours; a known required newer release still always blocks. Online failures remain blocked; uncached/expired offline decisions require reconnecting. See 1.0.5-SRI.md. Existing required-version information is retained after a failed recheck. Current builds continue normally when checks succeed; a newer installed build is also allowed. Debug/development Android builds explicitly bypass the release gate. Web browsing and /download do not run native update checks.

## Static manifest and publication

URL: https://devtinderfront.netlify.app/android-version.json

Fields: applicationId, numeric versionCode, versionName, exact versioned apkUrl, sha256, bytes. The client accepts only com.amanxsays.devtinder and the corresponding HTTPS devtinderfront.netlify.app/downloads/DevTinder-X.Y.Z.apk URL. Arbitrary hosts, query strings, redirects, malformed JSON and incompatible identities are rejected. Requests omit credentials, bypass cache and time out after 12 seconds.

The existing web build mirrors the pinned GitHub release APK, verifies its hash/size, and generates dist/android-version.json only after successful verification. Netlify deploys the manifest and matching APK together. _headers sets no-store, JSON MIME, CORS for the native localhost origin, and nosniff. No Node/Spring wake-up or API change is needed.

For every future release:
1. Increase Gradle versionCode/versionName; build with the SAME release key and application ID.
2. Inspect package, signature, bundle endpoints and hash. Upload a uniquely versioned release asset.
3. Update androidRelease.js with applicationId/versionCode/versionName/filename/bytes/hash/sourceUrl/downloadPath, plus the download page and headers/redirects.
4. Run tests/build. Publish the web update only after the new APK is available and verified. Do not raise the manifest version before the APK is ready; this would lock out users without an installable update.
5. Verify the live manifest/asset before requesting users to update. Historical release assets remain intact.

Current rollout: signed production code 5 / 1.0.4 is published on GitHub Releases. Download metadata and the static manifest are updated to verified 1.0.4/code 5 in the same Netlify web build. The first distributed APK with this feature must be installed manually once. A website update cannot inject this feature into old bundled APKs.

Rollback: revert the manifest metadata and publish only an existing verified APK; clients with a newer code remain allowed. Android will not normally downgrade an installed app. For an application fix, publish a higher versionCode signed with the same key. Do not revoke signing keys or delete installed user data.

## Validation

- 94 Node tests passed: older/equal/newer versions, URL/package/hash/schema rejection, network/JSON/HTTP failure, and manifest generation only after verified APK bytes.
- Focused ESLint, production web build, Android debug assembly, unit tests and lint passed.
- Mocked 360px native UI: required update blocks app/API startup; Update now opens only the Netlify APK URL; downloading/rechecking without an install stays blocked; a current build unlocks; offline checks stay blocked; web login remains unchanged. No real provider calls or APK installation were performed.
- Still required on phone: signed 1.0.4 startup and resume; browser download/Android installer handoff; blocked Back; failed network retry; update over existing app without data loss. Use an isolated manifest fixture for testing a newer required build; do not raise production version metadata for a nonexistent release.

Official APIs: https://capacitorjs.com/docs/apis/app and https://capacitorjs.com/docs/apis/app-launcher
