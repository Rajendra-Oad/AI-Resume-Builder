package com.airesumebuilder.feature.ai.dto.response;
import java.util.List;
public record AiSettingsResponse(String mode, String preferredProvider, boolean allowPlatformFallback, List<ProviderCredentialStatus> credentials) {
    public record ProviderCredentialStatus(String provider, boolean configured, String keyHint) {}
}
