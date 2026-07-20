package com.airesumebuilder.integration.ai;

import com.airesumebuilder.common.exception.ExternalServiceException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AiProviderFactory {
    private final Map<String, AiProvider> providers; private final AiProviderHealth health;
    private final String defaultProvider;
    public AiProviderFactory(Map<String, AiProvider> providers, AiProviderHealth health, @Value("${app.ai.provider:gemini}") String defaultProvider) { this.providers = providers; this.health=health; this.defaultProvider = defaultProvider.toLowerCase(); }
    public AiProvider resolve() { AiProvider provider = providers.get(defaultProvider); if (provider == null || !health.available(defaultProvider)) return fallback(provider); return provider; }
    public AiProvider resolve(String providerKey) { AiProvider provider = providers.get(providerKey); if (provider == null) throw new com.airesumebuilder.common.exception.ValidationException("Unsupported AI provider."); return provider; }
    public AiProvider fallback(AiProvider failed) { return providers.values().stream().filter(provider -> failed == null || (!provider.key().equals(failed.key()) && health.available(provider.key()))).findFirst().orElse(failed); }
    public java.util.Collection<AiProvider> all() { return providers.values(); }
}
