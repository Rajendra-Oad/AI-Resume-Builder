package com.airesumebuilder.feature.template.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "templates", uniqueConstraints = @UniqueConstraint(name = "uk_templates_name", columnNames = "name"))
@Getter @Setter @NoArgsConstructor
public class Template {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 100) private String name;
    @Column(length = 500) private String description;
    @Column(name = "preview_url", length = 500) private String previewUrl;
    @Column(name = "is_system", nullable = false) private boolean system = true;
    @Column(name = "is_active", nullable = false) private boolean active = true;
    @Column(columnDefinition = "json") private String configuration;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at") private Instant updatedAt;

    @PrePersist void create() { if (createdAt == null) createdAt = Instant.now(); }
    @PreUpdate void update() { updatedAt = Instant.now(); }
}
