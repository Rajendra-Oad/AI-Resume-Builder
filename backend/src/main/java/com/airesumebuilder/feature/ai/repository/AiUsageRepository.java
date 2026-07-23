package com.airesumebuilder.feature.ai.repository;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class AiUsageRepository {
    private final JdbcTemplate jdbc;

    public AiUsageRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Long providerId(String providerKey) {
        return jdbc.queryForObject("SELECT id FROM ai_providers WHERE provider_key=?", Long.class, providerKey);
    }

    public long createSuccessfulRequest(Long userId, Long providerId, String credentialSource, String workflow, Instant now) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO ai_requests (user_id,provider_id,credential_source,request_type,status,prompt_reference,created_at,completed_at) VALUES (?,?,?,?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS
            );
            statement.setLong(1, userId);
            statement.setLong(2, providerId);
            statement.setString(3, credentialSource);
            statement.setString(4, workflow);
            statement.setString(5, "SUCCEEDED");
            statement.setString(6, workflow + ":v1");
            statement.setObject(7, now);
            statement.setObject(8, now);
            return statement;
        }, keys);
        Number key = keys.getKey();
        if (key == null) throw new IllegalStateException("AI request insert did not return an identifier.");
        return key.longValue();
    }

    public void addGeneratedContent(long requestId, String content, Instant now) {
        jdbc.update("INSERT INTO ai_generated_contents (ai_request_id,content,applied_to_resume,created_at) VALUES (?,?,false,?)", requestId, content, now);
    }

    public void addSuccessfulAttempt(long requestId, long latencyMs, Instant now) {
        jdbc.update("INSERT INTO ai_request_attempts (ai_request_id,attempt_number,latency_ms,created_at) VALUES (?,1,?,?)", requestId, latencyMs, now);
    }

    public void addUsage(Long userId, Long providerId, long requestId, int inputTokens, int outputTokens, BigDecimal cost, Instant now) {
        jdbc.update(
            "INSERT INTO ai_usage_ledger (user_id,provider_id,ai_request_id,input_tokens,output_tokens,cost_estimate,created_at) VALUES (?,?,?,?,?,?,?)",
            userId, providerId, requestId, inputTokens, outputTokens, cost, now
        );
    }

    public BigDecimal spentThisMonth(Long userId) {
        BigDecimal spent = jdbc.queryForObject(
            "SELECT COALESCE(SUM(cost_estimate),0) FROM ai_usage_ledger WHERE user_id=? AND created_at >= DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-01')",
            BigDecimal.class,
            userId
        );
        return spent == null ? BigDecimal.ZERO : spent;
    }
}
