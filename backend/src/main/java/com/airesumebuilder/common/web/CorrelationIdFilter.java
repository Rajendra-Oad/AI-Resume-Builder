package com.airesumebuilder.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class CorrelationIdFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {
        String correlationId = request.getHeader("X-Correlation-Id");
        if (correlationId == null || correlationId.isBlank()) correlationId = request.getHeader("X-Request-ID");
        if (!valid(correlationId)) correlationId = UUID.randomUUID().toString();
        CorrelationIdContext.set(correlationId);
        MDC.put("correlationId", correlationId);
        response.setHeader("X-Correlation-Id", correlationId);
        try { chain.doFilter(request, response); } finally { MDC.remove("correlationId"); CorrelationIdContext.clear(); }
    }

    private boolean valid(String value) {
        return value != null && value.length() <= 64 && value.matches("[A-Za-z0-9._-]+");
    }
}
