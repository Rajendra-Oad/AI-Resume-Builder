package com.airesumebuilder.integration.ai;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AiResponseCache {
    private final ConcurrentHashMap<String, Entry> entries = new ConcurrentHashMap<>();
    private final long ttlSeconds;
    public AiResponseCache(@Value("${app.ai.cache.ttl-seconds:900}") long ttlSeconds) { this.ttlSeconds = ttlSeconds; }
    public Optional<String> get(String key) { Entry entry = entries.get(key); if (entry == null || entry.expiresAt().isBefore(Instant.now())) { entries.remove(key); return Optional.empty(); } return Optional.of(entry.content()); }
    public void put(String key, String content) { entries.put(key, new Entry(content, Instant.now().plusSeconds(ttlSeconds))); }
    private record Entry(String content, Instant expiresAt) { }
}
