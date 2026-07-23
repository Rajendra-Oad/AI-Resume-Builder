package com.airesumebuilder.feature.resume.dto.response;

import java.math.BigDecimal;

public record ResumeResponse(
    Long id,
    String title,
    String summary,
    String targetJobTitle,
    String contactEmail,
    String phone,
    String location,
    String githubUrl,
    String linkedinUrl,
    String skillsContent,
    String experienceContent,
    String projectsContent,
    String educationContent,
    String certificationsContent,
    String languagesContent,
    String fontFamily,
    BigDecimal fontSize,
    BigDecimal lineSpacing,
    Integer sectionSpacing,
    Integer pageMargin
) {
    public ResumeResponse(Long id, String title, String summary) {
        this(id, title, summary, null, null, null, null, null, null, null, null, null, null, null, null,
            "HELVETICA", new BigDecimal("10.5"), new BigDecimal("1.25"), 12, 42);
    }
}
