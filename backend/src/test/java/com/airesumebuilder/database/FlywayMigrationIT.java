package com.airesumebuilder.database;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.Test;

class FlywayMigrationIT {
    @Test
    void appliesAndValidatesEveryMigrationAgainstMySql() throws Exception {
        String url = required("IT_DB_URL");
        String username = required("IT_DB_USERNAME");
        String password = required("IT_DB_PASSWORD");
        assertThat(url).as("Integration migrations must target a dedicated test database")
            .containsIgnoringCase("test");

        Flyway flyway = Flyway.configure()
            .dataSource(url, username, password)
            .locations("classpath:db/migration")
            .load();

        MigrateResult result = flyway.migrate();
        assertThat(result.success).isTrue();
        assertThat(result.migrationsExecuted).isEqualTo(11);
        flyway.validate();

        try (Connection connection = DriverManager.getConnection(url, username, password);
             Statement statement = connection.createStatement()) {
            assertThat(count(statement, "SELECT COUNT(*) FROM flyway_schema_history WHERE success=1")).isEqualTo(11);
            assertThat(count(statement, "SELECT COUNT(*) FROM information_schema.tables "
                + "WHERE table_schema=DATABASE() AND table_name IN "
                + "('users','resumes','ai_requests','ai_prompt_templates','ai_jobs','user_ai_provider_credentials')"))
                .isEqualTo(6);
            assertThat(count(statement, "SELECT COUNT(*) FROM ai_providers WHERE provider_key IN ('gemini','openai')"))
                .isEqualTo(2);
            assertThat(count(statement, "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() "
                + "AND table_name='resumes' AND column_name IN ('skills_content','font_family','page_margin')"))
                .isEqualTo(3);
            assertThat(count(statement, "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() "
                + "AND table_name='users' AND column_name IN ('persona','career_goal','onboarding_completed')"))
                .isEqualTo(3);
        }
    }

    private long count(Statement statement, String sql) throws Exception {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }

    private String required(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " is required for the Flyway integration test.");
        }
        return value;
    }
}
