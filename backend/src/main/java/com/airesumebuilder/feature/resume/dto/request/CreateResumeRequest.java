package com.airesumebuilder.feature.resume.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateResumeRequest(
    @NotBlank(message = "Title is required") @Size(max = 255) String title,
    @NotBlank(message = "Summary is required") @Size(max = 2000) String summary
) {
}
