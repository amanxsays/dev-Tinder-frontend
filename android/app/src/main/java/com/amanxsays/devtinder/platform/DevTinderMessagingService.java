package com.amanxsays.devtinder.platform;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.amanxsays.devtinder.MainActivity;
import com.amanxsays.devtinder.R;
import com.getcapacitor.JSObject;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.time.Instant;
import java.util.Map;

public class DevTinderMessagingService extends FirebaseMessagingService {
    @Override public void onNewToken(String token) {
        try { new NotificationStore(this).token(token); NotificationsPlugin.tokenChanged(token); }
        catch (Exception ignored) { /* App will retry registration when explicitly opened. */ }
    }
    @Override public void onMessageReceived(RemoteMessage message) {
        try {
            NotificationStore store = new NotificationStore(this); JSObject state = store.state();
            Map<String, String> data = message.getData();
            if (!NotificationPolicy.accepts(data, state.getString("bindingId"), state.getString("expiresAt"), Instant.now())) return;
            if (!store.markNew(data.get("eventId"))) return;
            boolean chat = "message".equals(data.get("type"));
            if (chat && NotificationsPlugin.isConversationActive(data.get("targetUserId"))) return;
            if (android.os.Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
            NotificationManagerCompat manager = NotificationManagerCompat.from(this);
            if (!manager.areNotificationsEnabled()) return;
            NotificationsPlugin.createChannels(this);
            JSObject payload = new JSObject();
            for (String key : new String[] {"eventId", "type", "bindingId", "targetUserId", "createdAt", "expiresAt"}) {
                if (data.containsKey(key)) payload.put(key, data.get(key));
            }
            Intent open = new Intent(this, MainActivity.class)
                .setData(new android.net.Uri.Builder().scheme("devtinder-notification")
                    .authority("event").appendPath(data.get("eventId")).build())
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .putExtra(NotificationsPlugin.TAP_EXTRA, payload.toString());
            PendingIntent tap = PendingIntent.getActivity(this, data.get("eventId").hashCode(), open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            String sender = data.getOrDefault("senderName", "").trim();
            String preview = data.getOrDefault("messagePreview", "").trim();
            if (sender.length() > 80) sender = sender.substring(0, 80);
            if (preview.length() > 240) preview = preview.substring(0, 240);
            String summary = chat ? "New message" : "New connection request";
            android.app.Notification publicVersion = new NotificationCompat.Builder(this, chat ? "messages" : "connection_requests")
                .setSmallIcon(R.drawable.ic_stat_devtinder).setContentTitle("DevTinder").setContentText(summary).build();
            NotificationCompat.Builder notification = new NotificationCompat.Builder(this, chat ? "messages" : "connection_requests")
                .setSmallIcon(R.drawable.ic_stat_devtinder).setContentTitle(chat && !sender.isEmpty() ? sender : "DevTinder")
                .setContentText(chat && !preview.isEmpty() ? preview : summary)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(chat && !preview.isEmpty() ? preview : summary))
                .setPublicVersion(publicVersion)
                .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setAutoCancel(true)
                .setPriority(chat ? NotificationCompat.PRIORITY_HIGH : NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(tap).setCategory(chat ? NotificationCompat.CATEGORY_MESSAGE : NotificationCompat.CATEGORY_SOCIAL);
            // Serialize the final check/post with logout's binding removal and cancelAll.
            synchronized (NotificationStore.class) {
                JSObject latest = store.state();
                if (!NotificationPolicy.accepts(data, latest.getString("bindingId"), latest.getString("expiresAt"), Instant.now())) return;
                manager.notify(chat ? "chat:" + data.get("targetUserId") : "requests", 1, notification.build());
            }
        } catch (Exception ignored) { /* Fail closed if secure state cannot be read. Never log tokens or payloads. */ }
    }
}
