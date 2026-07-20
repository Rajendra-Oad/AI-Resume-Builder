package com.airesumebuilder.feature.ai.service;
import com.airesumebuilder.feature.ai.dto.request.AiGenerationRequest;
import com.airesumebuilder.feature.ai.dto.response.AiJobResponse;
public interface AiJobService { AiJobResponse submit(String email, AiGenerationRequest request); AiJobResponse get(String email, String id); }
