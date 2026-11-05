# Firebase Cloud Messaging setup

FCM is used only for Android notification transport. MongoDB remains the application database; existing login and chat services remain in place. No Firebase Authentication, Firestore, Cloud Functions, analytics collection, or paid Firebase feature is needed by this integration.

## Environment separation

Use separate Firebase development and production projects. Register:

| Android build | Application ID | Config path | Backend environment |
|---|---|---|---|
| Debug | `com.amanxsays.devtinder.debug` | `android/app/src/debug/google-services.json` | `development` |
| Release | `com.amanxsays.devtinder` | `android/app/src/release/google-services.json` | `production` |

Download these client configurations from your own Firebase console after registering the exact application IDs. The files are ignored by Git. They contain project identifiers, not an Admin private key. Do not create fake files or reuse another application's package registration.

A debug build without Firebase configuration intentionally runs without push registration. Its UI must explain that notifications are unconfigured. A release build fails if its production configuration is missing.

## Server configuration

Enable the Firebase Cloud Messaging API. Provide a dedicated credential with messaging permissions to the existing Node server through its secret-file mechanism and `GOOGLE_APPLICATION_CREDENTIALS`; never put the private key in this repository, Vite variables, or an APK. Use the corresponding Firebase project for each backend environment.

Enable `PUSH_NOTIFICATIONS_ENABLED` only after the MongoDB transactional outbox, development-device registration, token cleanup, logout/account switching, and notification-tap tests pass. Confirm the backend's configured environment matches the APK. Do not change live Render configuration as part of a local build.

The client registers a high-entropy installation capability and FCM token against the authenticated account. The capability is stored encrypted and permits only installation token rotation/revocation after the JWT expires; it cannot read messages or profiles. Device tokens are not exposed in user APIs or logs.

## Permissions and notification behavior

Android 13+ requests notification permission only after the user chooses Enable. Denial does not disable chat. Microphone permission is independent and requested only when starting dictation.

Stable FCM high-priority data messages are handled by the native `DevTinderMessagingService`, including when React is not alive. The service posts generic notification text after checking the current binding, subscription expiry, event expiry, and duplicate event ID. It must never display a sender name, message text, JWT, or resume details.

There are separate Messages and Connection requests channels. Users can control them in Android settings. Opening the active conversation suppresses the corresponding push alert; Socket.IO still delivers chat content. Taps carry structured internal IDs, not arbitrary navigation URLs.

No second Firebase messaging service or `@capacitor/push-notifications` plugin is installed, to avoid competing handlers. AndroidConfigV2 early-access delivery is not used.

## Required real-device checks

1. Grant, deny, and later re-enable permission.
2. Exchange messages between two accounts in the foreground and background.
3. Kill the app process without force-stopping; verify delivery and cold-start navigation.
4. Switch accounts and log out offline while a push is in flight; no old-account alert may reappear.
5. Expire the ten-day Android JWT; generic alerts may continue but protected content requires login. Browser JWTs remain one day.
6. Refresh tokens, revoke a device, reinstall, and register multiple devices.
7. Verify invalid tokens are removed without deleting a newer registration.

Android force-stop, Google Play availability, battery restrictions, offline devices, Firebase quotas, and Render cold starts can delay or prevent notifications. FCM acceptance is not a recipient-delivery acknowledgement.

Official references: [Firebase Android receiving](https://firebase.google.com/docs/cloud-messaging/android/receive-messages), [FCM token maintenance](https://firebase.google.com/docs/cloud-messaging/manage-tokens), [Firebase pricing](https://firebase.google.com/pricing).
