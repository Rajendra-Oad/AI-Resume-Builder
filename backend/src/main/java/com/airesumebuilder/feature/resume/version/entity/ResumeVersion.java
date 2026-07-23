package com.airesumebuilder.feature.resume.version.entity;

import com.airesumebuilder.feature.resume.entity.Resume;
import com.airesumebuilder.feature.template.entity.Template;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "resume_versions", uniqueConstraints = @UniqueConstraint(name = "uk_resume_versions_number", columnNames = {"resume_id", "version_number"}))
@Getter @Setter @NoArgsConstructor
public class ResumeVersion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "resume_id", nullable = false) private Resume resume;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "template_id") private Template template;
    @Column(name = "version_number", nullable = false) private Integer versionNumber;
    @Column(name = "source_type", nullable = false, length = 50) private String sourceType = "USER_EDIT";
    @Column(length = 255) private String label;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @OneToOne(mappedBy = "resumeVersion", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY) private ResumeVersionSnapshot snapshot;

    @PrePersist void create() { if (createdAt == null) createdAt = Instant.now(); }
    public void setSnapshot(ResumeVersionSnapshot snapshot) { this.snapshot = snapshot; if (snapshot != null) snapshot.setResumeVersion(this); }
}
