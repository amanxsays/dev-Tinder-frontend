# Chat UI redesign and voice dictation requirements

Status: draft for review; not authorization to implement. Audited 2026-10-23.

## 1. Feature overview and goals

Redesign both DevTinder's AI recruiter and human-to-human chat using the supplied blue/purple assistant reference. Preserve existing text chat, networking, AI retrieval, preferences, and resume interactions. Add speech-to-text dictation to both chats, and optional read-aloud for AI answers.

### Confirmed product decisions

- Apply the redesign and dictation to **both** AI and human chats.
- Voice input means **dictation into editable text**, not sending recorded audio attachments.
- Require an explicit Send action after the user reviews the transcript.
- AI answers remain text-first, with an optional **Read aloud** action.
- Replace the rejected purple rounded-square sparkle launcher with a **small glowing circular orb** matching the reference.
- Browser-provided speech recognition is acceptable, with typing available when unsupported. A browser engine may process audio through its own speech service; do not promise on-device-only processing.

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| G-01 | Deliver a coherent reference-inspired UI across both chat surfaces without removing established features. | A review covers both chat surfaces, all preservation scenarios in section 3, and the reference states in section 4. |
| G-02 | Dictation is an optional way to compose the existing text messages, not a replacement for typing or a new messaging protocol. | The same final text can be typed or dictated and is sent through the existing human/AI text path; the app sends nothing merely because recognition stopped. |

## 2. Current implementation and reference evidence

### Audited application paths

Paths below are relative to the workspace root, not to this document.

| Area | Current implementation |
| --- | --- |
| Human chat UI | `dev-Tinder-frontend/src/components/Chat.jsx`: `/chat/:targetUserId`, history loading, text composer, optimistic local messages, avatars, timestamps. |
| Human transport | `dev-Tinder-frontend/src/utils/socket.js` and `dev-Tinder-backend/src/utils/socket.js`: WebSocket-only Socket.IO connection; `joinChat`, `sendMessage`, and `messageReceived`. Rooms are derived from sorted participant IDs. Joining checks accepted connections. |
| Human persistence | `dev-Tinder-backend/src/models/chat.js` and `src/routes/chat.js`: JWT-protected `GET /chat/:targetUserId`; MongoDB Chat has participants and embedded text messages with sender IDs and timestamps. No audio fields or media-message API exists. |
| Authentication | Node `src/middleware/auth.js` verifies the token cookie and loads the user. Frontend `Body.jsx` hydrates Redux from `/profile/view`; Socket.IO uses credentials. |
| Primary AI UI | `dev-Tinder-frontend/src/components/AiDrawerLayout.jsx`: app-wide drawer, welcome/suggestions, status trail, Markdown, source buttons, source validity checks, and resume preview. |
| AI transport | `src/hooks/useAgenticChat.js` and `src/utils/sseParser.js`: POST to `/api/chat/stream` with `{query, userId}`, consuming SSE `status`, `message`, `sources`, and `error` events. Current terminal answer carries text and source metadata. |
| AI processing | `integration-service` controller, orchestrator, fast-intent, retrieval, memory, Gemini, and streaming services: direct greeting responses; otherwise Redis jobs, hybrid Mongo/Pinecone retrieval, Gemini generation, and preference extraction. |
| Resume integration | Frontend source utilities and `ResumePreview.jsx`; Node `POST /profile/resume/active-sources`; Spring active-resume filtering and cleanup. Sources include document/candidate identity, filename, and URL. |
| Configuration | Frontend `VITE_AI_CHAT_ENABLED`, `VITE_API_URL`, and `VITE_STATS_SERVICE_URL`; local Vite HTTP proxies and a separate Socket.IO URL. Spring uses environment-specific Redis names and Gemini key rotation/cooldowns/retries. |

Existing limitations must not be mistaken for promised features:

- Human message schema is text-only. There is no speech recognition or speech synthesis implementation.
- AI conversation messages are component state; saved AI preferences in MongoDB are separate from durable conversation history. Do not promise cross-reload AI chat history.
- The AI UI consumes status/answer events; the backend need not emit generated text token by token. Do not fake token-level network streaming or reveal hidden model reasoning.
- `Chat.jsx` also contains a legacy `ai-agent` branch using an EventSource GET path that differs from the primary AI drawer's POST path. Its intended supported status needs clarification before implementation.
- Socket events currently trust client-supplied identity fields; `sendMessage` does not repeat the connection check. REST authentication alone does not authenticate the socket. Spring chat does not currently verify the Node JWT. These are audit findings, not security guarantees or authorization to redesign authentication in this task.
- Human message placement currently compares first names, and sending creates an additional socket. Reliable sender identity, duplicate handling, and socket lifecycle need attention during a later implementation design; do not silently broaden this requirements task into a refactor.

