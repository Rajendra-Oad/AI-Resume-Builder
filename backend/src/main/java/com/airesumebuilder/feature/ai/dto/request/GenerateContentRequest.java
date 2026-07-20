package com.airesumebuilder.feature.ai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GenerateContentRequest(
    @NotBlank(message = "Prompt is required") @Size(max = 4000, message = "Prompt must not exceed 4000 characters") String prompt
) { }
