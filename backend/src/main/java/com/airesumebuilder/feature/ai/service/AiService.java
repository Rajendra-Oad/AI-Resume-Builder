package com.airesumebuilder.feature.ai.service;

import com.airesumebuilder.feature.ai.dto.request.AiGenerationRequest;
import com.airesumebuilder.feature.ai.dto.response.AiGenerationResponse;
public interface AiService { AiGenerationResponse generate(String email, AiGenerationRequest request); }
