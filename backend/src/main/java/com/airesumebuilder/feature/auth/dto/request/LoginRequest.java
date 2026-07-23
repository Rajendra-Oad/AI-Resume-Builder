package com.airesumebuilder.feature.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import com.fasterxml.jackson.annotation.JsonAlias;

public record LoginRequest(
    @NotBlank(message = "Email or phone is required") @JsonAlias("email") String identifier,
    @NotBlank(message = "Password is required") String password
) {
}
