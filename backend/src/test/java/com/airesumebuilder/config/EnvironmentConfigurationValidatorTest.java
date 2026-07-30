package com.airesumebuilder.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class EnvironmentConfigurationValidatorTest {
    private final EnvironmentConfigurationValidator validator = new EnvironmentConfigurationValidator();

    @Test
    void reportsAllMissingRequiredVariablesWithoutValues() {
        MockEnvironment environment = new MockEnvironment();

        assertThatThrownBy(() -> validator.postProcessEnvironment(environment, null))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("3 error(s)")
            .hasMessageContaining("DB_URL is required")
            .hasMessageContaining("DB_PASSWORD is required")
            .hasMessageContaining("JWT_SECRET is required")
            .hasMessageNotContaining("super-secret");
    }

    @Test
    void acceptsCompleteDevelopmentConfiguration() {
        MockEnvironment environment = validEnvironment();
        environment.setActiveProfiles("dev");

        assertThat(EnvironmentConfigurationValidator.validate(environment)).isEmpty();
    }

    @Test
    void rejectsMalformedOptionalUserApiKeyEncryptionKey() {
        MockEnvironment environment = validEnvironment()
            .withProperty("USER_API_KEY_ENCRYPTION_KEY", "not-valid-base64");

        assertThat(EnvironmentConfigurationValidator.validate(environment))
            .containsExactly("USER_API_KEY_ENCRYPTION_KEY must be valid Base64 encoding of exactly 32 bytes.");
    }

    @Test
    void reportsConditionalConfigurationErrorsTogether() {
        MockEnvironment environment = validEnvironment()
            .withProperty("AI_REDIS_ENABLED", "true")
            .withProperty("DEV_SEED_ENABLED", "true")
            .withProperty("DEV_SEED_PASSWORD", "short")
            .withProperty("SPRING_MAIL_HOST", "smtp.example.com");

        assertThat(EnvironmentConfigurationValidator.validate(environment))
            .contains(
                "REDIS_HOST is required: Redis hostname; required when AI_REDIS_ENABLED=true.",
                "DEV_SEED_ENABLED may be true only when SPRING_PROFILES_ACTIVE includes 'dev'.",
                "DEV_SEED_PASSWORD must contain at least 12 characters.",
                "SPRING_MAIL_USERNAME is required: SMTP username; required when SMTP is configured.",
                "SPRING_MAIL_PASSWORD is required: SMTP password or app token; required when SMTP is configured."
            );
    }

    private MockEnvironment validEnvironment() {
        return new MockEnvironment()
            .withProperty("DB_URL", "jdbc:postgresql://localhost:5432/ai_resume_builder")
            .withProperty("DB_PASSWORD", "database-password")
            .withProperty("JWT_SECRET", "01234567890123456789012345678901");
    }
}
