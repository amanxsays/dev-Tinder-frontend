# Physical Android verification - 2026-11-05

Development build tested on an I2219 phone running Android 16/API 36 with Android System WebView 156.0.8078.47. The device serial, FCM token, installation capability, and private credentials are deliberately omitted.

This report covers the positive-path baseline before the subsequent safe-area/auth/profile/PDF UI improvements. Retest the updated APK using [FINAL-PHONE-CHECKLIST.md](FINAL-PHONE-CHECKLIST.md); do not treat earlier device observations as proof of every newer screen.

## Setup and scope

- Package: `com.amanxsays.devtinder.debug`; debug-signed, bundled frontend.
- USB reverse forwarding connected device localhost ports 17777/18080 to disposable local test services. The Node service used a local MongoDB replica set and the development Firebase project; no production user or database was involved.
- Native login, accepted-connection chat, installation registration, transactional outbox, and FCM dispatch used the actual backend implementations.
- The AI answer came from an explicitly identified local SSE fixture. This verifies device streaming/UI/Read aloud, not Gemini, retrieval, or Spring production connectivity.
- No permissions were silently granted with ADB. The user accepted the notification prompt and used dictation through the normal app flow.

## Results

| Check | Evidence | Result |
|---|---|---|
| Bundled app launch and native login | Installed via USB; authenticated disposable recipient account | Pass |
| Ten-day session storage | Native bridge reported approximately ten days remaining | Pass |
| Notification permission and device registration | User chose Allow; backend stored authenticated installation | Pass |
| Incoming message push | Persisted message/outbox dispatched through real FCM; user saw generic New message alert | Pass |
| System-tray message tap | User confirmed Alice Fixture's conversation and saved message opened | Pass |
| Native dictation | User spoke through microphone and confirmed editable text appeared without automatic sending | Pass |
| Explicit send and deduplication | User tapped Send once; backend history contained exactly one recipient-authored message | Pass |
| AI Read aloud | User requested the fixture answer and explicitly tapped Read aloud; phone audio played | Pass |
| Incoming request push and tap | Saved request/outbox dispatched through real FCM; user confirmed Requests showed Charlie Fixture | Pass |
| Saved-login restoration | User closed/reopened the app and remained signed in | Pass |
| Explicit logout persistence | User logged out, closed/reopened the app and saw Login | Pass |

These are direct device checks plus user observations, not a promise of instant delivery on all devices. The phone's battery policies, long offline intervals, and Android Settings force-stop were not characterized. Session duration was validated by expiry metadata and time-boundary tests; no ten-day wall-clock soak test was performed.

## Still outstanding

- Resume upload/replacement/deletion and native PDF preview on the phone.
- Notification denial/re-enable, microphone denial, longer dictation/Stop/Cancel/background interruption, and Read aloud Stop/error scenarios.
- Multiple physical devices, physical account switching and token rotation, delayed/offline delivery, battery restrictions, and force-stop recovery.
- API 26/33 device matrix, physical screen-reader checks, production gateway/provider compatibility, signed release upgrade and distribution.
- Production Firebase configuration and a retained/backed-up release signing identity.

The test application remains a development build. It does not point to the production backend, and its local fixture accounts cease to work after the test services stop. A USB-connected test session requires running local services and the reverse mappings described in [TESTING.md](TESTING.md).
