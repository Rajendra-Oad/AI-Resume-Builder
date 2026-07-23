package com.airesumebuilder.feature.job.entity;

import com.airesumebuilder.feature.resume.entity.Resume;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.*;

@Entity @Table(name = "job_matches", uniqueConstraints = @UniqueConstraint(name = "uk_job_matches_resume_job", columnNames = {"resume_id", "job_description_id"}))
@Getter @Setter @NoArgsConstructor
public class JobMatch {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "resume_id", nullable = false) private Resume resume;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "job_description_id", nullable = false) private JobDescription jobDescription;
    @Column(name = "match_score", nullable = false, precision = 5, scale = 2) private BigDecimal matchScore;
    @Column(name = "computed_at", nullable = false, updatable = false) private Instant computedAt;
    @Column(name = "expires_at") private Instant expiresAt;
    @PrePersist void create() { if (computedAt == null) computedAt = Instant.now(); }
}
