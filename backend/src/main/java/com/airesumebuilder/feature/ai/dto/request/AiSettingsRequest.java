package com.airesumebuilder.feature.ai.dto.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
public record AiSettingsRequest(
    @NotBlank @Pattern(regexp="PLATFORM|BYOK") String mode,
    @NotBlank @Pattern(regexp="gemini|openai") String preferredProvider,
    boolean allowPlatformFallback
) {}
