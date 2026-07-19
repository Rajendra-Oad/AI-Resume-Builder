package com.airesumebuilder.feature.resume.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateResumeRequest(
    @NotBlank(message = "Title is required") String title,
    @NotBlank(message = "Summary is required") String summary
) {
}
