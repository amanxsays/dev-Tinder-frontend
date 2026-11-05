package com.amanxsays.devtinder.platform;

import android.content.Context;
import android.util.Base64;
import com.getcapacitor.JSObject;
import java.security.SecureRandom;
import java.util.UUID;
import org.json.JSONArray;

public final class NotificationStore {
    private final SessionStore secure;
    public NotificationStore(Context context) { secure = new SessionStore(context); }
    public JSObject state() throws Exception {
        synchronized (NotificationStore.class) {
            String saved = secure.read("push");
            if (saved != null) return new JSObject(saved);
            byte[] random = new byte[32]; new SecureRandom().nextBytes(random);
            JSObject result = new JSObject();
            result.put("installationId", UUID.randomUUID().toString());
            result.put("installationSecret", Base64.encodeToString(random, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP));
            save(result); return result;
        }
    }
    public void save(JSObject state) throws Exception { synchronized (NotificationStore.class) { secure.write("push", state.toString()); } }
    public void token(String token) throws Exception {
        synchronized (NotificationStore.class) { JSObject state = state(); state.put("token", token); save(state); }
    }
    public void deactivate() throws Exception {
        synchronized (NotificationStore.class) {
            JSObject state = state();
            queueRevocation(state.optString("bindingId", ""));
            state.remove("bindingId"); state.remove("expiresAt"); state.remove("userId");
            save(state); secure.remove("pendingPushTap"); secure.remove("pushSeen");
        }
    }
    public boolean markNew(String eventId) throws Exception {
        synchronized (NotificationStore.class) {
            String saved = secure.read("pushSeen");
            JSONArray previous = saved == null ? new JSONArray() : new JSONArray(saved);
            for (int i = 0; i < previous.length(); i++) if (eventId.equals(previous.getString(i))) return false;
            JSONArray next = new JSONArray();
            for (int i = Math.max(0, previous.length() - 255); i < previous.length(); i++) next.put(previous.getString(i));
            next.put(eventId); secure.write("pushSeen", next.toString()); return true;
        }
    }
    public void queueRevocation(String bindingId) throws Exception {
        if (bindingId == null || bindingId.trim().isEmpty() || bindingId.length() > 200) return;
        synchronized (NotificationStore.class) {
            JSONArray pending = pendingRevocations();
            for (int index = 0; index < pending.length(); index++) if (bindingId.equals(pending.getString(index))) return;
            pending.put(bindingId);
            secure.write("pushRevocations", pending.toString());
        }
    }
    public JSONArray pendingRevocations() throws Exception {
        synchronized (NotificationStore.class) {
            String pending = secure.read("pushRevocations");
            return pending == null ? new JSONArray() : new JSONArray(pending);
        }
    }
    public void completeRevocation(String bindingId) throws Exception {
        synchronized (NotificationStore.class) {
            JSONArray pending = pendingRevocations(), remaining = new JSONArray();
            for (int index = 0; index < pending.length(); index++) {
                if (!pending.getString(index).equals(bindingId)) remaining.put(pending.getString(index));
            }
            secure.write("pushRevocations", remaining.toString());
        }
    }
    public void saveTap(JSObject value) throws Exception { synchronized (NotificationStore.class) { secure.write("pendingPushTap", value.toString()); } }
    public JSObject consumeTap() throws Exception {
        synchronized (NotificationStore.class) {
            String saved = secure.read("pendingPushTap"); secure.remove("pendingPushTap");
            return saved == null ? new JSObject() : new JSObject(saved);
        }
    }
}
