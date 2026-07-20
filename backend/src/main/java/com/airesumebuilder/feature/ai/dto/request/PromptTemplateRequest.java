package com.airesumebuilder.feature.ai.dto.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record PromptTemplateRequest(@NotBlank @Size(max=80) String workflow, @NotBlank @Size(max=20) String locale, @NotBlank @Size(max=80) String category, @NotBlank @Size(max=20000) String systemInstruction) { }
