package com.airesumebuilder.integration.ai;

import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class AiUsageLogger {
    private final JdbcTemplate jdbc; private final AiCostCalculator costs;
    public AiUsageLogger(JdbcTemplate jdbc, AiCostCalculator costs) { this.jdbc = jdbc; this.costs=costs; }
    public void record(Long userId, String workflow, AiProviderResponse response, String content, long latencyMs, String credentialSource) {
        Long providerId = jdbc.queryForObject("SELECT id FROM ai_providers WHERE provider_key=?", Long.class, response.provider());
        jdbc.update("INSERT INTO ai_requests (user_id,provider_id,credential_source,request_type,status,prompt_reference,created_at,completed_at) VALUES (?,?,?,?,?,?,?,?)", userId, providerId, credentialSource, workflow, "SUCCEEDED", workflow + ":v1", Instant.now(), Instant.now());
        Long requestId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update("INSERT INTO ai_generated_contents (ai_request_id,content,applied_to_resume,created_at) VALUES (?,?,false,?)", requestId, content, Instant.now());
        jdbc.update("INSERT INTO ai_request_attempts (ai_request_id,attempt_number,latency_ms,created_at) VALUES (?,?,?,?)", requestId, 1, latencyMs, Instant.now());
        jdbc.update("INSERT INTO ai_usage_ledger (user_id,provider_id,ai_request_id,input_tokens,output_tokens,cost_estimate,created_at) VALUES (?,?,?,?,?,?,?)", userId, providerId, requestId, response.inputTokens(), response.outputTokens(), "BYOK".equals(credentialSource) ? java.math.BigDecimal.ZERO : costs.calculate(response), Instant.now());
    }
}
