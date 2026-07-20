package com.airesumebuilder.integration.ai;

public record AiProviderResponse(String content, String provider, String model, int inputTokens, int outputTokens) { }
