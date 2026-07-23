package com.airesumebuilder.feature.ai.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

@Entity @Table(name = "ai_generated_contents", uniqueConstraints = @UniqueConstraint(name = "uk_ai_generated_contents_request", columnNames = "ai_request_id"))
@Getter @Setter @NoArgsConstructor
public class AiGeneratedContent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "ai_request_id", nullable = false) private AiRequest request;
    @Lob @Column(nullable = false, columnDefinition = "MEDIUMTEXT") private String content;
    @Column(columnDefinition = "json") private String metadata;
    @Column(name = "applied_to_resume", nullable = false) private boolean appliedToResume;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @PrePersist void create() { if (createdAt == null) createdAt = Instant.now(); }
}