### Reference evidence and limits

Reviewed the supplied screenshots and sampled the approximately 21.7-second local video `3aea67682a1d07c17f917218c55f8925.mp4`, including its opening, input transition, and response state. Screenshot evidence also shows the waveform state.

Observed: a mobile assistant screen with a deep blue/indigo background, purple illumination, a centered luminous orb in the welcome state, a back control, centered assistant title, a circular overflow control, large light text, a prominent circular microphone, a keyboard control, and a camera-shaped control. During input, prompt text is progressively revealed, the large orb gives way to a smaller microphone-centered orb, and purple/blue wave lines span the lower screen. A later screen displays an answer and an image-result card with small actions.

Not established: exact font family, color hex values, spacing measurements, easing/durations, desktop layout, menu contents, microphone gesture semantics, transcription technology, voice language, recorded audio playback UI, and whether the reference's text reveal represents live transcription. The sample image-generation request does not establish DevTinder image-generation requirements.

The surrounding showcase page, creator/social controls, decorative spheres outside the phone, physical phone frame, fake device status bar/home indicator, and video-player controls are presentation framing, not application UI requirements.

## 3. Existing behavior that must remain unchanged

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| P-01 | Preserve login/session behavior, routes, profile/navigation access, and accepted-connection chat intent. | Existing login/logout and `/chat/:targetUserId` navigation work; no JWT format, cookie policy, production URL, or relationship rules change as part of visual styling/dictation. Security gaps listed above remain explicit review items. |
| P-02 | Preserve human text history and live messaging, including avatars and timestamps. | Existing Mongo text conversations load without migration; typed and dictated text appear for both participants and survive recipient/sender reload through the current history API. |
| P-03 | Preserve ordinary typed composition, keyboard submission, suggestions, and AI in-flight send protection. | Both chats remain usable without microphone access; existing AI suggestions still send through the primary AI flow; double activation during an AI request does not submit a second query. |
| P-04 | Preserve AI status events, Markdown/code-copy rendering, errors, and backend behavior. | Existing SSE fixtures render correctly, including immediate greetings, status updates, final text/source payloads, and errors. Dictation does not introduce a separate AI answer pipeline or bypass retrieval and preferences. |
| P-05 | Preserve citations and desktop/mobile resume preview. | Blue inline citations and source buttons still open the chosen resume, on the left of desktop AI chat and in the existing mobile preview flow; users can return to chat and open a PDF in a new tab. |
| P-06 | Preserve resume freshness protection. | Replacement/removal invalidates retired citations and closes affected previews; checks still occur before opening a source and on existing refresh triggers. Failed answers do not acquire misleading citations. |
| P-07 | Preserve configuration and operational controls. | `VITE_AI_CHAT_ENABLED=false` or missing keeps AI entry points unavailable and sends no AI request; human dictation/chat remain usable. Local proxies, deployed URLs, Redis isolation, Gemini rotation/cooldowns/retries, and cleanup behavior are unchanged. |
| P-08 | Preserve current persistence boundaries. | Human history remains database-backed, AI preferences remain server-backed, and a UI redesign does not silently add permanent AI conversation/audio storage. |

## 4. Reference-based UI/UX requirements

