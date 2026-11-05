package com.amanxsays.devtinder;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.service.notification.StatusBarNotification;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.runner.lifecycle.ActivityLifecycleMonitorRegistry;
import androidx.test.runner.lifecycle.Stage;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.time.Instant;
import com.getcapacitor.JSObject;
import com.amanxsays.devtinder.platform.SessionStore;
import org.json.JSONObject;
import org.junit.Assume;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** Opt-in emulator test: requires an isolated backend, signed-in fixture and posted notification. */
@RunWith(AndroidJUnit4.class)
public class NotificationNavigationTest {
    @Test public void postedNotificationOpensAuthenticatedDestination() throws Exception {
        String tag = InstrumentationRegistry.getArguments().getString("notificationTag", "");
        String expectedPath = InstrumentationRegistry.getArguments().getString("expectedPath", "");
        String expectedText = InstrumentationRegistry.getArguments().getString("expectedText", "");
        Assume.assumeTrue("Opt-in fixture test; supply notificationTag and expectedPath", !tag.isEmpty() && !expectedPath.isEmpty());
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        if ("true".equals(InstrumentationRegistry.getArguments().getString("expireSession"))) {
            SessionStore secure = new SessionStore(context);
            String saved = secure.read("session");
            assertNotNull("Expiry scenario requires an isolated signed-in fixture", saved);
            JSObject expired = new JSObject(saved);
            expired.put("expiresAt", Instant.now().minusSeconds(60).toString());
            secure.write("session", expired.toString());
        }
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        StatusBarNotification selected = null;
        for (StatusBarNotification item : manager.getActiveNotifications()) {
            if (tag.equals(item.getTag())) { selected = item; break; }
        }
        assertNotNull("Expected a posted test notification", selected);
        assertNotNull(selected.getNotification().contentIntent);
        // Exercise the actual PendingIntent created by DevTinderMessagingService.
        // Starting instrumentation restarts the target process, testing cold-start restoration too.
        selected.getNotification().contentIntent.send();
        long deadline = System.currentTimeMillis() + 45000;
        while (System.currentTimeMillis() < deadline) {
            AtomicReference<String> result = new AtomicReference<>();
            CountDownLatch evaluated = new CountDownLatch(1);
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
                for (Activity activity : ActivityLifecycleMonitorRegistry.getInstance().getActivitiesInStage(Stage.RESUMED)) {
                    if (activity instanceof MainActivity) {
                        MainActivity main = (MainActivity) activity;
                        if (main.getBridge() != null && main.getBridge().getWebView() != null) {
                            String script = "location.pathname === " + JSONObject.quote(expectedPath) +
                                " && document.body.innerText.includes(" + JSONObject.quote(expectedText) + ")";
                            main.getBridge().getWebView().evaluateJavascript(script, value -> { result.set(value); evaluated.countDown(); });
                            return;
                        }
                    }
                }
                evaluated.countDown();
            });
            evaluated.await(2, TimeUnit.SECONDS);
            if ("true".equals(result.get())) return;
            Thread.sleep(250);
        }
        fail("Notification did not reach the expected authenticated fixture screen");
    }
}
