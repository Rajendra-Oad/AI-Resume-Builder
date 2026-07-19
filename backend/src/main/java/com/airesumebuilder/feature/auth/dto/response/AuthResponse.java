package com.airesumebuilder.feature.auth.dto.response;

public record AuthResponse(String accessToken, String userId, String email) {
}
