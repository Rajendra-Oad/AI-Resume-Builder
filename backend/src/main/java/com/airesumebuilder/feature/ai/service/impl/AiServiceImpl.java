package com.airesumebuilder.feature.ai.service.impl;

import com.airesumebuilder.feature.ai.service.AiService;
import com.airesumebuilder.integration.ai.AiGateway;
import com.airesumebuilder.feature.ai.dto.request.AiGenerationRequest;
import com.airesumebuilder.feature.ai.dto.response.AiGenerationResponse;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class AiServiceImpl implements AiService {

    private final AiGateway aiGateway;
    private final UserRepository userRepository;

    public AiServiceImpl(AiGateway aiGateway, UserRepository userRepository) {
        this.aiGateway = aiGateway; this.userRepository = userRepository;
    }

    @Override
    public AiGenerationResponse generate(String email, AiGenerationRequest request) {
        return aiGateway.generate(userRepository.findByEmail(email).orElseThrow().getId(), request);
    }
}
