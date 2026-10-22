# DevTinder chat UI and voice implementation plan

Approved for implementation on feature/chat-voice-ui. Original requirements:
[requirements.md](requirements.md). The user's subsequent implementation request supersedes the requirements draft's earlier documentation-only restriction.

## Final product decisions

- AI recruiter is a **right-side panel**, restored at the user's request during implementation; it is not a desktop full-screen assistant.
- Use **DevTinder blue/cyan**, replacing the initially planned purple/pink palette.
- Human conversations remain on their existing full-page route with the shared visual language.
- The floating AI orb is draggable by mouse/touch, movable with arrow keys (Shift for larger steps), and animated with gentle glow, reflection and floating motion.
- Keep the launcher inside the viewport on drag/resize. Dragging does not submit queries or open chat. Clicking or Enter opens the recruiter.
- Respect reduced motion and pause decorative animations when the page is hidden.
- /chat/ai-agent opens the same recruiter UI and conversation. Closing from that URL returns to /connections.
- Resume preview opens **left of AI chat on desktop**, as an overlay on mobile, with Back/Close and Open in new tab.
- Voice means editable English (en-IN) browser **dictation**, not recorded audio messaging.
- Explicit microphone activation, Stop and Cancel; 60-second maximum session. No automatic restart or send.
- Review the transcript and explicitly Send through the existing text transport.
- Separate in-memory drafts per account/conversation; clear on account change/logout/reload.
- Optional Read aloud for completed AI answers, using English browser synthesis at normal speed; no human-message read-aloud.
- Chrome desktop/Android are primary voice targets; feature-detect and preserve typing elsewhere.
- No new runtime or testing dependencies. No backend or integration-service changes.

The initial full-screen/purple plan is superseded only in presentation by the user's blue side-panel correction. Voice, persistence, transport, security and regression requirements remain in force. Exact visual styling remains reviewable.

## Architecture and existing behavior

### Frontend

React 19, Vite 7, Redux Toolkit, React Router, Tailwind/DaisyUI, existing react-icons/Framer Motion. Shared shell/composer/orb/scroller and transient experience context. Redux continues to own authenticated user state.

AiDrawerLayout owns the recruiter messages, suggestions, status history, source validation and selected PDF. useAgenticChat owns the browser POST/SSE request. Extract the existing safe Markdown/code-copy/resume-reference renderer without changing syntax or allowed URL schemes.

Chat owns human history and a single Socket.IO connection for the mounted conversation. Reuse that connection for Send and Receive, rejoin after reconnect, remove listeners on exit, and ignore stale history/socket callbacks. Use broadcasts to insert live messages instead of an additional optimistic copy.

Keep independent human and AI transports. Browser speech produces text only. Recognition/playback ownership is shared application-wide and protected by session identity; stale results cannot edit another conversation or a sent draft.

### Backend: unchanged

Express, JWT cookie middleware, Socket.IO, Mongoose. Human history is persisted in Chat documents with participants and embedded text messages referencing sender IDs, with timestamps. Authentication/cookies, relationship intent, schemas, routes and service configuration remain unchanged.

### Integration service: unchanged

Java 25/Spring Boot, POST/SSE chat controller, immediate fast intents, Redis queues/workers, hybrid Mongo/Pinecone retrieval, Gemini generation and preference memory, current-resume checks and cleanup. The UI adds no AI calls for speech/interim results/playback or animations.

### Public contracts: unchanged

| Purpose | Contract |
| --- | --- |
| History | GET /chat/:targetUserId, existing JWT cookie |
| Room | joinChat({ userId, targetUserId }) |
| Send | sendMessage({ firstName, userId, targetUserId, text, photoUrl }) |
| Receive | messageReceived({ firstName, text, photoUrl }) |
| AI | POST /api/chat/stream with { query, userId } |
| SSE | status, sources, message, error; JSON answer and older plain-text compatibility |
| Source validation | POST /profile/resume/active-sources, existing credentials |

No audio route/schema, external voice processor integration, paid TTS, persistent AI conversation store, new environment variable or deployment change.

## Files

All paths below are relative to dev-Tinder-frontend.

Modify:
- src/App.jsx
- src/components/AiDrawerLayout.jsx
- src/components/Chat.jsx
- src/components/ResumePreview.jsx
- src/hooks/useAgenticChat.js
- package.json (Node test script only)

