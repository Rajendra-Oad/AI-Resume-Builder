package com.airesumebuilder.feature.resume.dto.request;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record PatchResumeRequest(
    @Size(max=255) String title,
    @Size(max=2000) String summary,
    @Size(max=255) String targetJobTitle,
    @Size(max=255) @Email String contactEmail,
    @Size(max=50) String phone,
    @Size(max=255) String location,
    @Size(max=500) String githubUrl,
    @Size(max=500) String linkedinUrl,
    @Pattern(regexp="HELVETICA|TIMES|COURIER") String fontFamily,
    @DecimalMin("9.0") @DecimalMax("13.0") BigDecimal fontSize,
    @DecimalMin("1.0") @DecimalMax("1.8") BigDecimal lineSpacing,
    @Min(6) @Max(24) Integer sectionSpacing,
    @Min(24) @Max(72) Integer pageMargin
) {}
