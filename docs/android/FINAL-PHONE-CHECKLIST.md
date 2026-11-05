# Final Android review

## Build and service prerequisites

Production APK **1.0.1 / version code 2** is signed and published, with a system notification prompt after sign-in, compact notification settings, no opt-in banner, and no website footer inside Android. It uses the deployed HTTPS services and the same package/signing certificate as 1.0. Release inspection and anonymous artifact checksum verification passed; the final physical-device upgrade and new permission-dialog checks below are still pending.

The compatible Node/Spring rollout, production Firebase setup, signing-key creation, and initial website download release are complete. The new APK must use the same application ID and key, with the increased version code, so users can update without uninstalling. `powershell -NoProfile -File scripts/build-signed-android.ps1` builds with the current public HTTPS endpoints and asks for the signing password privately.

Install the **updated** APK before checking the list below. Version 1.0 has the prior safe-area fixes but does not contain the new notification and footer changes. Use disposable test users and a non-sensitive PDF. Keep private credentials out of chat and Git.

For 1.0.1 specifically: on Android 13+, a new install asks through the standard Android dialog after sign-in; Allow registers the device, denial/dismissal does not repeatedly prompt, and an already-granted upgrade does not ask again. An explicit in-app opt-out stays off. Verify the single Settings switch and the Android Settings shortcut when permission is blocked. The app footer and old opt-in banner should be absent on login, feed, profile and settings. Earlier Android versions may already grant notification access without a runtime dialog. See [Android's permission behavior](https://developer.android.com/develop/ui/views/notifications/notification-permission).

Local verification for these changes: 87 Node tests passed, including onboarding deduplication, denial, prior permission/opt-out and account-switch cases; web production build and focused ESLint passed; Android debug assembly, JVM tests and lint passed. A browser with a simulated native bridge verified one prompt, registration after Allow, toggle opt-out, no banner/footer and a 360px layout. This does not replace testing the real Android system dialog on the newly signed APK.

## What changed

- Android headers, chat composer, launcher and toasts use Capacitor's injected safe areas, with browser-inset fallback and ordinary spacing added below the status bar.
- Login/signup have aligned labels, consistent input sizes, an accessible password toggle, keyboard/autofill hints, and Enter-to-submit. OTP verification and existing API contracts remain in place.
- Profile editing stacks on Android; connection/request rows wrap long names and keep actions reachable. Missing or failed photos show initials, including profile cards.
- Feed and connection failures show a retry action instead of a blank page. Empty states distinguish no results from loading failure.
- Native PDF previews reserve system-bar space, keep bounded private downloads/rendering, and identify each preview so stale close/open callbacks cannot reopen or deactivate another preview.
- No new runtime/testing dependencies were added. Web sessions remain one day and Android sessions remain ten days.

## One final phone pass

| Area | Steps | Expected result |
|---|---|---|
| Status bars and layout | Open Login, feed, profile, requests, human chat and AI chat; rotate the phone | Text and controls clear the status/navigation bars and cutout; no sideways page overflow |
| Text scaling | Try a larger Android font setting; check long developer names and profile text | Readable wrapping, no overlapping actions or clipped essential text |
| Keyboard | Focus each login/signup field and chat draft; show/hide keyboard; toggle password | Focused field/composer stays visible; password control works; typing remains available |
| Login/signup/OTP | Sign in with Enter; sign up/verify OTP on test infrastructure; check resend countdown | One request per explicit submission; correct loading/error feedback and existing navigation |
| Profiles/search | Search a partial name; open/edit a test profile; check coding stats | Existing search, profile updates and stats still work; form and preview fit the screen |
| Feed/connections | Open populated and empty lists; disconnect the API temporarily and retry | No blank failure screen; long names and missing photos remain usable |
| Human messaging | Two accepted-connection users exchange text and dictated drafts; reopen history | Messages persist once, belong to the correct sender/conversation, and reconnect safely |
| AI messaging | Submit a real query against the intended service; dismiss/reopen while waiting | Existing queue/status timeline, Markdown, citations and errors remain accurate; no duplicate submission |
| Voice input | Deny/re-enable permission; start, Stop, Cancel, reach 60 seconds, background the app | Reviewable text, no automatic Send, typed draft preserved; capture stops on interruption |
| Read aloud | Play a completed answer, Stop it, select another answer, start dictation, background app | Only requested speech plays; previous playback stops; unsupported/error states keep text available |
| Resume lifecycle | Upload a small PDF; preview pages/zoom; close/back/background; replace and delete it | Native preview stays inside safe areas, releases its private cache and cannot use invalidated sources |
| Resume errors | Try a non-PDF, oversized file, interrupted download or removed source | Clear error/fallback; no crash, endless loading, or stale preview reopening |
| Notifications | Grant, deny and re-enable; test message/request alerts in foreground/background; tap each | Generic text only; correct protected destination; active-conversation alerts suppressed |
| Sessions/accounts | Relaunch, log out offline, switch accounts, test expired credentials and a second device | Logout clears local access; old bindings cannot expose another account; protected content requires login |
| Battery/offline | Reconnect after offline time; test battery restrictions and Android Settings force-stop | Recovery is understandable; no claim of guaranteed instant delivery or push while force-stopped |

Several positive-path phone checks already passed on the earlier build: notifications/taps, dictation review, explicit Send, Read aloud, saved login and logout. The updated UI and extended cases above still need the final device pass. See [PHYSICAL-DEVICE.md](PHYSICAL-DEVICE.md).

## Automated/local evidence

The verification record in [VALIDATION.md](VALIDATION.md) distinguishes unit tests, browser fixtures, actual Android instrumentation, local server fixtures and user-observed phone checks. Native PDF instrumentation uses generated sample PDFs and an injected local connection in test code; it never downloads a personal resume or changes Cloudinary configuration. It does not replace the real upload/source-lifecycle phone checks.
