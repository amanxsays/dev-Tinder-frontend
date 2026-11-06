package com.amanxsays.devtinder.platform;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.time.Instant;

@CapacitorPlugin(name = "DevTinderDeviceData")
public class DeviceDataPlugin extends Plugin {
    private boolean unlocking;
    private String sessionOwner(SessionStore store) throws Exception {
        String raw = store.read("session");
        if (raw == null) throw new IllegalStateException("Sign in required");
        JSObject session = new JSObject(raw);
        if (!Instant.parse(session.getString("expiresAt")).isAfter(Instant.now())) throw new IllegalStateException("Session expired");
        return session.getString("userId");
    }
    private String cacheName(PluginCall call, SessionStore store) throws Exception {
        String owner = sessionOwner(store);
        if (!owner.equals(call.getString("userId", ""))) throw new IllegalStateException("Wrong account");
        String key = call.getString("key", "");
        if (!key.matches("profile|connections|chat:[a-fA-F0-9]{24}")) throw new IllegalStateException("Invalid cache key");
        return "cache:" + owner + ":" + key;
    }
    @PluginMethod public void readCache(PluginCall call) {
        try { synchronized (SessionStore.class) { SessionStore store = new SessionStore(getContext()); String raw = store.read(cacheName(call, store));
            JSObject result = new JSObject(); result.put("value", raw); call.resolve(result); }
        } catch (Exception error) { call.reject("Cached data unavailable"); }
    }
    @PluginMethod public void writeCache(PluginCall call) {
        try { synchronized (SessionStore.class) { SessionStore store = new SessionStore(getContext()); String name = cacheName(call, store);
            String value = call.getString("value", "");
            if (value.length() > 512000) throw new IllegalStateException("Cache too large");
            new JSObject(value); store.trimCache(name); store.write(name, value); call.resolve(); }
        } catch (Exception error) { call.reject("Could not cache data"); }
    }
    @PluginMethod public void savedAccount(PluginCall call) {
        try { String value = new SessionStore(getContext()).read("saved-credentials"); JSObject result = new JSObject();
            if (value != null) result.put("email", new JSObject(value).getString("email")); call.resolve(result);
        } catch (Exception error) { call.resolve(new JSObject()); }
    }
    @PluginMethod public void saveCredentials(PluginCall call) {
        try {
            KeyguardManager lock = getContext().getSystemService(KeyguardManager.class);
            if (lock == null || !lock.isDeviceSecure()) { call.reject("Set a screen lock to save your account securely."); return; }
            SessionStore store = new SessionStore(getContext()); sessionOwner(store);
            String email = call.getString("email", "").trim(), password = call.getString("password", "");
            if (email.length() > 254 || !email.contains("@") || password.isEmpty() || password.length() > 1000) throw new IllegalStateException();
            JSObject data = new JSObject(); data.put("email", email); data.put("password", password);
            store.write("saved-credentials", data.toString()); call.resolve();
        } catch (Exception error) { call.reject("Could not save your account securely."); }
    }
    @PluginMethod public void forgetCredentials(PluginCall call) {
        try { new SessionStore(getContext()).remove("saved-credentials"); call.resolve(); }
        catch (Exception error) { call.reject("Could not remove saved account."); }
    }
    @SuppressWarnings("deprecation")
    @PluginMethod public void unlockCredentials(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (unlocking) { call.reject("Unlock already in progress"); return; }
            KeyguardManager lock = getContext().getSystemService(KeyguardManager.class);
            Intent confirm = lock == null ? null : lock.createConfirmDeviceCredentialIntent("Use saved DevTinder account", "Confirm your phone screen lock to continue");
            if (confirm == null) { call.reject("A phone screen lock is required."); return; }
            unlocking = true;
            try { startActivityForResult(call, confirm, "credentialsUnlocked"); }
            catch (Exception error) { unlocking = false; call.reject("Could not open phone unlock."); }
        });
    }
    @ActivityCallback private void credentialsUnlocked(PluginCall call, ActivityResult result) {
        unlocking = false; if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK) { call.reject("Unlock cancelled"); return; }
        try { String value = new SessionStore(getContext()).read("saved-credentials");
            if (value == null) throw new IllegalStateException(); call.resolve(new JSObject(value));
        } catch (Exception error) { call.reject("Saved account unavailable. Please sign in."); }
    }
}