Create:
- src/contexts/ChatExperienceContext.js
- src/components/chat/ChatExperienceProvider.jsx
- src/components/chat/ChatShell.jsx
- src/components/chat/ChatComposer.jsx
- src/components/chat/ChatOrb.jsx
- src/components/chat/ChatMarkdown.jsx
- src/components/chat/AiChatRoute.jsx
- src/hooks/useChatScroll.js
- src/hooks/useVoiceDictation.js
- src/hooks/useReadAloud.js
- src/utils/speechRuntime.js
- src/utils/speechText.js
- src/utils/chatMessages.js
- src/styles/chat.css
- tests/speechRuntime.test.mjs
- tests/speechText.test.mjs
- tests/chatMessages.test.mjs

No changes to backend or Java source/dependencies.

## Implementation phases

### Phase 0 — Baseline (all repositories, read-only)

Inspect branches/status, tracked/untracked changes, chat/auth/socket/SSE/resume implementations and existing tests. Record pre-existing lint/build failures. Use isolated fixtures; do not start a production-connected application context or send test requests to live services.

Acceptance/tests: existing frontend Node tests, lint/build baseline, backend syntax checks, and selected mocked Java tests. Keep unrelated changes intact.

### Phase 1 — Shared presentation and memory (frontend)

Files: App, experience context/provider, ChatShell, ChatComposer, ChatOrb, useChatScroll, chat.css.

Build accessible header, scrollable history, composer and circular orb. Use the final blue/cyan palette and right-side recruiter panel. Preserve human page navigation. Make the launcher draggable with Pointer Events, pointer capture, click-vs-drag threshold, viewport clamping and keyboard movement. Provide only approved controls.

Keep per-conversation in-memory drafts, Enter to send, Shift+Enter newline and IME protection. Follow new content only near the bottom; provide Jump to latest otherwise. Use native modal dialog focus containment/inert background and return focus to the opener.

Dependencies: baseline.
Acceptance/tests: typing works without speech, launcher never requests microphone access, draft isolation/retention, keyboard/focus and reduced motion, no horizontal overflow at 360/768/1440px. Temporary previews reviewed alongside the reference; no showcase frame/camera/image controls.

### Phase 2 — AI recruiter and legacy route (frontend)

Files: AiDrawerLayout, ResumePreview, useAgenticChat, App, ChatMarkdown, AiChatRoute.

Retain welcome/suggestions, Markdown/code copy, timestamps, statuses/partial response and current sources. Reuse one recruiter state for launcher and legacy route. Preserve opt-in VITE_AI_CHAT_ENABLED, API/proxy configuration and current identity payload.

Keep PDF on the left desktop/mobile overlay and preview-first Escape behavior. Recheck sources before opening, on open/focus, every 30 seconds while visible, and on resume-change events. Retired sources replace affected answers, close affected previews and stop affected playback. Fail source validation without presenting success citations.

Guard stale callbacks and double sends. Abort browser requests on account change/unmount; use a bounded browser timeout and handle dropped/empty streams. Ordinary panel close preserves the in-flight request/conversation. Browser abort does not claim to cancel queued server work.

Dependencies: shared presentation.
Acceptance/tests: SSE JSON/plain-text compatibility, fast greeting unchanged, source freshness, close/reopen and account change, terminal errors without citations, no duplicate AI submission, disabled-AI behavior and legacy route dismissal.

### Phase 3 — Human chat and socket lifecycle (frontend)

Files: Chat, chatMessages and its tests; shared shell/composer.

Preserve partner name/avatar, history, timestamp display and text persistence. Resolve partner from connections or existing authenticated profile endpoint. Use one socket, reconnect/rejoin, cleanup and stale-response guards. Retain historical sender IDs; legacy live events remain limited to existing metadata.

Keep unsent drafts when disconnected. Do not buffer a silent retry, infer delivery/read status, add acknowledgements, or alter server authorization.

Dependencies: shared presentation; independent of Phase 2.
Acceptance/tests: two isolated clients exchange one rendered copy, history reload, repeated text, reconnect/target switching, missing sender/invalid date, no listener/socket accumulation.

### Phase 4 — Browser dictation (frontend)

Files: speechRuntime, useVoiceDictation, provider/composer and both chat integrations, speechRuntime tests.

Use SpeechRecognition/webkitSpeechRecognition, en-IN, interimResults and continuous results where available. Do not use MediaRecorder, audio uploads or a preliminary getUserMedia call. The browser may send audio to its speech service; disclose this and retain typing fallback.

