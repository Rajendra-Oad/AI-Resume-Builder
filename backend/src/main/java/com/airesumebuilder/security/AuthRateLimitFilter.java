package com.airesumebuilder.security;

import com.airesumebuilder.common.dto.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Small in-process protection for credential endpoints. Replace with Redis when scaling instances. */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private static final int MAX_ATTEMPTS = 10;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private final AtomicLong requests = new AtomicLong();
    private final ObjectMapper objectMapper;
    public AuthRateLimitFilter(ObjectMapper objectMapper) { this.objectMapper = objectMapper; }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !("POST".equals(request.getMethod()) && (path.endsWith("/login") || path.endsWith("/forgot-password") || path.endsWith("/register")));
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        Instant now = Instant.now();
        if ((requests.incrementAndGet() & 255) == 0) {
            windows.entrySet().removeIf(entry -> entry.getValue().startedAt.plus(Duration.ofMinutes(1)).isBefore(now));
        }
        String key = request.getRemoteAddr() + ":" + request.getServletPath();
        Window window = windows.compute(key, (ignored, old) -> old == null || old.startedAt.plus(Duration.ofMinutes(1)).isBefore(now) ? new Window(now, 1) : new Window(old.startedAt, old.count + 1));
        if (window.count > MAX_ATTEMPTS) {
            response.setStatus(429); response.setContentType("application/json"); response.setHeader("Retry-After", "60");
            objectMapper.writeValue(response.getOutputStream(), ApiResponse.error("RATE_LIMITED", "Too many attempts. Try again in a minute.")); return;
        }
        chain.doFilter(request, response);
    }
    private record Window(Instant startedAt, int count) { }
}
