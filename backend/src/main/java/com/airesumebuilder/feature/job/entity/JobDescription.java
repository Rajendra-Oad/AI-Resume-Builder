package com.airesumebuilder.feature.job.entity;

import com.airesumebuilder.feature.auth.entity.User;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

@Entity @Table(name = "job_descriptions") @Getter @Setter @NoArgsConstructor
public class JobDescription {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id") private User user;
    @Column(length = 255) private String title;
    @Column(name = "company_name", length = 255) private String companyName;
    @Column(name = "source_url", length = 1000) private String sourceUrl;
    @Column(nullable = false, columnDefinition = "TEXT") private String content;
    @Column(name = "extracted_skills", columnDefinition = "jsonb") private String extractedSkills;
    @Column(name = "seniority_level", length = 100) private String seniorityLevel;
    @Column(name = "is_external", nullable = false) private boolean external;
    @Column(name = "deleted_at") private Instant deletedAt;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at") private Instant updatedAt;
    @PrePersist void create() { if (createdAt == null) createdAt = Instant.now(); }
    @PreUpdate void update() { updatedAt = Instant.now(); }
}
