package com.airesumebuilder.feature.ai.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

@Entity @Table(name = "ai_providers", uniqueConstraints = @UniqueConstraint(name = "uk_ai_providers_key", columnNames = "provider_key"))
@Getter @Setter @NoArgsConstructor
public class AiProvider {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "provider_key", nullable = false, length = 50) private String providerKey;
    @Column(name = "display_name", nullable = false, length = 100) private String displayName;
    @Column(name = "is_active", nullable = false) private boolean active = true;
    @Column(columnDefinition = "json") private String capabilities;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @PrePersist void create() { if (createdAt == null) createdAt = Instant.now(); }
}
