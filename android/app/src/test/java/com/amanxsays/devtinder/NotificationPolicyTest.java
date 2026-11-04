package com.amanxsays.devtinder;

import com.amanxsays.devtinder.platform.NotificationPolicy;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.junit.Test;
import static org.junit.Assert.*;

public class NotificationPolicyTest {
    private final Instant now = Instant.parse("2026-11-05T12:00:00Z");
    private Map<String, String> event() {
        Map<String,String> data = new HashMap<>();
        data.put("eventId", "message:1"); data.put("type", "message"); data.put("bindingId", "binding-a");
        data.put("targetUserId", "68847cafa68d283cb2be86db"); data.put("createdAt", now.minusSeconds(10).toString());
        data.put("expiresAt", now.plusSeconds(100).toString()); return data;
    }
    @Test public void acceptsCurrentBinding() { assertTrue(NotificationPolicy.accepts(event(), "binding-a", now.plusSeconds(1000).toString(), now)); }
    @Test public void rejectsOldAccountOrLoggedOut() {
        assertFalse(NotificationPolicy.accepts(event(), "binding-b", now.plusSeconds(1000).toString(), now));
        assertFalse(NotificationPolicy.accepts(event(), null, null, now));
    }
    @Test public void rejectsExpiredEventAndSubscription() {
        Map<String,String> data = event(); data.put("expiresAt", now.minusSeconds(1).toString());
        assertFalse(NotificationPolicy.accepts(data, "binding-a", now.plusSeconds(1000).toString(), now));
        assertFalse(NotificationPolicy.accepts(event(), "binding-a", now.minusSeconds(1).toString(), now));
    }
    @Test public void rejectsArbitraryRoutesAndInvalidTypes() {
        Map<String,String> data = event(); data.put("targetUserId", "https://attacker.example");
        assertFalse(NotificationPolicy.accepts(data, "binding-a", now.plusSeconds(1000).toString(), now));
        data = event(); data.put("type", "unknown");
        assertFalse(NotificationPolicy.accepts(data, "binding-a", now.plusSeconds(1000).toString(), now));
    }
    @Test public void acceptsRequestWithoutChatId() {
        Map<String,String> data = event(); data.put("type", "connection_request"); data.remove("targetUserId");
        assertTrue(NotificationPolicy.accepts(data, "binding-a", now.plusSeconds(1000).toString(), now));
    }
    @Test public void rejectsStaleOrMalformedDates() {
        Map<String,String> data = event(); data.put("createdAt", now.minusSeconds(86401).toString());
        assertFalse(NotificationPolicy.accepts(data, "binding-a", now.plusSeconds(1000).toString(), now));
        data.put("createdAt", "invalid"); assertFalse(NotificationPolicy.accepts(data, "binding-a", now.plusSeconds(1000).toString(), now));
    }
}
