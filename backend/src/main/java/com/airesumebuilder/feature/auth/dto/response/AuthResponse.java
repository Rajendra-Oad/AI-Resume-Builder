package com.airesumebuilder.feature.auth.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnore;
public record AuthResponse(String accessToken, String userId, String email, String role, @JsonIgnore String refreshToken) {
}
