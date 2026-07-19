package com.airesumebuilder.feature.ai.service.impl;

import com.airesumebuilder.feature.ai.service.AiService;
import com.airesumebuilder.integration.ai.AiProvider;
import org.springframework.stereotype.Service;

@Service
public class AiServiceImpl implements AiService {

    private final AiProvider aiProvider;

    public AiServiceImpl(AiProvider aiProvider) {
        this.aiProvider = aiProvider;
    }

    @Override
    public String generateContent(String prompt) {
        return aiProvider.generate(prompt);
    }
}
