package com.airesumebuilder.integration.ai;

import org.springframework.stereotype.Component;

@Component
public class OpenAiProviderAdapter implements AiProvider {

    @Override
    public String generate(String prompt) {
        return "OpenAI generated response for: " + prompt;
    }
}
