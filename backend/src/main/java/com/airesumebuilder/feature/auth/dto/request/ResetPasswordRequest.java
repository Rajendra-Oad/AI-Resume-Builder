package com.airesumebuilder.feature.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(@NotBlank String token, @NotBlank @Size(min = 12) String newPassword) { }
