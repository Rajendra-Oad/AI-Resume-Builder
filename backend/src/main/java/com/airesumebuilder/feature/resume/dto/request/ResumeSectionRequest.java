package com.airesumebuilder.feature.resume.dto.request;

import jakarta.validation.constraints.*;

public record ResumeSectionRequest(
    @NotBlank @Pattern(regexp="EDUCATION|EXPERIENCE|PROJECT|SKILL|CERTIFICATION") String type,
    @Min(0) Integer displayOrder,
    @Size(max=255) String institution,
    @Size(max=255) String degree,
    @Min(1900) @Max(2200) Integer startYear,
    @Min(1900) @Max(2200) Integer endYear,
    @Size(max=255) String employer,
    @Size(max=255) String role,
    @Size(max=50) String startDate,
    @Size(max=50) String endDate,
    @Size(max=255) String name,
    @Size(max=4000) String description,
    @Size(max=100) String proficiencyLevel,
    @Size(max=255) String issuedBy
) {}
