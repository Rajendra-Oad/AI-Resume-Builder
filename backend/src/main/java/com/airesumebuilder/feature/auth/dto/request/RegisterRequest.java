package com.airesumebuilder.feature.auth.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank(message = "First name is required") String firstName,
    @NotBlank(message = "Last name is required") String lastName,
    @NotBlank(message = "Email is required") @Email(message = "Email should be valid") String email,
    @Pattern(regexp = "^$|[+0-9 ()-]{10,20}", message = "Enter a valid phone number") String phone,
    @NotBlank(message = "Password is required") @Size(min = 8, max = 128, message = "Password must be between 8 and 128 characters") String password
) {
}
