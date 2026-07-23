package com.airesumebuilder.feature.ai.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

@Entity @Table(name = "ai_request_attempts", uniqueConstraints = @UniqueConstraint(name = "uk_ai_request_attempts_number", columnNames = {"ai_request_id", "attempt_number"}))
@Getter @Setter @NoArgsConstructor
public class AiRequestAttempt {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "ai_request_id", nullable = false) private AiRequest request;
    @Column(name = "attempt_number", nullable = false) private Integer attemptNumber;
    @Column(name = "error_code", length = 100) private String errorCode;
    @Column(name = "error_message", length = 1000) private String errorMessage;
    @Column(name = "latency_ms") private Long latencyMs;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @PrePersist void create() { if (createdAt == null) createdAt = Instant.now(); }
}
