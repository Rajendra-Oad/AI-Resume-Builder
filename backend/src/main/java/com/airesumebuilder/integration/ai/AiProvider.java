package com.airesumebuilder.integration.ai;

public interface AiProvider {
    String key();
    AiProviderResponse generate(AiProviderRequest request);
    AiProviderResponse generate(AiProviderRequest request, String apiKey);
}
