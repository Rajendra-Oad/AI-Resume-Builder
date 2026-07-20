package com.airesumebuilder.feature.ai.dto.response;

public record AiGenerationResponse(String content, String workflow, String provider, String model, int inputTokens, int outputTokens, long latencyMs) { }
