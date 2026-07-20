package com.airesumebuilder.feature.ai.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiGenerationRequest(
    @NotBlank @Size(max = 80) String workflow,
    @NotBlank @Size(max = 12000) String input,
    @Size(max = 20) String locale
) { }
