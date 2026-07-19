package com.airesumebuilder.common.validation;

import com.airesumebuilder.feature.resume.dto.request.CreateResumeRequest;

public final class ResumeValidation {

    private ResumeValidation() {
    }

    public static void validateCreateRequest(CreateResumeRequest request) {
        if (request.title() == null || request.title().isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }
        if (request.summary() == null || request.summary().isBlank()) {
            throw new IllegalArgumentException("Summary is required");
        }
    }
}
