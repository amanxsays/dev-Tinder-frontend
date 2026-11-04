package com.amanxsays.devtinder.platform;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.time.Instant;

@CapacitorPlugin(name = "DevTinderSession")
public class SessionPlugin extends Plugin {
    @PluginMethod public void read(PluginCall call) {
        try {
            SessionStore store = new SessionStore(getContext());
            String saved = store.read("session");
            if (saved == null) { call.resolve(new JSObject()); return; }
            JSObject session = new JSObject(saved);
            if (Instant.parse(session.getString("expiresAt")).isBefore(Instant.now())) {
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
                || !expiresAt.isAfter(Instant.now()) || expiresAt.isAfter(Instant.now().plusSeconds(86500))) {
                call.reject("Invalid native session", "INVALID_SESSION"); return;
            }
            JSObject session = new JSObject();
            session.put("token", token); session.put("userId", userId); session.put("expiresAt", expiry);
            new SessionStore(getContext()).write("session", session.toString());
            call.resolve();
        } catch (Exception error) { call.reject("Could not store the session securely.", "SESSION_SAVE_FAILED"); }
    }
    @PluginMethod public void clear(PluginCall call) {
        try { new SessionStore(getContext()).remove("session"); call.resolve(); }
        catch (Exception error) { call.reject("Could not clear the saved session.", "SESSION_CLEAR_FAILED"); }
    }
}
