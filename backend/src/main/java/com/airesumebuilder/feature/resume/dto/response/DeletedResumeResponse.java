package com.airesumebuilder.feature.resume.dto.response;

import java.time.Instant;

public record DeletedResumeResponse(
    Long id,
    String title,
    String summary,
    Instant deletedAt,
    Instant recoverableUntil
) {}