These are visual requirements, not invented pixel specifications. Produce desktop/mobile design previews for approval before implementing details not visible in the reference.

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| U-01 | Use the reference's dark navy/indigo foundation, blue-to-purple illumination, and light foreground typography in both chats. | Side-by-side review shows the reference's visual hierarchy and palette family; exact tokens are documented in the later approved design rather than asserted as extracted from the video. |
| U-02 | Replace the purple square sparkle launcher with the selected small circular glowing orb. | The old square/sparkle treatment is absent; the orb opens the AI recruiter, has an accessible name, and does not ask for microphone permission or start capture. |
| U-03 | Use a larger luminous orb and concise invitation in the AI welcome state. | The initial AI view reflects the reference's focal point while keeping existing suggestions available. The orb is decorative, not a substitute for clear controls or service status. |
| U-04 | Adapt the reference's header to each chat identity. | AI chat identifies the recruiter; human chat identifies the conversation partner and remains distinguishable from AI. Back/close returns safely to the existing navigation context. No fictitious online/listening status is shown. |
| U-05 | Provide the prominent circular microphone and an obvious keyboard/text path in both chats. | Users can choose typing or dictation without losing a draft. Text send remains available; existing conversation history and citations remain discoverable. |
| U-06 | Adapt the smaller orb and blue/purple wave treatment to active dictation. | Active capture is visually distinct from idle, processing, and playback. Decorative waves are identified as decorative unless actually driven by audio; elapsed capture/status remain explicit. No animation falsely signals microphone use. |
| U-07 | Present live transcript/draft text prominently, with readable completed conversation text. | Interim text is visibly provisional, final text remains editable, and recognition revisions do not create duplicate text/messages. Existing Markdown, code, and source controls remain legible. |
| U-08 | Preserve usable desktop and mobile layouts instead of reproducing the video's phone frame. | At 360px, 768px, and 1440px viewport widths, controls, conversation, composer, and resume panel remain operable without unintended horizontal overflow. The mobile keyboard does not cover essential controls. |
| U-09 | Avoid adding unsupported reference controls/features. | The camera icon, overflow items, image card, likes/dislikes, regenerate, and download actions are not presented as working features unless separately approved. A decorative/disabled unexplained camera button is not used to imply support. |
| U-10 | Keep conversation review usable during responses and dictation. | New messages are reachable; a user reviewing older messages is not repeatedly forced to the bottom. Long text, code, and source names wrap or scroll within their containers. |

## 5. Voice input, sending, receiving, and playback

The approved voice scope is dictation, not audio-file messaging. No recorded clip should be uploaded, attached to a chat message, or persisted by DevTinder. Human recipients receive the resulting text. AI audio playback means optional read-aloud of an existing text answer.

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| V-01 | Start dictation only after an explicit microphone action and permission outcome. | Opening a chat or pressing Send never starts recording; while listening, a persistent indicator and a labeled Stop control are visible. Only one dictation session can run in the app. |
| V-02 | Integrate speech recognition with an editable draft. | Recognized speech enters the composer without sending. Final results are not duplicated by interim revisions, and the user can correct text with the keyboard. Existing typed content is not silently overwritten. |
| V-03 | Keep review and Send separate from capture completion. | Stop, silence, recognition end, and reaching a future approved duration limit finish capture but never auto-send. Sending while listening first stops recognition and requires a reviewed final draft; late callbacks cannot append into a new conversation or sent message. |
| V-04 | Support cancellation and safe draft recovery. | Cancel discards the current dictation contribution and restores the pre-dictation draft. Closing/navigating away stops capture; the interface must not leave the microphone active after dismissal. Confirmation/draft-retention UX is an open decision below. |
| V-05 | Send human dictation through the existing text-message flow. | After explicit Send, only the reviewed text is submitted through the existing chat transport and persisted as a normal text message. Recipient rendering and history loading require no audio decoder or new audio message type. |
| V-06 | Send AI dictation through the existing text-query flow. | The reviewed transcript becomes the normal `query` for POST `/api/chat/stream`; preferences, fast intents, retrieval, source validation, and error handling behave as for equivalent typed text. Recognition does not call Gemini per interim transcript. |
| V-07 | Keep receiving behavior text-first. | Incoming human messages and AI responses render as text regardless of input method; no waveform is used to imply an attached audio clip. Voice input is not exposed to recipients as stored audio. |
| V-08 | Provide optional read-aloud for completed AI text answers. | A labeled Read aloud control requires user activation; the response remains readable without playback. No audio starts automatically. At most one answer is spoken; Stop works, and starting dictation stops speech playback. Human-message read-aloud is not included by default. |
| V-09 | Make speech output appropriate to existing AI content. | Spoken output excludes Markdown syntax and internal `resume:` identifiers. Resume source links remain clickable text. Long code blocks/URLs and source reading rules require the decisions below; no private profile is fetched merely to speak an already displayed answer. |
| V-10 | Keep browser compatibility explicit. | Supported browsers expose dictation/read-aloud only after capability checks; unsupported browsers show a concise explanation and preserve all text functionality. Do not claim that recording support proves recognition support or that permission guarantees a session will work. |
| V-11 | Distinguish browser speech services from DevTinder media storage. | The product explains that the browser may process speech remotely. No new DevTinder audio-upload route, audio attachment, or audio-storage schema is introduced for this scope. Read-aloud must not add a paid Gemini/TTS call without a separate decision. |

