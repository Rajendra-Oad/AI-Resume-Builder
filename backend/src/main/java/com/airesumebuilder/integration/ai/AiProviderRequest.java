package com.airesumebuilder.integration.ai;

public record AiProviderRequest(String systemInstruction, String userContent, String model, int maxOutputTokens) { }
