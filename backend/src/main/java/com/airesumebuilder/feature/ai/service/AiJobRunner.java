package com.airesumebuilder.feature.ai.service;
import com.airesumebuilder.feature.ai.dto.request.AiGenerationRequest;
public interface AiJobRunner { void run(String id, String email, AiGenerationRequest request); }