## 6. Loading, permission, network, and error states

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| E-01 | Define dictation states: idle, permission pending, listening, finishing recognition, editable draft, cancelled, and error. | Each state has clear visible and accessible status and appropriate controls. Repeated clicks cannot start parallel captures or leave controls permanently disabled. |
| E-02 | Handle permission denied, dismissed, revoked, insecure context, no input device, device busy, and unsupported recognition. | Each failure explains the next usable action without repeated permission prompts. Typed text survives and the keyboard path remains available. |
| E-03 | Handle silence/no recognized speech, recognition-network failure, unexpected recognition end, and late results. | No empty message is sent. Confirmed transcript text remains reviewable, provisional text is not silently treated as final, and the user can retry explicitly. |
| E-04 | Preserve AI loading and terminal-error behavior. | Status events remain visible; quota exhaustion, persistent 503, server unavailability, and a dropped SSE connection exit the waiting state with an understandable error and no false success/citations. A greeting does not wait for Gemini. |
| E-05 | Separate recognition, text delivery, and answer generation failures. | The UI identifies which stage failed and retains the draft where appropriate. Retrying recognition cannot duplicate a sent text; the app does not silently resubmit an uncertain-delivery message or repeat a paid AI query. |
| E-06 | Handle speech playback errors and missing voices without blocking chat. | Failed or interrupted read-aloud returns to an idle control state, keeps the answer visible, and never traps the user in a speaking animation. Navigation/close stops playback. |
| E-07 | Show honest text-delivery state. | Human messages are not labeled delivered/read without actual server/recipient evidence. Current transport lacks explicit delivery acknowledgement; any acknowledgement or idempotency extension needs a later approved API design. |

## 7. Security, privacy, accessibility, and performance

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| N-01 | Preserve existing authentication boundaries and keep credentials out of voice/UI assets. | No Gemini/storage key enters a `VITE_*` value or browser bundle. Dictated text uses existing authenticated text paths; speech controls do not impersonate another user or bypass the AI feature flag. Existing socket/Spring identity gaps are reviewed explicitly before release, not treated as solved by this document. |
| N-02 | Limit capture to the user's active, visible interaction. | Capture ends on Cancel, navigation, chat close, logout, and component cleanup; media tracks/recognition callbacks and resources owned by the app are released. Backgrounding suspends/stops capture instead of silently continuing. |
| N-03 | Minimize speech data retention. | DevTinder does not log or store raw microphone audio or interim recognition results. Sent transcript text follows existing human-message or AI-processing retention. Do not represent the app as end-to-end encrypted or on-device-only. Browser-provider retention remains an explicit disclosure dependency. |
| N-04 | Treat recognized and received text as untrusted input. | Recognition output passes existing validation and safe text/Markdown rendering; HTML/script spoken or typed into chat cannot execute, and only existing allowed URL schemes can become links. |
| N-05 | Provide keyboard and assistive-technology equivalents. | Microphone, Stop, Cancel, Send, text-mode switch, launcher, read-aloud, close/back, and citations have accessible names, visible focus, and keyboard operation. Modal focus is contained/restored as appropriate; Escape follows existing preview-first close behavior. |
| N-06 | Meet readable contrast and target sizing despite the glow treatment. | Text and controls target WCAG 2.2 AA contrast, standard text remains readable without animation, and primary touch controls have at least a 44-by-44 CSS-pixel hit area. Color/glow is never the sole status indicator. |
| N-07 | Announce useful status without overwhelming screen readers. | Listening, recognition completion, speech errors, and AI completion are announced once per meaningful transition. Interim words and decorative waveform frames are not continuously announced. |
| N-08 | Respect reduced motion and keep animations responsive. | Reduced-motion preference replaces orb/wave animation with a stable indicator. Animations pause when hidden; no animation loop blocks typing, scrolling, source preview, or capture controls. |
| N-09 | Avoid additional AI cost and protect text-path responsiveness. | Starting/stopping dictation, interim updates, orb animation, and read-aloud make no additional Gemini requests. A pure greeting produces its existing immediate answer. Pending AI requests or unavailable speech services do not freeze the rest of the UI. |
| N-10 | Make implementation changes reviewable and compatible. | Existing text/SSE/source regression tests continue to pass; UI previews and permission/error scenarios are reviewed. Any new speech dependency, external processor, permission requirement, or API change is documented and approved before implementation. |

