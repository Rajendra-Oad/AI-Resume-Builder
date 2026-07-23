package com.airesumebuilder.feature.ats.entity;

import com.airesumebuilder.feature.job.entity.JobDescription;
import com.airesumebuilder.feature.resume.entity.Resume;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import lombok.*;

@Entity @Table(name = "ats_reports") @Getter @Setter @NoArgsConstructor
public class AtsReport {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "resume_id", nullable = false) private Resume resume;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "job_description_id", nullable = false) private JobDescription jobDescription;
    @Column(name = "overall_score", nullable = false, precision = 5, scale = 2) private BigDecimal overallScore;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true) private List<AtsKeywordMatch> keywordMatches = new ArrayList<>();
    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true) private List<AtsMissingSkill> missingSkills = new ArrayList<>();
    @OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true) private List<AtsRecommendation> recommendations = new ArrayList<>();
    @PrePersist void create() { if (createdAt == null) createdAt = Instant.now(); }
}
