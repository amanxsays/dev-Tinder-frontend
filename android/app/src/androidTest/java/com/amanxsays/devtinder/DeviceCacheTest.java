package com.amanxsays.devtinder;
import android.content.Context;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import com.amanxsays.devtinder.platform.DeviceDataPlugin;
import com.amanxsays.devtinder.platform.SessionStore;
import com.amanxsays.devtinder.platform.SessionPlugin;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.time.Instant;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class DeviceCacheTest {
    private static class Call extends PluginCall {
        boolean resolved; String error; JSObject value;
        Call(JSObject data) { super(null, "fixture", "fixture", "fixture", data); }
        @Override public void resolve() { resolved = true; }
        @Override public void resolve(JSObject data) { resolved = true; value = data; }
        @Override public void reject(String message) { error = message; }
        @Override public void reject(String message, String code) { error = message; }
    }
    @Test public void cacheIsEncryptedAccountBoundExpiresAndClearsOnLogout() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        SessionStore store = new SessionStore(context);
        DeviceDataPlugin plugin = new DeviceDataPlugin() { @Override public Context getContext() { return context; } };
        String owner = "111111111111111111111111";
        JSObject session = new JSObject(); session.put("userId", owner); session.put("token", "fixture-token");
        session.put("expiresAt", Instant.now().plusSeconds(600).toString());
        JSObject input = new JSObject(); input.put("userId", owner); input.put("key", "profile"); input.put("value", "{\"data\":{\"name\":\"private-cache-fixture\"}}");
        try {
            store.write("session", session.toString());
            Call save = new Call(input); plugin.writeCache(save); assertTrue(save.resolved);
            String ciphertext = context.getSharedPreferences("devtinder_secure_v1", Context.MODE_PRIVATE).getString("cache:" + owner + ":profile", "");
            assertFalse(ciphertext.contains("private-cache-fixture"));
            Call read = new Call(input); plugin.readCache(read); assertTrue(read.value.getString("value").contains("private-cache-fixture"));
            input.put("userId", "222222222222222222222222"); Call wrong = new Call(input); plugin.readCache(wrong); assertFalse(wrong.resolved); assertNotNull(wrong.error);
            input.put("userId", owner); input.put("key", "../saved-credentials"); Call path = new Call(input); plugin.readCache(path); assertNotNull(path.error);
            input.put("key", "profile"); session.put("expiresAt", Instant.now().minusSeconds(1).toString()); store.write("session", session.toString());
            Call expired = new Call(input); plugin.readCache(expired); assertNotNull(expired.error);
            SessionPlugin auth = new SessionPlugin() { @Override public Context getContext() { return context; } };
            Call clear = new Call(new JSObject()); auth.clear(clear); assertTrue(clear.resolved); assertNull(store.read("cache:" + owner + ":profile"));
        } finally { store.removePrefix("cache:"); store.remove("cache-owner"); store.remove("session"); }
    }
}
