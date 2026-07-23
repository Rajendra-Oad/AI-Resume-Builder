package com.airesumebuilder.feature.ai.entity;

import com.airesumebuilder.feature.auth.entity.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.*;

@Entity @Table(name = "ai_usage_ledger") @Getter @Setter @NoArgsConstructor
public class AiUsageLedger {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "provider_id", nullable = false) private AiProvider provider;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "ai_request_id") private AiRequest request;
    @Column(name = "input_tokens", nullable = false) private Integer inputTokens = 0;
    @Column(name = "output_tokens", nullable = false) private Integer outputTokens = 0;
    @Column(name = "cost_estimate", nullable = false, precision = 12, scale = 6) private BigDecimal costEstimate = BigDecimal.ZERO;
    @Column(name = "billing_period_reference", length = 30) private String billingPeriodReference;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @PrePersist void create() { if (createdAt == null) createdAt = Instant.now(); }
}
