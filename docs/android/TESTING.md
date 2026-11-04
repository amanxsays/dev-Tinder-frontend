# Android notification testing

Use a development Firebase project, isolated users, and a local MongoDB replica set. Do not point automated message/request tests at production databases. Keep the Admin credential outside Git and the frontend. The current emulator APK uses local fixture ports 17777 and 18080; it is not a production release.

## Automated checks

Run `npm test` in the frontend and backend repositories. Run Android JVM and secure-storage instrumentation tests with Java 21 and the installed SDK:

```powershell
cd android
.\gradlew.bat testDebugUnitTest assembleDebugAndroidTest
adb install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell am instrument -w -r -e class com.amanxsays.devtinder.SecureStateTest com.amanxsays.devtinder.debug.test/androidx.test.runner.AndroidJUnitRunner
```

Select the intended test device with `adb -s SERIAL` if several are connected. Secure-state tests intentionally modify the debug application's local fixture session and notification binding. Never run them against an account containing data you need to preserve.

## Opt-in notification navigation check

`NotificationNavigationTest` skips by default. It requires a development build already signed in to an isolated backend, a valid native notification binding, and a posted notification from that backend. The backend must expose the implemented mobile login, registration, chat, and request contracts.

1. Sign in as fixture recipient B and explicitly enable notifications.
2. From accepted connection A, send a text message. Verify its MongoDB save and outbox event before checking the native alert.
3. Run the test below with A's ID. It opens the actual notification PendingIntent and checks the bundled WebView's destination and content after the instrumentation runner restarts the application process.

```powershell
adb shell am instrument -w -r -e class com.amanxsays.devtinder.NotificationNavigationTest -e notificationTag "chat:SENDER_OBJECT_ID" -e expectedPath "/chat/SENDER_OBJECT_ID" -e expectedText "FIXTURE_WORD" com.amanxsays.devtinder.debug.test/androidx.test.runner.AndroidJUnitRunner
```

Repeat with `notificationTag requests`, `expectedPath /requests`, and a distinctive requesting fixture user's name. These are instrumentation-level PendingIntent tests; also manually tap the notification in the system tray on a physical phone.

For the expired-session case, start with an isolated signed-in session and a new posted notification. Add `-e expireSession true`, use `-e expectedPath /login`, and `-e expectedText Login`. This deliberately expires the stored native fixture session before opening the notification. It must show Login rather than protected content. Sign in again and verify access before following the pending destination. Do not use the expiry argument outside disposable test data.

## Physical phone using local services

Enable Developer options and USB debugging, connect the phone, approve the computer, and check `adb devices`. Use a phone with Google Play services. Forward localhost ports through USB:

```powershell
adb reverse tcp:17777 tcp:17777
adb reverse tcp:18080 tcp:18080
$env:VITE_API_URL='http://127.0.0.1:17777'
$env:VITE_STATS_SERVICE_URL='http://127.0.0.1:18080'
npm run android:debug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Run build/install commands from the frontend root with Java 21 and the SDK configured. Supply your own isolated Node and integration test services on those ports; reverse forwarding does not start them. The emulator uses `10.0.2.2` instead. HTTPS staging URLs are another option once compatible services are available. Do not install a local-fixture APK expecting it to reach existing production mobile routes.

## Required device matrix

| Scenario | Required observation |
|---|---|
| Permission denied | Text chat still works; no notification is shown; Settings explains how to enable it |
| Permission enabled | Device registers only against the authenticated account and intended environment |
| Foreground matching conversation | Socket message appears once; matching push alert is suppressed |
| Background / process killed normally | Generic alert may appear; tap rechecks login and conversation access |
| Android force-stop | Do not expect delivery until the user explicitly opens the app again |
| Expired JWT | Generic notification may arrive; protected screen requires login |
| Offline logout | Local binding clears immediately; cleanup remains encrypted and retries after connectivity/startup |
| Account switch | Old binding cannot display an alert or navigate into another account |
| Multiple devices / reinstall | Each installation binds independently; stale registration cleanup cannot disable another binding |
| Token rotation | New token updates the same valid binding; invalid old-token cleanup cannot delete the replacement |
| Battery restrictions / no internet | Record delays and recovery; do not promise instant delivery |
| Microphone | En-IN dictation, Stop/Cancel, editable review, explicit Send, permission denial, and background interruption |
| Read aloud / PDF | No automatic speech, Stop works, backgrounding stops playback, PDFs remain bounded and private |

The desktop/emulator API-block test is a simulated API outage, not a measurement of a physical phone's radio behavior. A five-second no-alert observation is bounded evidence, not a delivery guarantee. Record device/OS/WebView versions and remaining failures in `VALIDATION.md` before release. Remove task-owned USB forwards when finished with `adb reverse --remove tcp:17777` and `adb reverse --remove tcp:18080`.