States: idle, permission pending, listening, finishing, review, cancelled, error. Snapshot the pre-recording draft; append confirmed results at the end. Reconstruct indexed results so interim/final revisions do not duplicate text. Keep provisional words separate. Text is read-only during capture; Stop and edit ends capture first.

Explicit microphone action only. Stop at 60 seconds, permit a brief final-results window, and terminate with a watchdog if necessary. Send during capture stops for review; it requires another explicit Send afterward. Cancel restores the exact prior draft. Close/navigation/backgrounding preserves confirmed text and drops provisional words; logout/reset invalidates all speech callbacks.

Dependencies: both chat integrations.
Acceptance/tests: fake recognition/timers cover permission, silence/network/device failures, timeout, Stop/Cancel, repeated results, late callbacks, concurrent owners and cleanup; manual real microphone/Android checks remain necessary.

### Phase 5 — AI Read aloud (frontend)

Files: useReadAloud, speechText, speechRuntime/provider, recruiter controls and tests.

Use SpeechSynthesis/SpeechSynthesisUtterance after explicit activation on completed successful answers. Prefer available English voice, normal speed, no new settings/provider. Speak prose/link labels, omit fenced code/raw URLs/internal resume identifiers and separate citation list. Split long text at natural boundaries.

One spoken answer at a time. Stop works; a new answer replaces playback, dictation cancels playback, and close/navigation/background/logout/source invalidation releases it. Missing voices/engines or playback errors keep text usable.

Dependencies: AI integration and speech ownership.
Acceptance/tests: plain-text conversion, long chunks, cancellation/late callbacks, error recovery, mutual exclusion and no additional network/provider requests.

### Phase 6 — Regression, accessibility and review (all repositories)

Frontend changes only. Verify all preservation/UI/voice/error requirements and final diff.

Keyboard/focus/Escape and accessible names; 44px primary targets, readable contrast, polite status announcements, unannounced provisional words/decorations, reduced motion and paused hidden animations. Treat dictated/received text as untrusted; preserve React escaping and safe link schemes.

Run frontend tests/build/lint, selected mocked Java regressions and backend syntax checks. Use isolated browser/socket fixtures for messaging, responsive screenshots, speech failures, citations, feature flags, draft retention and service errors. Do not claim actual microphone/device or live-provider tests from mocks.

Acceptance: new tests pass/build succeeds/no new lint errors, existing features preserved, no added dependencies/secrets/raw audio/persistent drafts, no hosting/env/schema/API changes.

## Security, risks and compatibility

- Socket events still trust client-supplied identity; Spring still accepts the existing body user ID. These are pre-existing release-review issues, not repaired by this frontend work.
- Live broadcasts lack canonical sender/message IDs and acknowledgements. Same-name live alignment, history/live races, exact reconciliation and persistence/recipient guarantees remain limited. Never label messages delivered/read without evidence.
- Speech support/provider availability/accuracy vary by browser; API presence is not a guarantee. Never promise offline-only or on-device-only processing.
- Gemini quota/503 and Redis problems are not solved by voice UI. Do not hide them or add automatic paid-query retries.
- Human history remains Mongo-backed; AI preference memory remains server-backed; AI transcript/drafts stay in memory.
- No audio clips, voice calls, wake words, camera/image features, receipts, presence, new auth design, monorepo migration or deployment work is included.
- No commit, push, merge, branch switch or deployment is authorized by this implementation task.

## Validation record

Baseline (2026-10-23 local session):
- All repositories on feature/chat-voice-ui.
- Backend/Java clean; frontend had untracked docs.
- Existing seven frontend tests passed; production build passed.
- Existing lint: three errors (NavBar unused err, UserCard unused motion, userSlice unused state), six hook warnings. Do not modify unrelated files to mask this baseline.

