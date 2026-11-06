package com.amanxsays.devtinder.platform;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.time.Instant;

@CapacitorPlugin(name = "DevTinderSession")
public class SessionPlugin extends Plugin {
    private static final long MAX_SESSION_SECONDS = 10L * 24 * 60 * 60;
    @PluginMethod public void read(PluginCall call) {
        try {
            SessionStore store = new SessionStore(getContext());
            String saved = store.read("session");
            if (saved == null) { call.resolve(new JSObject()); return; }
            JSObject session = new JSObject(saved);
            if (!Instant.parse(session.getString("expiresAt")).isAfter(Instant.now())) {
                store.remove("session"); call.resolve(new JSObject()); return;
            }
            call.resolve(session);
        } catch (Exception error) {
            try { new SessionStore(getContext()).remove("session"); } catch (Exception ignored) {}
            call.reject("Your saved session could not be restored. Please sign in again.", "SESSION_READ_FAILED");
        }
    }
    @PluginMethod public void save(PluginCall call) {
        String token = call.getString("token", ""), userId = call.getString("userId", ""), expiry = call.getString("expiresAt", "");
        try {
            Instant expiresAt = Instant.parse(expiry);
            if (token.trim().isEmpty() || token.length() > 8192 || !userId.matches("[a-fA-F0-9]{24}")
                || !expiresAt.isAfter(Instant.now()) || expiresAt.isAfter(Instant.now().plusSeconds(MAX_SESSION_SECONDS + 100))) {
                call.reject("Invalid native session", "INVALID_SESSION"); return;
            }
            JSObject session = new JSObject();
            session.put("token", token); session.put("userId", userId); session.put("expiresAt", expiry);
            synchronized (SessionStore.class) {
                SessionStore store = new SessionStore(getContext());
                String old = store.read("session");
                String previousOwner = old == null ? store.read("cache-owner") : new JSObject(old).getString("userId");
                if (previousOwner != null && !userId.equals(previousOwner)) store.removePrefix("cache:");
                store.write("cache-owner", userId);
                store.write("session", session.toString());
            }
            if (getBridge() != null && getActivity() != null) getActivity().runOnUiThread(() -> {
                // Successful authentication ends the autofill session. The selected
                // password manager decides whether to offer saving credentials.
                try {
                    android.view.autofill.AutofillManager manager = getActivity().getSystemService(android.view.autofill.AutofillManager.class);
                    if (manager != null && manager.isEnabled()) manager.commit();
                } catch (Exception ignored) { /* Autofill is optional. */ }
            });
            call.resolve();
        } catch (Exception error) { call.reject("Could not store the session securely.", "SESSION_SAVE_FAILED"); }
    }
    @PluginMethod public void clear(PluginCall call) {
        try { synchronized (SessionStore.class) { SessionStore store = new SessionStore(getContext()); store.removePrefix("cache:"); store.remove("cache-owner"); store.remove("session"); call.resolve(); } }
        catch (Exception error) { call.reject("Could not clear the saved session.", "SESSION_CLEAR_FAILED"); }
    }
}
