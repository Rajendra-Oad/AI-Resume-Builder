package com.airesumebuilder.feature.resume.dto.request;
import jakarta.validation.constraints.NotEmpty; import java.util.List;
public record ReorderSectionsRequest(@NotEmpty List<Long> sectionIds) {}
