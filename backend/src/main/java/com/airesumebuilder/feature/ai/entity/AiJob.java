package com.airesumebuilder.feature.ai.entity;

import com.airesumebuilder.feature.auth.entity.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.*;

@Entity @Table(name = "ai_jobs") @Getter @Setter @NoArgsConstructor
public class AiJob {
    @Id @Column(length = 36) private String id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(nullable = false, length = 80) private String workflow;
    @Column(nullable = false, length = 20) private String status;
    @Lob @Column(columnDefinition = "MEDIUMTEXT") private String result;
    @Column(name = "error_message", length = 500) private String errorMessage;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "completed_at") private Instant completedAt;
    @PrePersist void create() { if (id == null) id = UUID.randomUUID().toString(); if (createdAt == null) createdAt = Instant.now(); }
}
