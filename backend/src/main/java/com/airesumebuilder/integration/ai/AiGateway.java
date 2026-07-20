package com.airesumebuilder.integration.ai;

import com.airesumebuilder.common.exception.ExternalServiceException;
import com.airesumebuilder.feature.ai.dto.request.AiGenerationRequest;
import com.airesumebuilder.feature.ai.dto.response.AiGenerationResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.ObjectProvider;
import com.airesumebuilder.feature.ai.service.AiUserSettingsService;

/** The only entry point feature services use for model generation. */
@Service
public class AiGateway {
    private static final Logger log = LoggerFactory.getLogger(AiGateway.class);
    private final AiProviderFactory factory; private final AiProviderHealth health; private final AiOutputValidator validator; private final PromptManager promptManager; private final AiRateLimitManager rateLimit; private final RedisAiRateLimitManager redisRateLimit; private final AiBudgetManager budget; private final AiUsageLogger usageLogger; private final AiResponseCache cache; private final AiUserSettingsService userSettings; private final int maxRetries;
    public AiGateway(AiProviderFactory factory, AiProviderHealth health, AiOutputValidator validator, PromptManager promptManager, AiRateLimitManager rateLimit, ObjectProvider<RedisAiRateLimitManager> redisRateLimit, AiBudgetManager budget, AiUsageLogger usageLogger, AiResponseCache cache, AiUserSettingsService userSettings, @Value("${app.ai.retry.max-attempts:2}") int maxRetries) { this.factory = factory; this.health = health; this.validator = validator; this.promptManager = promptManager; this.rateLimit = rateLimit; this.redisRateLimit = redisRateLimit.getIfAvailable(); this.budget = budget; this.usageLogger = usageLogger; this.cache = cache; this.userSettings=userSettings; this.maxRetries = Math.max(1, maxRetries); }
    public AiGenerationResponse generate(Long userId, AiGenerationRequest request) {
        rateLimit.check(userId);
        if (redisRateLimit != null) redisRateLimit.check(userId);
        AiUserSettingsService.Selection selection=userSettings.selection(userId);
        if ("PLATFORM".equals(selection.mode())) budget.check(userId);
        String cacheKey = Integer.toHexString(Objects.hash(userId, selection.mode(), selection.provider(), request.workflow(), request.locale(), request.input()));
        java.util.Optional<String> cached = cache.get(cacheKey);
        if (cached.isPresent()) return new AiGenerationResponse(cached.get(), request.workflow(), "cache", "cached", 0, 0, 0);
        String instruction = promptManager.resolve(request.workflow(), request.locale());
        Instant start = Instant.now(); ExternalServiceException last = null;
        for (int attempt = 1; attempt <= maxRetries; attempt++) try {
            AiProvider primary = factory.resolve(selection.provider());
            AiProviderResponse response;
            String credentialSource = selection.mode();
            AiProviderRequest providerRequest=new AiProviderRequest(instruction, request.input().trim(), null, 1200);
            try { response = "BYOK".equals(selection.mode()) ? primary.generate(providerRequest,selection.apiKey()) : primary.generate(providerRequest); health.success(primary.key()); }
            catch (ExternalServiceException failure) { health.failure(primary.key()); AiProvider fallback = "BYOK".equals(selection.mode()) ? (selection.allowPlatformFallback()?factory.resolve():null) : factory.fallback(primary); if (fallback == null || (fallback == primary && "PLATFORM".equals(selection.mode()))) throw failure; try { response = fallback.generate(providerRequest); credentialSource = "PLATFORM"; health.success(fallback.key()); } catch (ExternalServiceException fallbackFailure) { health.failure(fallback.key()); throw fallbackFailure; } }
            String content = validator.validate(response.content()); long latency = Duration.between(start, Instant.now()).toMillis();
            log.info("AI generation succeeded: workflow={}, provider={}, model={}, inputTokens={}, outputTokens={}, latencyMs={}", request.workflow(), response.provider(), response.model(), response.inputTokens(), response.outputTokens(), latency);
            usageLogger.record(userId, request.workflow(), response, content, latency, credentialSource);
            cache.put(cacheKey, content);
            return new AiGenerationResponse(content, request.workflow(), response.provider(), response.model(), response.inputTokens(), response.outputTokens(), latency);
        } catch (ExternalServiceException exception) { last = exception; }
        throw last == null ? new ExternalServiceException("AI generation failed.") : last;
    }
}
