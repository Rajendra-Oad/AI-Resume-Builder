package com.airesumebuilder.integration.ai;

import com.airesumebuilder.feature.ai.repository.AiUsageRepository;
import com.airesumebuilder.feature.analytics.service.UsageMetricService;
import java.time.Instant;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AiUsageLogger {
    private final AiUsageRepository usage; private final AiCostCalculator costs; private final UsageMetricService metrics;
    public AiUsageLogger(AiUsageRepository usage, AiCostCalculator costs, UsageMetricService metrics) { this.usage = usage; this.costs=costs; this.metrics=metrics; }
    @Transactional
    public void record(Long userId, String workflow, AiProviderResponse response, String content, long latencyMs, String credentialSource) {
        Instant now = Instant.now();
        Long providerId = usage.providerId(response.provider());
        long requestId = usage.createSuccessfulRequest(userId, providerId, credentialSource, workflow, now);
        usage.addGeneratedContent(requestId, content, now);
        usage.addSuccessfulAttempt(requestId, latencyMs, now);
        usage.addUsage(userId, providerId, requestId, response.inputTokens(), response.outputTokens(), "BYOK".equals(credentialSource) ? java.math.BigDecimal.ZERO : costs.calculate(response), now);
        metrics.increment(UsageMetricService.AI_REQUEST);
    }
}
