package com.airesumebuilder.database;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.airesumebuilder.common.exception.ValidationException;
import com.airesumebuilder.feature.admin.repository.AdminRepository;
import com.airesumebuilder.feature.admin.service.AdminService;
import com.airesumebuilder.feature.analytics.repository.AnalyticsRepository;
import com.airesumebuilder.feature.analytics.service.AnalyticsService;
import com.airesumebuilder.feature.audit.repository.AuditRepository;
import com.airesumebuilder.feature.audit.service.AuditService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class AdminWorkflowIT {
    @Test
    void persistsAuthorizedAdministrativeChangesHistoryAuditAndAnalytics() {
        String url = required("IT_DB_URL");
        String username = required("IT_DB_USERNAME");
        String password = required("IT_DB_PASSWORD");
        assertThat(url).as("Administrative integration tests require a dedicated test database")
            .containsIgnoringCase("test");

        Flyway.configure().dataSource(url, username, password).locations("classpath:db/migration").load().migrate();
        JdbcTemplate jdbc = new JdbcTemplate(new DriverManagerDataSource(url, username, password));
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String adminEmail = "admin-" + suffix + "@test.example";
        String targetEmail = "member-" + suffix + "@test.example";
        long adminId = insertUser(jdbc, adminEmail, "ADMIN");
        long targetId = insertUser(jdbc, targetEmail, "USER");
        jdbc.update(
            "INSERT INTO refresh_tokens(user_id,token_hash,expires_at,created_at,revoked) " +
                "VALUES (?, ?, DATE_ADD(NOW(6), INTERVAL 1 DAY), NOW(6), FALSE)",
            targetId,
            "refresh-" + suffix
        );

        AdminRepository repository = new AdminRepository(jdbc);
        AdminService service = new AdminService(repository);

        var promoted = service.role(adminEmail, targetId, new AdminService.ChangeRequest("recruiter"));
        var suspended = service.status(adminEmail, targetId, new AdminService.ChangeRequest("suspended"));

        assertThat(promoted.role()).isEqualTo("RECRUITER");
        assertThat(suspended.status()).isEqualTo("SUSPENDED");
        assertThat(jdbc.queryForObject(
            "SELECT revoked FROM refresh_tokens WHERE user_id=?",
            Boolean.class,
            targetId
        )).isTrue();
        assertThat(repository.actions(10, 0))
            .extracting(AdminService.ActionView::action)
            .contains("USER_ROLE_CHANGED", "USER_STATUS_CHANGED");
        assertThat(repository.actions(10, 0))
            .filteredOn(action -> action.targetUserId().equals(targetId))
            .allSatisfy(action -> assertThat(action.adminUserId()).isEqualTo(adminId));

        assertThatThrownBy(() -> service.role(adminEmail, adminId, new AdminService.ChangeRequest("USER")))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("cannot remove their own access");
        assertThat(repository.get(adminId).role()).isEqualTo("ADMIN");

        AuditService audit = new AuditService(new AuditRepository(jdbc), new ObjectMapper());
        audit.recordChange(adminId, "User", targetId, "ADMIN_WORKFLOW_VERIFIED", Map.of("status", "ACTIVE"), Map.of("status", "SUSPENDED"));
        assertThat(audit.listAll(0, 20).items())
            .anySatisfy(entry -> {
                assertThat(entry.entityType()).isEqualTo("User");
                assertThat(entry.entityId()).isEqualTo(targetId);
                assertThat(entry.action()).isEqualTo("ADMIN_WORKFLOW_VERIFIED");
            });

        var analytics = new AnalyticsService(new AnalyticsRepository(jdbc))
            .adminOverview(LocalDate.now().minusDays(1), LocalDate.now());
        assertThat(analytics.totals().totalUsers()).isGreaterThanOrEqualTo(2);
        assertThat(analytics.totals().activeUsers()).isGreaterThanOrEqualTo(1);
    }

    private long insertUser(JdbcTemplate jdbc, String email, String role) {
        jdbc.update(
            "INSERT INTO users(first_name,last_name,email,password_hash,role,status,created_at,updated_at) " +
                "VALUES ('Integration','User',?,'not-used',?,'ACTIVE',NOW(6),NOW(6))",
            email,
            role
        );
        return jdbc.queryForObject("SELECT id FROM users WHERE email=?", Long.class, email);
    }

    private String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " is required for the administrative integration test.");
        }
        return value;
    }
}
