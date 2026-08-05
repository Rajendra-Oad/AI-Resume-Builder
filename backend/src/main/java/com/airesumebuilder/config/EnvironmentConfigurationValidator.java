package com.airesumebuilder.config;

import java.math.BigDecimal;
import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.util.StringUtils;

/** Validates deployment inputs before Spring creates database or security beans. */
public final class EnvironmentConfigurationValidator implements EnvironmentPostProcessor, Ordered {
    private static final Set<String> PROVIDERS = Set.of("gemini", "openai");
    private static final String PLACEHOLDER_PREFIX = "replace-with-";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        List<String> errors = validate(environment);
        if (!errors.isEmpty()) {
            boolean production = environment.acceptsProfiles(org.springframework.core.env.Profiles.of("prod"));
            throw new IllegalStateException(format(errors, production));
        }
    }

    static List<String> validate(ConfigurableEnvironment environment) {
        List<String> errors = new ArrayList<>();
        boolean production = environment.acceptsProfiles(org.springframework.core.env.Profiles.of("prod"));

        validateDatabaseLocation(environment, errors);
        require(environment, errors, "DB_PASSWORD", "password for the configured PostgreSQL account");
        require(environment, errors, "JWT_SECRET", "random secret containing at least 32 characters");
        String dbUrl = value(environment, "DB_URL");
        if (present(dbUrl) && !dbUrl.startsWith("jdbc:postgresql://")) {
            errors.add("DB_URL must start with 'jdbc:postgresql://'.");
        }

        String jwtSecret = value(environment, "JWT_SECRET");
        if (present(jwtSecret) && !placeholder(jwtSecret) && jwtSecret.length() < 32) {
            errors.add("JWT_SECRET must contain at least 32 characters.");
        }
        validateEncryptionKey(environment, errors);
        choice(environment, errors, "AI_PROVIDER", "gemini", PROVIDERS);
        positiveInteger(environment, errors, "AI_RATE_LIMIT_PER_USER_PER_HOUR");
        positiveInteger(environment, errors, "AI_CACHE_TTL_SECONDS");
        positiveDecimal(environment, errors, "AI_BUDGET_PER_USER_MONTHLY_USD");
        duration(environment, errors, "JWT_ACCESS_TOKEN_TTL");
        duration(environment, errors, "REFRESH_TOKEN_TTL");
        url(environment, errors, "APP_FRONTEND_URL", production);

        validateSmtp(environment, errors);
        validateRedis(environment, errors);
        validateDevelopmentSeed(environment, errors);
        validateProduction(environment, errors, production);
        return errors;
    }

    private static void validateEncryptionKey(ConfigurableEnvironment environment, List<String> errors) {
        String key = value(environment, "USER_API_KEY_ENCRYPTION_KEY");
        if (!present(key) || placeholder(key)) return;
        try {
            if (Base64.getDecoder().decode(key).length != 32) {
                errors.add("USER_API_KEY_ENCRYPTION_KEY must decode to exactly 32 bytes.");
            }
        } catch (IllegalArgumentException exception) {
            errors.add("USER_API_KEY_ENCRYPTION_KEY must be valid Base64 encoding of exactly 32 bytes.");
        }
    }

    private static void validateSmtp(ConfigurableEnvironment environment, List<String> errors) {
        boolean configured = present(value(environment, "SPRING_MAIL_HOST"))
            || present(value(environment, "SPRING_MAIL_USERNAME"))
            || present(value(environment, "SPRING_MAIL_PASSWORD"));
        if (!configured) return;
        require(environment, errors, "SPRING_MAIL_HOST", "SMTP hostname; required when SMTP is configured");
        require(environment, errors, "SPRING_MAIL_USERNAME", "SMTP username; required when SMTP is configured");
        require(environment, errors, "SPRING_MAIL_PASSWORD", "SMTP password or app token; required when SMTP is configured");
        port(environment, errors, "SPRING_MAIL_PORT", "587");
    }

    private static void validateRedis(ConfigurableEnvironment environment, List<String> errors) {
        if (!booleanValue(environment, "AI_REDIS_ENABLED", false, errors)) return;
        require(environment, errors, "REDIS_HOST", "Redis hostname; required when AI_REDIS_ENABLED=true");
        port(environment, errors, "REDIS_PORT", "6379");
    }

    private static void validateDevelopmentSeed(ConfigurableEnvironment environment, List<String> errors) {
        if (!booleanValue(environment, "DEV_SEED_ENABLED", false, errors)) return;
        if (!environment.acceptsProfiles(org.springframework.core.env.Profiles.of("dev"))) {
            errors.add("DEV_SEED_ENABLED may be true only when SPRING_PROFILES_ACTIVE includes 'dev'.");
        }
        String password = value(environment, "DEV_SEED_PASSWORD");
        if (!present(password) || placeholder(password)) {
            errors.add("DEV_SEED_PASSWORD is required when DEV_SEED_ENABLED=true (minimum 12 characters).");
        } else if (password.length() < 12) {
            errors.add("DEV_SEED_PASSWORD must contain at least 12 characters.");
        }
    }

    private static void validateProduction(ConfigurableEnvironment environment, List<String> errors, boolean production) {
        if (!production) return;
        require(environment, errors, "DB_USERNAME", "least-privileged production PostgreSQL account");
        require(environment, errors, "APP_FRONTEND_URL", "public HTTPS URL of the production frontend");
        require(environment, errors, "APP_CORS_ALLOWED_ORIGINS", "comma-separated production frontend origins");
        require(environment, errors, "USER_API_KEY_ENCRYPTION_KEY", "Base64-encoded 32-byte key for encrypted user provider credentials");
        require(environment, errors, "MANAGEMENT_METRICS_TOKEN", "random token protecting the Prometheus metrics endpoint");
        require(environment, errors, "SPRING_MAIL_HOST", "SMTP host required for account verification and recovery");
        require(environment, errors, "SPRING_MAIL_USERNAME", "SMTP username required for account verification and recovery");
        require(environment, errors, "SPRING_MAIL_PASSWORD", "SMTP password required for account verification and recovery");
        require(environment, errors, "MAIL_FROM", "sender email address required for account verification and recovery");
        String provider = environment.getProperty("AI_PROVIDER", "gemini").trim().toLowerCase();
        if ("gemini".equals(provider)) require(environment, errors, "GEMINI_API_KEY", "platform Gemini provider credential");
        if ("openai".equals(provider)) require(environment, errors, "OPENAI_API_KEY", "platform OpenAI provider credential");
        if (!booleanValue(environment, "APP_SECURE_COOKIES", false, errors)) {
            errors.add("APP_SECURE_COOKIES must be true in the prod profile.");
        }
    }

    private static void validateDatabaseLocation(ConfigurableEnvironment environment, List<String> errors) {
        if (present(value(environment, "DB_URL"))) return;
        require(environment, errors, "DB_HOST", "PostgreSQL hostname when DB_URL is not supplied");
        require(environment, errors, "DB_NAME", "PostgreSQL database name when DB_URL is not supplied");
        port(environment, errors, "DB_PORT", "5432");
    }

    private static void require(ConfigurableEnvironment environment, List<String> errors, String name, String purpose) {
        String configured = value(environment, name);
        if (!present(configured)) {
            errors.add(name + " is required: " + purpose + ".");
        } else if (placeholder(configured)) {
            errors.add(name + " still contains an example placeholder; configure " + purpose + ".");
        }
    }

    private static void choice(ConfigurableEnvironment environment, List<String> errors, String name, String fallback, Set<String> allowed) {
        String configured = environment.getProperty(name, fallback).trim().toLowerCase();
        if (!allowed.contains(configured)) errors.add(name + " must be one of: " + String.join(", ", allowed) + ".");
    }

    private static boolean booleanValue(ConfigurableEnvironment environment, String name, boolean fallback, List<String> errors) {
        String configured = environment.getProperty(name);
        if (!present(configured)) return fallback;
        if (configured.equalsIgnoreCase("true")) return true;
        if (configured.equalsIgnoreCase("false")) return false;
        errors.add(name + " must be either true or false.");
        return fallback;
    }

    private static void positiveInteger(ConfigurableEnvironment environment, List<String> errors, String name) {
        String configured = environment.getProperty(name);
        if (!present(configured)) return;
        try {
            if (Integer.parseInt(configured) <= 0) errors.add(name + " must be a positive integer.");
        } catch (NumberFormatException exception) {
            errors.add(name + " must be a positive integer.");
        }
    }

    private static void positiveDecimal(ConfigurableEnvironment environment, List<String> errors, String name) {
        String configured = environment.getProperty(name);
        if (!present(configured)) return;
        try {
            if (new BigDecimal(configured).signum() <= 0) errors.add(name + " must be greater than zero.");
        } catch (NumberFormatException exception) {
            errors.add(name + " must be a valid number greater than zero.");
        }
    }

    private static void duration(ConfigurableEnvironment environment, List<String> errors, String name) {
        String configured = environment.getProperty(name);
        if (!present(configured)) return;
        try {
            if (Duration.parse(configured).isZero() || Duration.parse(configured).isNegative()) {
                errors.add(name + " must be a positive ISO-8601 duration, for example PT15M or P30D.");
            }
        } catch (RuntimeException exception) {
            errors.add(name + " must be a positive ISO-8601 duration, for example PT15M or P30D.");
        }
    }

    private static void url(ConfigurableEnvironment environment, List<String> errors, String name, boolean httpsRequired) {
        String configured = environment.getProperty(name);
        if (!present(configured)) return;
        try {
            URI uri = URI.create(configured);
            boolean validScheme = "http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme());
            if (!validScheme || !present(uri.getHost()) || (httpsRequired && !"https".equalsIgnoreCase(uri.getScheme()))) {
                errors.add(name + (httpsRequired ? " must be an absolute HTTPS URL in production." : " must be an absolute HTTP(S) URL."));
            }
        } catch (IllegalArgumentException exception) {
            errors.add(name + (httpsRequired ? " must be an absolute HTTPS URL in production." : " must be an absolute HTTP(S) URL."));
        }
    }

    private static void port(ConfigurableEnvironment environment, List<String> errors, String name, String fallback) {
        String configured = environment.getProperty(name, fallback);
        try {
            int port = Integer.parseInt(configured);
            if (port < 1 || port > 65535) errors.add(name + " must be between 1 and 65535.");
        } catch (NumberFormatException exception) {
            errors.add(name + " must be an integer between 1 and 65535.");
        }
    }

    private static String value(ConfigurableEnvironment environment, String name) {
        String configured = environment.getProperty(name);
        return configured == null ? null : configured.trim();
    }

    private static boolean present(String value) {
        return StringUtils.hasText(value);
    }

    private static boolean placeholder(String value) {
        return value.toLowerCase().startsWith(PLACEHOLDER_PREFIX);
    }

    private static String format(List<String> errors, boolean production) {
        StringBuilder message = new StringBuilder("\n\nEnvironment configuration validation failed with ")
            .append(errors.size()).append(" error(s):\n");
        for (int i = 0; i < errors.size(); i++) {
            message.append("  ").append(i + 1).append(") ").append(errors.get(i)).append('\n');
        }
        message.append("Update backend/.env or deployment environment variables, then restart. Secret values were not logged.");
        if (production) {
            message.append(" Production-only variables (see docs/Deployment.md) must be supplied in the deployment platform environment (e.g. Render service env vars).");
        }
        return message.toString();
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
