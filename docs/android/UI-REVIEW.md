# Android UI and preview follow-up - 2026-11-05

## Changes

The supplied phone screenshot showed the brand occupying the status-bar area and oversized vertical gaps around unlabelled auth inputs. The native layout now consumes Capacitor SystemBars CSS insets with an `env()` fallback and adds ordinary spacing after those insets. The Android class/styles are present before the first React frame. The explicit SystemBars CSS mode and cover hint keep modern WebViews aligned with the viewport configuration; older engines can retain Capacitor's native padding without a second CSS inset.

Login/signup now use aligned persistent labels, email/numeric keyboard hints, autofill metadata, a 44px password visibility control, Enter submission and a readable OTP timer. Existing login/signup/OTP handlers, API destinations and account navigation remain in use. Web rendering was checked too.

Android profile editing stacks the form and preview. Request/connection rows accommodate long names and accessible actions. Missing/failed account and card images show initials rather than broken images or remote placeholder photos. Feed and connection failures offer retry; loading and empty states are distinct. No search, messaging, profile or authentication API was changed.

Native PDF dialogs now apply system-bar/cutout insets in density-independent layout spacing. Each preview has a local ID. The shared manager handles cancellation while listener/native initialization is pending and filters old close events, including the React resume wrapper. Back, logout and source replacement cannot let an old callback revive a closed preview or close its replacement. PDF size/host/redirect/header checks and private cache rules remain in place.

No new runtime or testing dependencies were installed. Existing Node/Spring applications, JWT policies, database schemas, live services and production configuration were left unchanged in this pass.

## Verification

- 77 frontend Node tests pass; nine PDF-manager tests cover cancellation, out-of-order callbacks, React-owner closure, errors, URL restrictions and browser fallback.
- Focused ESLint passes for the changed components, bootstrap, PDF manager and tests. The production website build and bundled Android debug build pass. The existing Vite chunk-size warning remains.
- Headless Chrome fixture flows passed at 360, 412, 768 and 1440 widths: safe-area variables, no horizontal overflow, password interaction, Enter login without duplicate requests, logout, signup/OTP, stacked profile, long-name request/connection rows and missing-photo fallback. Simulated feed/connection failures recovered using their retry controls.
- Actual API 36 emulator checks passed for native status-bar geometry, no horizontal overflow, keyboard-driven viewport resizing and focused input visibility. Its older WebView uses Capacitor's native inset padding; injected CSS-inset behavior was separately exercised in browser fixtures. The disconnected phone's newer WebView still needs final confirmation with the updated APK.
- Nine native instrumentation tests passed together: five secure-state/session tests, one absolute status-bar layout test and three PDF preview tests. Generated two-page PDF bytes exercised actual Android rendering, paging, zoom and private-cache cleanup. Oversized responses were refused before body reads, and redirects outside the allowed host were not fetched. These tests use an injected connection only in test code, not real resumes or changed Cloudinary settings.
- The actual native login/registration → persisted Socket.IO message → outbox → real development FCM emulator flow passed after the UI changes. The Android JVM tests and lint passed. APK inspection verifies the signature, manifest identity/permissions, checksum and targeted bundled credential patterns.

## Final device/release boundary

Use [FINAL-PHONE-CHECKLIST.md](FINAL-PHONE-CHECKLIST.md) once the updated APK and matching services are ready. The earlier physical positive-path results are retained in [PHYSICAL-DEVICE.md](PHYSICAL-DEVICE.md); this follow-up does not claim the new UI has already been retested on that phone.

The local APK still targets USB-reversed localhost test services. An untethered public build needs the separately reviewed existing-service rollout, public HTTPS endpoints, matching production Firebase configuration and release signing. No public APK/download site or new production deployment was activated.

References: [Capacitor configuration](https://capacitorjs.com/docs/config), [Android WebView insets](https://developer.android.com/develop/ui/views/layout/webapps/understand-window-insets).
