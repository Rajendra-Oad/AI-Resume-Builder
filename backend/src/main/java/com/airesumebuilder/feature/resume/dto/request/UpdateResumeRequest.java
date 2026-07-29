package com.airesumebuilder.feature.resume.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateResumeRequest(
    @NotBlank(message = "Title is required") @Size(max = 255) String title,
    @NotBlank(message = "Summary is required") @Size(max = 2000) String summary,
    @Size(max = 255) String targetJobTitle,
    @NotBlank(message = "Full name is required") @Size(max = 255) String fullName,
    @Size(max = 255) String contactEmail,
    @Size(max = 50) String phone,
    @Size(max = 255) String location,
    @Size(max = 500) String githubUrl,
    @Size(max = 500) String linkedinUrl,
    @Size(max = 10000) String skillsContent,
    @Size(max = 20000) String experienceContent,
    @Size(max = 20000) String projectsContent,
    @Size(max = 20000) String educationContent,
    @Size(max = 10000) String certificationsContent,
    @Size(max = 10000) String languagesContent,
    @Pattern(regexp = "HELVETICA|TIMES|COURIER", message = "Unsupported font family") String fontFamily,
    @DecimalMin("9.0") @DecimalMax("13.0") BigDecimal fontSize,
    @DecimalMin("1.0") @DecimalMax("1.8") BigDecimal lineSpacing,
    @Min(6) @Max(24) Integer sectionSpacing,
    @Min(24) @Max(72) Integer pageMargin
) {
    public UpdateResumeRequest(String title, String summary) {
        this(title, summary, null, null, null, null, null, null, null, null, null, null, null, null, null,
            "HELVETICA", new BigDecimal("10.5"), new BigDecimal("1.25"), 12, 42);
    }
}
