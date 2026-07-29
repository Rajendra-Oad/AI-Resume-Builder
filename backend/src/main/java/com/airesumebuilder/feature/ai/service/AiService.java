package com.airesumebuilder.feature.ai.service;

import com.airesumebuilder.feature.ai.dto.request.AiGenerationRequest;
import com.airesumebuilder.feature.ai.dto.response.AiGenerationResponse;
import com.airesumebuilder.feature.ai.dto.response.AiUsageResponse;

public interface AiService {

    AiGenerationResponse generate(String email, AiGenerationRequest request);

    AiUsageResponse usage(String email);
}
