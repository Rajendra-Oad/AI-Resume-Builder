package com.airesumebuilder.feature.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
import com.fasterxml.jackson.annotation.JsonAlias;

public record LoginRequest(
    @NotBlank(message = "Email is required") @Email(message = "Enter a valid email address") @JsonAlias("email") String identifier,
    @NotBlank(message = "Password is required") String password
) {
}
