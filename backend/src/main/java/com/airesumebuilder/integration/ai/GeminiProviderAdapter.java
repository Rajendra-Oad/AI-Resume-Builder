package com.airesumebuilder.integration.ai;

import org.springframework.stereotype.Component;

@Component
public class GeminiProviderAdapter implements AiProvider {

    @Override
    public String generate(String prompt) {
        return "Gemini generated response for: " + prompt;
    }
}
