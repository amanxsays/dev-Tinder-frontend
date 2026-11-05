package com.amanxsays.devtinder.platform;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import java.lang.ref.WeakReference;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "DevTinderNotifications", permissions = {
    @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public class NotificationsPlugin extends Plugin {
    public static final String TAP_EXTRA = "devtinder_push_tap";
    private static WeakReference<NotificationsPlugin> instance = new WeakReference<>(null);
    private static volatile boolean foreground = false;
    private static volatile String activeTarget = "";

    @Override public void load() {
        instance = new WeakReference<>(this);
        createChannels(getContext());
        captureTap(getContext(), getActivity().getIntent());
    }
    public static void createChannels(Context context) {
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        manager.createNotificationChannel(new NotificationChannel("messages", "Messages", NotificationManager.IMPORTANCE_HIGH));
        manager.createNotificationChannel(new NotificationChannel("connection_requests", "Connection requests", NotificationManager.IMPORTANCE_DEFAULT));
    }
    public static boolean isConversationActive(String target) { return foreground && !activeTarget.trim().isEmpty() && activeTarget.equals(target); }
    private String permission() {
        if (!NotificationManagerCompat.from(getContext()).areNotificationsEnabled()) {
            if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
                return getPermissionState("notifications") == PermissionState.DENIED ? "denied" : "prompt";
            }
            return "denied";
        }
        return "granted";
    }
    @PluginMethod public void getState(PluginCall call) {
        try { JSObject state = new NotificationStore(getContext()).state(); state.put("permission", permission()); call.resolve(state); }
        catch (Exception error) { call.reject("Could not read notification settings.", "PUSH_STATE_FAILED"); }
    }
    @PluginMethod public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationPermissionResult"); return;
        }
        getState(call);
    }
    @PermissionCallback private void notificationPermissionResult(PluginCall call) { getState(call); }
    @PluginMethod public void getToken(PluginCall call) {
        if (!"granted".equals(permission())) { call.reject("Enable notifications first.", "PUSH_PERMISSION_REQUIRED"); return; }
        try {
            if (FirebaseApp.getApps(getContext()).isEmpty() && FirebaseApp.initializeApp(getContext()) == null) {
                call.reject("Firebase is not configured in this build.", "PUSH_NOT_CONFIGURED"); return;
            }
            FirebaseMessaging messaging = FirebaseMessaging.getInstance();
            messaging.setAutoInitEnabled(true);
            messaging.getToken().addOnSuccessListener(token -> {
                try {
                    new NotificationStore(getContext()).token(token);
                    JSObject value = new JSObject(); value.put("token", token); call.resolve(value);
                } catch (Exception error) { call.reject("Could not save this device token.", "PUSH_STORAGE_FAILED"); }
            }).addOnFailureListener(error -> call.reject("Could not register with Firebase. Try again later.", "PUSH_REGISTRATION_FAILED"));
        } catch (Exception error) { call.reject("Push notifications are unavailable in this build.", "PUSH_NOT_CONFIGURED"); }
    }
    @PluginMethod public void activate(PluginCall call) {
        try {
            String binding = call.getString("bindingId", ""), expiry = call.getString("expiresAt", ""), userId = call.getString("userId", "");
            if (binding.trim().isEmpty() || binding.length() > 200 || !Instant.parse(expiry).isAfter(Instant.now()) || !userId.matches("[a-fA-F0-9]{24}")) {
                call.reject("Invalid notification binding", "INVALID_BINDING"); return;
            }
            synchronized (NotificationStore.class) {
                String currentSession = new SessionStore(getContext()).read("session");
                if (currentSession == null || !userId.equals(new JSObject(currentSession).getString("userId"))) {
                    call.reject("Sign in before enabling notifications.", "PUSH_SESSION_REQUIRED"); return;
                }
                NotificationStore store = new NotificationStore(getContext()); JSObject state = store.state();
                if (!binding.equals(state.getString("bindingId"))) {
                    NotificationManagerCompat.from(getContext()).cancelAll();
                    store.deactivate(); state = store.state();
                }
                state.put("bindingId", binding); state.put("expiresAt", expiry); state.put("userId", userId);
                store.save(state);
            }
            call.resolve();
        } catch (Exception error) { call.reject("Could not enable this notification account.", "PUSH_BINDING_FAILED"); }
    }
    @PluginMethod public void deactivate(PluginCall call) {
        try {
            synchronized (NotificationStore.class) {
                new NotificationStore(getContext()).deactivate(); activeTarget = "";
                NotificationManagerCompat.from(getContext()).cancelAll();
            }
            call.resolve();
        } catch (Exception error) { call.reject("Could not clear notification settings.", "PUSH_STORAGE_FAILED"); }
    }
    @PluginMethod public void setContext(PluginCall call) {
        foreground = Boolean.TRUE.equals(call.getBoolean("active", false));
        activeTarget = call.getString("targetUserId", "");
        if (foreground && activeTarget.matches("[a-fA-F0-9]{24}")) NotificationManagerCompat.from(getContext()).cancel("chat:" + activeTarget, 1);
        call.resolve();
    }
    @PluginMethod public void queueRevocation(PluginCall call) {
        try { new NotificationStore(getContext()).queueRevocation(call.getString("bindingId", "")); call.resolve(); }
        catch (Exception error) { call.reject("Could not retain notification cleanup.", "PUSH_STORAGE_FAILED"); }
    }
    @PluginMethod public void pendingRevocations(PluginCall call) {
        try {
            JSObject result = new JSObject(); result.put("bindings", new NotificationStore(getContext()).pendingRevocations());
            call.resolve(result);
        } catch (Exception error) { call.reject("Could not read notification cleanup.", "PUSH_STORAGE_FAILED"); }
    }
    @PluginMethod public void completeRevocation(PluginCall call) {
        try { new NotificationStore(getContext()).completeRevocation(call.getString("bindingId", "")); call.resolve(); }
        catch (Exception error) { call.reject("Could not finish notification cleanup.", "PUSH_STORAGE_FAILED"); }
    }
    @PluginMethod public void consumePendingTap(PluginCall call) {
        try { call.resolve(new NotificationStore(getContext()).consumeTap()); }
        catch (Exception error) { call.reject("Could not open the notification.", "PUSH_TAP_FAILED"); }
    }
    public static void tokenChanged(String token) {
        NotificationsPlugin plugin = instance.get();
        if (plugin != null) { JSObject value = new JSObject(); value.put("token", token); plugin.notifyListeners("tokenChanged", value); }
    }
    public static void captureTap(Context context, Intent intent) {
        if (intent == null || !intent.hasExtra(TAP_EXTRA)) return;
        String raw = intent.getStringExtra(TAP_EXTRA); intent.removeExtra(TAP_EXTRA);
        try {
            if (raw == null || raw.length() > 4096) return;
            JSObject payload = new JSObject(raw); Map<String, String> data = new HashMap<>();
            payload.keys().forEachRemaining(key -> data.put(key, payload.optString(key, "")));
            synchronized (NotificationStore.class) {
                NotificationStore store = new NotificationStore(context); JSObject state = store.state();
                if (!NotificationPolicy.accepts(data, state.getString("bindingId"), state.getString("expiresAt"), Instant.now())) return;
                store.saveTap(payload);
                NotificationsPlugin plugin = instance.get();
                if (plugin != null) plugin.notifyListeners("notificationTap", payload);
            }
        } catch (Exception ignored) { /* An invalid/stale tap must never navigate or disclose account data. */ }
    }
    @Override protected void handleOnNewIntent(Intent intent) { captureTap(getContext(), intent); }
    @Override protected void handleOnPause() { foreground = false; }
    @Override protected void handleOnResume() { foreground = true; }
    @Override protected void handleOnDestroy() { foreground = false; activeTarget = ""; instance.clear(); }
}
