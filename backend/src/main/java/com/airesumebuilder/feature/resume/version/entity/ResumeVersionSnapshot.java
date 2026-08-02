package com.airesumebuilder.feature.resume.version.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "resume_version_snapshots", uniqueConstraints = @UniqueConstraint(name = "uk_resume_version_snapshots_version", columnNames = "resume_version_id"))
@Getter @Setter @NoArgsConstructor
public class ResumeVersionSnapshot {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "resume_version_id", nullable = false) private ResumeVersion resumeVersion;
    @Column(nullable = false, columnDefinition = "jsonb") private String content;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @PrePersist void create() { if (createdAt == null) createdAt = Instant.now(); }
    public void setResumeVersion(ResumeVersion resumeVersion) { this.resumeVersion = resumeVersion; }
}
