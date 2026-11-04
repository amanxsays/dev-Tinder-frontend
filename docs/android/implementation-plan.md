# DevTinder Android and Firebase notifications — approved implementation

The Android app shares this repository's React/Vite source through Capacitor.
Node and Spring remain separate repositories and existing deployments are reused.
Implementation was authorized after the reviewed plan; production setup,
deployment, signing-key generation, and public APK distribution remain separate
release actions. No service credentials belong in frontend configuration.

## Confirmed decisions

- APK first; Google Play publishing is a later release.
- App name `DevTinder`, application ID `com.amanxsays.devtinder`, existing blue logo.
- Bundle assets locally; never load the production website as the app shell.
- Preserve browser HTTP-only cookies; use Android bearer JWTs encrypted by a
  Keystore-backed key. JWT lifetime remains one day, without refresh tokens.
- Generic FCM alerts for persisted human messages and incoming interested requests.
- Generic alerts continue after session expiry, but tapping requires authentication.
- One account binding per installation, multiple installations per user. Explicit
  logout/account switching disable old bindings immediately on-device.
- Native `en-IN` dictation with review and explicit Send, maximum 60 seconds;
  optional native AI Read aloud; no stored/uploaded audio or calls.
- Native in-app PDF preview with existing resume-source validation retained.
- Secure Socket.IO identity/connection checks and route AI through authenticated Node.
- No migrations to Firebase Auth/Firestore and no new hosting service.

## Architecture and contracts

### Native session

`POST /mobile/login` and `/mobile/signup` share existing validation and return
`{message,data,token,expiresAt}`. Native JWT audience `devtinder-android`, issuer
`devtinder-api`; existing browser cookie sessions continue to work. Existing OTP
route is retained. First-party API credentials must never attach to Cloudinary,
external links, or public readiness requests.

### Secure messaging

Authenticate the socket handshake and derive sender identity server-side. Check
accepted connections for history, joins, and sends; expire sockets with their JWT.
Keep event names, extending live payloads with canonical message/sender/target IDs
and timestamps. Persist before broadcast. Optional send acknowledgement represents
successful persistence, not recipient delivery/read status. Do not automatically
retry ambiguous sends; reload history first and deduplicate by canonical ID.

### Push

- Authenticated `PUT /push/installations/:installationId` registers or rebinds a
  device with `{token,installationSecret,platform:'android',environment}` and
  returns `{bindingId,expiresAt}`.
- Scoped installation-secret `PUT .../token` and `DELETE ...` permit token rotation
  and revocation after login expiry, not access to application data.
- `PushInstallation` stores account binding, token, hashed capability, environment,
  enabled state, and expiry. Authenticated renewal is required within 30 days.
- `NotificationEvent` is a durable outbox. Save it transactionally with eligible
  chat/request writes when push is enabled. Dispatch with leases, bounded retries,
  per-installation outcomes, invalid-token cleanup, and 24-hour event expiry.
- Data payload: `{eventId,type,bindingId,targetUserId?,createdAt,expiresAt}`. No
  message content, names, resumes, or credentials.
- A native Firebase service rejects expired/wrong-binding/duplicate events before
  display even without React. Suppress alerts for an actively viewed conversation.
- Taps queue a structured destination until authentication and authorization pass.
- Prompt after login through an explicit Enable action; denial does not block chat.

### AI gateway

Clients POST `{query}` to authenticated Node `/ai/chat/stream`. Node streams Spring
SSE and asserts the authenticated ID using a separate shared server secret. Spring
verifies before fast-intent or Redis work. Preserve SSE events, citations, readiness
wait, answer timeout, cancellation, and no automatic POST retries. See the Spring
repository's `docs/ANDROID-GATEWAY.md` for the exact signed protocol and rollout.

## Platform bridge boundary

Use `DevTinderSession`, `DevTinderSpeech`, `DevTinderNotifications`, and
`DevTinderPdf` native plugins behind `src/platform` adapters. Browser fallback
paths retain existing behavior. Android lifecycle owns Back navigation, background
speech stop, notification context, safe areas, and keyboard handling.

Keep JavaScript fetch unpatched for streaming and FormData uploads. Native PDF
downloads are restricted to validated HTTPS Cloudinary URLs, bounded to 5 MB, and
stored only in private temporary cache. Native navigation must not load arbitrary
external pages into the privileged WebView.

## Execution and verification phases

1. **Shell/toolchain:** bundled debug APK, branding, local build commands, Android
   origin, native bridge registration. Missing Firebase config must be explicit;
   never fabricate production credentials.
2. **Sessions/chat:** native login/restore/logout, secure socket identity, accepted
   connection checks, canonical messages, acknowledgements, stale/dedup protection.
3. **AI:** signed gateway and Spring verifier, streaming/cancellation tests, direct
   unsigned rejection; preserve fast intents and resume validation.
4. **Adapters:** dictation, TTS, PDF, file picker, clipboard, external links, Back,
   system insets, and lifecycle cleanup.
5. **Server push:** installation security, transaction/outbox, retries and token cleanup.
6. **Device push:** permissions/channels, foreground/background/killed-process
   alerts, taps, offline logout, account switch, expired login, and multiple devices.
7. **Release:** full web regression, signed APK upgrade verification, real-device
   two-user checks, privacy disclosures, environment/secret checklist and rollback.

Existing baseline at approval: frontend 47 tests; Node 15 tests; Spring 34 isolated
tests; web build passed with its existing bundle-size warning. Each implementation
owner adds meaningful tests. Do not run production-connected Spring context tests
or mutate production MongoDB while validating.

Real-phone microphone, battery, force-stop, Play services, and FCM delivery tests
remain required. Android Studio/SDK and a confirmed real phone were unavailable
at planning time. Tooling setup can refine this; report actual evidence, never
claim unperformed device checks.

## Release controls

FCM alone is free; Firebase Functions/Firestore are unnecessary. Existing Render
sleep/quota limits still apply and can delay sends before FCM receives an event.
No permanent keepalive is added, and instant/exactly-once delivery is not promised.

Use isolated development Firebase/database/Redis resources before production.
Keep Firebase Admin credentials and APK signing keys outside Git. Publish a signed
versioned APK/checksum only after release authorization; prepare the website link
without claiming the APK is already publicly downloadable. Backward-compatible
server changes precede clients; enforce signed Spring AI once web migration is
complete. Disable push dispatch or AI if needed instead of weakening security.

Deferred: iOS, calls, recorded voice messages, offline message queues, end-to-end
encryption, guaranteed background AI completion, Play Store publishing, and repair
of unrelated legacy service/data issues.
