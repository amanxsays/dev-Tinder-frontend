package com.amanxsays.devtinder;

import android.content.Context;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import com.amanxsays.devtinder.platform.NotificationStore;
import com.amanxsays.devtinder.platform.SessionStore;
import com.getcapacitor.JSObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class SecureStateTest {
    @Test public void sessionCiphertextDoesNotContainTokenAndClearPreservesInstallation() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        SessionStore secure = new SessionStore(context); NotificationStore push = new NotificationStore(context);
        String installation = push.state().getString("installationId");
        secure.write("session", "secret-token-fixture");
        String ciphertext = context.getSharedPreferences("devtinder_secure_v1", Context.MODE_PRIVATE).getString("session", "");
        assertFalse(ciphertext.contains("secret-token-fixture")); assertEquals("secret-token-fixture", secure.read("session"));
        secure.remove("session"); assertNull(secure.read("session"));
        assertEquals(installation, push.state().getString("installationId"));
    }
    @Test public void deactivationClearsBindingAndPendingTapButNotCapability() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        NotificationStore push = new NotificationStore(context); JSObject before = push.state();
        String secret = before.getString("installationSecret");
        before.put("bindingId", "test-binding"); before.put("userId", "test-user"); push.save(before);
        JSObject tap = new JSObject(); tap.put("eventId", "test"); push.saveTap(tap);
        push.deactivate(); JSObject after = push.state();
        assertNull(after.getString("bindingId")); assertNull(after.getString("userId"));
        assertEquals(secret, after.getString("installationSecret")); assertEquals(0, push.consumeTap().length());
        assertTrue(push.pendingRevocations().toString().contains("test-binding"));
        push.completeRevocation("test-binding");
        assertFalse(push.pendingRevocations().toString().contains("test-binding"));
    }
    @Test public void repeatedPushEventsAreDeduplicated() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        NotificationStore push = new NotificationStore(context); push.deactivate();
        assertTrue(push.markNew("fixture-event")); assertFalse(push.markNew("fixture-event")); push.deactivate();
    }
}
