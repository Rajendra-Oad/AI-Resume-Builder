package com.airesumebuilder.common.dto;

import com.airesumebuilder.common.web.CorrelationIdContext;
import java.time.Instant;

public record ApiMeta(String correlationId, Instant timestamp) {
    public static ApiMeta current() {
        return new ApiMeta(CorrelationIdContext.get(), Instant.now());
    }
}
