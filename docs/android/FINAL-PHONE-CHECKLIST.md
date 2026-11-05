# Final Android review

## Build and service prerequisites

The updated client bundles the frontend and includes the approved Android features. The current locally generated APK is still **a debug build for local services**, not a public release. Its API endpoints are device localhost ports 17777 and 18080. Those endpoints require running isolated services plus USB reverse forwarding; unplugging the phone disconnects that test setup.

For a final test away from USB, first deploy the compatible frontend/Node/Spring changes to the existing services through a separately reviewed rollout, configure matching Firebase client/server projects and notification environments, and rebuild with the public HTTPS API URLs. Production Firebase configuration and a retained release signing identity are still owner setup tasks. No live deployment, production environment, or website download link was changed in this UI pass.

Install the **updated** APK before checking the list below. The earlier phone build does not contain the new safe-area and layout fixes. Use disposable test users and a non-sensitive PDF. Keep private credentials out of chat and Git.

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
