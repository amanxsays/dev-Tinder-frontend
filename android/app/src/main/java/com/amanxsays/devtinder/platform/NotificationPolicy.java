package com.amanxsays.devtinder.platform;

import java.time.Instant;
import java.util.Map;

/** Pure policy shared by the native service and dependency-free JVM tests. */
public final class NotificationPolicy {
    private NotificationPolicy() {}
    public static boolean accepts(Map<String, String> data, String bindingId, String bindingExpiry, Instant now) {
        try {
            if (bindingId == null || bindingId.trim().isEmpty() || !bindingId.equals(data.get("bindingId"))) return false;
            if (!Instant.parse(bindingExpiry).isAfter(now)) return false;
            String type = data.get("type"), id = data.get("eventId");
            if (id == null || id.trim().isEmpty() || id.length() > 160) return false;
            if (!"message".equals(type) && !"connection_request".equals(type)) return false;
            if ("message".equals(type) && !data.getOrDefault("targetUserId", "").matches("[a-fA-F0-9]{24}")) return false;
            Instant created = Instant.parse(data.get("createdAt")), expiry = Instant.parse(data.get("expiresAt"));
            return expiry.isAfter(now) && expiry.isAfter(created) && !created.isAfter(now.plusSeconds(300))
                && !created.isBefore(now.minusSeconds(86400));
        } catch (Exception error) { return false; }
    }
}