Implementation validation:
- 29 frontend Node tests pass, including the seven original tests and Brave-specific error/draft preservation checks.
- Browser fixture: blue right panel, 360/768/1440 layouts, drag without opening, keyboard orb movement, reduced motion, editable transcript, cancellation, draft close/reopen, SSE answer/error, read aloud, citations/source retirement, Escape and legacy route; no page errors.
- Isolated two-client Socket.IO fixture: broadcasts, sender/recipient text, history reload, unsupported recognition fallback, independent human/AI drafts and route/socket cleanup; no page errors and no production database.
- Full lint retains only the three pre-existing errors and five unrelated hook warnings; touched source files have no new warnings/errors.
- Frontend production build and focused lint of every touched source file pass. Full lint retains the baseline three unrelated errors. Existing build-size warning remains (no new dependencies were introduced).
- Backend chat/socket/model syntax checks pass and both server repositories remain clean.
- Selected Java mock suites could not execute: the shell uses Java 21 (class version 65), while existing tests are compiled for Java 25 (class version 69). No JDK, Maven, service or environment configuration was changed.
- Disabled-AI browser fixture passes with zero AI requests; human typing and recognition controls remain usable.
- Core palette checks: muted text at the brightest background exceeds 4.5:1; outgoing text uses a darker blue for normal-text contrast.
- Actual microphone permissions/provider recognition, Android hardware, Safari/Firefox/Brave engines, native voice audio quality, screen-reader and live-account integration remain manual follow-up checks; browser fixtures use mocked services.

### Follow-up: Brave guidance and stronger blue motion

- The user verified real dictation in Chrome and reported Brave's recognition network error. Brave's browser issue remains documented at https://github.com/brave/brave-browser/issues/3725.
- Detect Brave through its optional browser API; retain ordinary feature detection and explicit microphone activation. Explain the Chrome/device-keyboard fallback for Brave network/service failures, without adding another speech provider or claiming Brave recognition is repaired.
- Add visible rotating cyan orbit rings, swirling inner light, a breathing halo and stronger floating/glow motion to the welcome/launcher orb. Small transcript icons remain quiet unless active.
- Preserve pointer/keyboard dragging, disable motion with reduced-motion preference, and pause every orb layer while the page is hidden or the launcher is being dragged.
- Mocked browser verification covers changing ring transforms, Brave error guidance and preserved draft, drag without opening, hidden-page pause, reduced motion and mobile overflow. Production build and focused lint pass.

### Follow-up: charcoal UI, live activity and welcome layout

- Keep blue as an accent on charcoal header, conversation, message and composer surfaces.
- Replace the plain pending-status list with AiProgress: actual received status history, active-stage marker, spinner/dots, indeterminate sweep and decorative placeholder shimmer. No invented queue position, percentage, elapsed time or model reasoning.
- Refine the orb to contained liquid-blue light, a moving glass highlight and a restrained halo. Remove external orbiting rings; retain dragging, reduced-motion and hidden-page behavior.
- Disable message-following/Jump to latest on the empty welcome screen, preventing a button from covering the welcome heading.
- Use a compact welcome heading and a horizontal orb/title arrangement on short or zoomed windows. Keep every suggestion and preserve the editable text/voice composer.
- Delayed localhost SSE verification passes for queued/processing states, changing spinner transforms, background/closed-panel pause, reduced motion, close/reopen without another request, and final success/error cleanup.
- Browser checks pass at 360x600, 480x600, 360x900 and 1440x900: welcome starts at the top, no false Jump to latest, heading/description visible, no horizontal overflow. Production build and focused lint pass; existing 29 Node tests pass.

### Follow-up: video-inspired glass UI and fixed launcher

- Adapt the supplied Gemini video with an original SVG glass speech-bubble orb, morphing cyan/blue ribbons, subtle rim highlights and restrained glow. No video frames, logos, watermarks or new assets/dependencies are included.
- Use a dark glass side panel, silver incoming bubbles, soft blue outgoing bubbles, readable Markdown/citation controls and a compact auto-growing horizontal composer with the existing keyboard, dictation and Send actions.
- The user's latest decision supersedes all earlier dragging requirements: the launcher stays fixed at the bottom-right. Remove pointer dragging, keyboard repositioning and launcher translation animation; retain internal ribbon animation and normal button keyboard activation.
- Pause animated SVG timelines outside the viewport, when the page is hidden and with reduced motion. Static message icons do not mount ribbon animations.
- Local Chrome fixture checks pass for fixed position after dragging/arrow keys, keyboard opening, actual SVG path morphing, compact composer, explicit dictation review, queue/thinking transitions, final Markdown/code copy/Read aloud, resume preview and source retirement, and responsive layouts at 360x600, 480x600, 360x900 and 1440x900. No browser page or SVG errors were reported.
- Welcome, conversation and mobile screenshots were inspected. Production build and focused lint pass. Real browser speech providers and production services were not exercised by these isolated fixtures.

