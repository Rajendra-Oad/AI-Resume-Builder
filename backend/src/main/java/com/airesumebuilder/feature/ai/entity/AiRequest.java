package com.airesumebuilder.feature.ai.entity;

import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.resume.entity.Resume;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import lombok.*;

@Entity @Table(name = "ai_requests") @Getter @Setter @NoArgsConstructor
public class AiRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "resume_id") private Resume resume;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "provider_id", nullable = false) private AiProvider provider;
    @Column(name = "request_type", nullable = false, length = 80) private String requestType;
    @Column(nullable = false, length = 30) private String status = "PENDING";
    @Column(name = "prompt_reference", length = 500) private String promptReference;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "completed_at") private Instant completedAt;
    @OneToOne(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY) private AiGeneratedContent generatedContent;
    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true) @OrderBy("attemptNumber ASC") private List<AiRequestAttempt> attempts = new ArrayList<>();
    @PrePersist void create() { if (createdAt == null) createdAt = Instant.now(); }
}
