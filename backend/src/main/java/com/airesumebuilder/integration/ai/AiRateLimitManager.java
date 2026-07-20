package com.airesumebuilder.integration.ai;

import com.airesumebuilder.common.exception.ExternalServiceException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AiRateLimitManager {
    private final int limit; private final ConcurrentHashMap<Long, Window> windows = new ConcurrentHashMap<>();
    public AiRateLimitManager(@Value("${app.ai.rate-limit.per-user-per-hour:20}") int limit) { this.limit = limit; }
    public void check(Long userId) { Window window = windows.compute(userId, (id, old) -> old == null || old.start.plusSeconds(3600).isBefore(Instant.now()) ? new Window(Instant.now(), 1) : new Window(old.start, old.count + 1)); if (window.count > limit) throw new ExternalServiceException("AI generation limit reached. Try again later."); }
    private record Window(Instant start, int count) { }
}
