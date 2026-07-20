package com.airesumebuilder.feature.ai.dto.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record ProviderCredentialRequest(@NotBlank @Size(min=16,max=1000) String apiKey) {}