## 8. Open questions, assumptions, and review gates

Confirmed decisions are listed in section 1. These remaining points must not be silently inferred from the reference:

1. **Desktop presentation:** retain the current global AI drawer and full-page human route, or expand either? Proposed default for review: retain both entry points and containers, preserving the desktop left-side resume panel and mobile preview. No new full-screen voice-call mode is assumed.
2. **Speech languages:** English only, English/Hindi, or a user-selected language list? Default language, locale, accent support, and behavior when recognition changes language remain undecided.
3. **Browser matrix and recognition policy:** name supported desktop/mobile browsers and whether unavailable recognition always falls back to typing. Browser recognition was approved, but no specific browser/service, continuous-listening capability, duration limit, or recognition accuracy is guaranteed yet.
4. **Dictation UX:** proposed default is click/tap to start and an explicit Stop button, not press-and-hold. Confirm maximum session duration, how the transcript is inserted at the current cursor, and draft behavior when switching chat, closing the drawer, or reloading. Permission denial must never lose existing text.
5. **Read-aloud defaults:** confirm voice/language, speed controls, whether long answers may be spoken in full, and treatment of code, URLs, and source names. Proposed default: user-triggered browser speech synthesis, normal speed, no new paid TTS provider, no autoplay, and no human-message read-aloud.
6. **Visual sign-off:** approve palette tokens, typography, orb size/glow, spacing, waveform motion, menu treatment, responsive layouts, and how the history/composer coexist with the reference's open voice-focused layout. Exact values and timing were not determined from the reference.
7. **Legacy AI route:** confirm whether `/chat/ai-agent` is a supported entry point. The primary drawer must remain functional; removing or rerouting the legacy path is not authorized by this draft.
8. **Authentication/delivery gaps:** decide the separately approved remediation scope for socket sender authentication, send authorization, sender identification, acknowledgements, and Spring identity checks. Existing shortcomings are not newly promised security behavior, and this requirements-only task changes none of them.

Assumptions for this draft: preserve application branding and existing business behavior; use original orb artwork/CSS/vector treatment rather than extracting unlicensed assets from the showcase; retain existing AI conversation persistence boundaries; do not introduce raw-audio storage, audio chat payloads, third-party transcription integrations, or paid voice generation. Unconfirmed defaults above are proposals for review, not final implementation choices.

### Acceptance review checklist

- Exercise both chat surfaces with typed and dictated text, including mobile keyboard use and two logged-in human participants with persisted history.
- Demonstrate editable transcript, explicit Send, Stop/Cancel, permission denial/revocation, no speech, recognition offline, unsupported browser, and navigation cleanup.
- Demonstrate optional AI read-aloud, stop/interruption, text fallback, and mutual exclusion with microphone capture.
- Verify a fast greeting, a normal AI search, SSE error/503/quota handling, Markdown/code copy, and disabled-AI behavior.
- Open two distinct resume citations, return from mobile preview, and replace/delete a resume to confirm stale-source protection.
- Review responsive states at the stated widths, keyboard/focus/screen-reader behavior, reduced motion, and absence of raw-audio uploads or unintended AI calls.
- Resolve the open questions and approve the visual states before feature implementation begins. This draft does not claim these acceptance checks have already been implemented or passed.

## 9. Out of scope

- Feature implementation, code refactors, dependency installation, commits, Git history changes, or deployment changes in this task.
- Recorded audio-file messages, media upload/storage, audio attachments, or audio playback bubbles for human recipients; “voice messaging” was clarified as editable dictation.
- Always-listening assistants, wake words, live calls, full-duplex/realtime audio, automatic sending on silence, automatic AI speech, or voice cloning.
- Camera capture, general image/file attachments, image generation/editing, feedback/voting, regeneration, or download features merely because the reference depicts them.
- New durable AI conversation history, message receipts, presence/typing indicators, or changes to profile/networking/resume business rules.
- Replacing Socket.IO, changing JWT/cookie formats, redesigning the AI pipeline, changing databases/providers/models/quotas, or performing the earlier monorepo migration.
- Global security remediation without a separately approved scope; the audit findings remain visible release-review considerations.

Only this requirements document is authorized for creation. Stop for review after creating it.
