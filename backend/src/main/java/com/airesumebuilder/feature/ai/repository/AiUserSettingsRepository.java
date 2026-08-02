package com.airesumebuilder.feature.ai.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AiUserSettingsRepository {
    private final JdbcTemplate jdbc;

    public AiUserSettingsRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Settings settings(Long userId) {
        try {
            return jdbc.queryForObject(
                "SELECT mode,preferred_provider,allow_platform_fallback FROM user_ai_settings WHERE user_id=?",
                (result, row) -> new Settings(result.getString(1), result.getString(2), result.getBoolean(3)),
                userId
            );
        } catch (EmptyResultDataAccessException ignored) {
            return new Settings("PLATFORM", "gemini", true);
        }
    }

    public void saveSettings(Long userId, String mode, String provider, boolean fallback) {
        jdbc.update(
            "INSERT INTO user_ai_settings (user_id,mode,preferred_provider,allow_platform_fallback,updated_at) VALUES (?,?,?,?,?) " +
                "ON CONFLICT (user_id) DO UPDATE SET mode=EXCLUDED.mode,preferred_provider=EXCLUDED.preferred_provider," +
                "allow_platform_fallback=EXCLUDED.allow_platform_fallback,updated_at=EXCLUDED.updated_at",
            userId, mode, provider, fallback, Instant.now()
        );
    }

    public Optional<Credential> credential(Long userId, String provider) {
        List<Credential> credentials = jdbc.query(
            "SELECT encrypted_key,initialization_vector,key_hint FROM user_ai_provider_credentials WHERE user_id=? AND provider=?",
            (result, row) -> new Credential(result.getBytes(1), result.getBytes(2), result.getString(3)),
            userId, provider
        );
        return credentials.stream().findFirst();
    }

    public void saveCredential(Long userId, String provider, byte[] encrypted, byte[] iv, String hint) {
        Instant now = Instant.now();
        jdbc.update(
            "INSERT INTO user_ai_provider_credentials (user_id,provider,encrypted_key,initialization_vector,key_version,key_hint,created_at,updated_at) VALUES (?,?,?,?,1,?,?,?) " +
                "ON CONFLICT (user_id,provider) DO UPDATE SET encrypted_key=EXCLUDED.encrypted_key," +
                "initialization_vector=EXCLUDED.initialization_vector,key_version=EXCLUDED.key_version," +
                "key_hint=EXCLUDED.key_hint,updated_at=EXCLUDED.updated_at",
            userId, provider, encrypted, iv, hint, now, now
        );
    }

    public void deleteCredential(Long userId, String provider) {
        jdbc.update("DELETE FROM user_ai_provider_credentials WHERE user_id=? AND provider=?", userId, provider);
    }

    public void resetToPlatform(Long userId) {
        jdbc.update("UPDATE user_ai_settings SET mode='PLATFORM',updated_at=? WHERE user_id=?", Instant.now(), userId);
    }

    public record Settings(String mode, String provider, boolean fallback) {}
    public record Credential(byte[] encrypted, byte[] iv, String hint) {}
}