### Follow-up: smooth liquid-drop treatment

- Replace the speech-bubble silhouette and sharp ribbon bands with a rounded blue water drop, soft refraction, a restrained rim and polished highlights.
- Morph the contour through three compatible cubic shapes over a ten-second idle cycle, with a slightly quicker six-second active cycle. Soft internal light changes independently; neither the launcher nor the welcome graphic translates or spins.
- Retain fixed bottom-right placement, explicit keyboard/click activation, viewport/hidden-page pausing and reduced-motion support. Small inactive message icons remain static.
- Chrome fixture verifies actual contour and inner-light deformation, fixed placement, reduced motion, dictation review, progress states, Markdown/code copy, Read aloud and resume validation/preview. Desktop/mobile screenshots inspected with no page/SVG errors. Production build and focused component lint pass; existing bundle-size warning remains.

### Follow-up: restore and refine the previous globe

- The user's latest direction replaces the drop treatment and limits this revision to the globe. Restore the previous glass speech-bubble globe and its three fluid bands; keep the chat layout and queue UI unchanged.
- Soften band edges and rim highlights, add subtle depth shading, and use slightly longer eased animation loops. Keep the launcher fixed without floating or dragging, and preserve reduced-motion/visibility pausing.
- Isolated Chrome checks pass for actual ribbon deformation, fixed position, keyboard opening, responsive layout, speech controls, queue transitions and citations. Launcher/welcome screenshots inspected; production build and focused component lint pass. No new dependencies or server changes.

### Follow-up: current-task ripple only

- Remove the progress spinner, bouncing dots, loading rail, skeleton shimmer and rotating ring around the header globe. Preserve the globe's approved internal fluid animation.
- Show the received task history with a gentle two-wave outward ripple around the current task marker. Completed markers remain still; the ripple moves to the latest received task. Keep the status announcement for assistive technology and partial-answer rendering.
- Reduced motion uses a steady current marker; backgrounding and closing the panel pause the ripple.
- Isolated Chrome checks pass for ripple transform changes, exactly one current task, completed-marker animation removal, reduced motion, background pausing and absence of the removed loaders. Queue/thinking screenshots inspected; existing chat/voice/citation fixture, production build and focused lint pass.

### Follow-up: authentication background and signed-in AI access

- Replace the login/signup group photo with local static navy gradients, a faint grid and low-contrast contour lines. Add scoped card/input styling for readable colours in either system colour scheme; preserve login/signup/OTP request handling.
- Mount the recruiter controller only for a signed-in Redux account. Anonymous callers cannot open the shared AI surface or send a query; logout unmounts the controller and releases pending browser work. The dedicated AI route waits for the existing cookie-session check and follows Body's existing login redirect when signed out.
- Chrome fixtures verify desktop/tablet/mobile layout, signup switching, zero old-photo downloads, no anonymous launcher/dialog/AI requests, signed-out direct-route redirect, authenticated direct-route opening and launcher removal after logout. Screenshot review, 29 Node tests, production build and focused lint pass. No server authentication contracts, environment settings or deployments changed.

### Follow-up: application background/header and pending-request badge

- Extend the static navy/grid background to the application shell. Refresh the sticky header with compact branding, active navigation, accessible request/connection links, search styling and the existing account menu. Preserve all existing route destinations and search behaviour.
- Fix the bell's initial-state bug: requests were fetched only by the Requests page. The persistent header now loads the same authenticated received-requests endpoint after sign-in, on navigation/focus/online/visibility restoration, and every 60 seconds while visible. The Requests page consumes this shared Redux list.
- Show the real pending count with a gentle expanding badge ripple. Reviews update it through the existing reducer; zero requests removes it. Reduced motion retains a steady badge. Cancel reads on cleanup, reject responses belonging to another account, and ignore stale snapshots if a review changed the list while a read was in flight. Temporary refresh failures preserve the last confirmed count.
- Isolated Chrome fixtures pass for a badge on the initial feed before visiting Requests, visible and reduced-motion states, focus/60-second refreshes, review/stale-read races, empty-state removal, network failure retention and logout/account isolation. Header screenshots inspected at 1440, 768, 360 and 320 pixels with no horizontal overflow; all action targets remain at least 44 pixels.
- Login/AI visibility regression fixture and 29 Node tests pass; production build succeeds. Focused lint reports no errors and the pre-existing Body effect-dependency warning. No backend, integration-service, environment or deployment changes.
