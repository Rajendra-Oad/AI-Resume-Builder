package com.airesumebuilder.security;

import com.airesumebuilder.common.exception.AuthenticationException;
import com.airesumebuilder.feature.auth.entity.RefreshToken;
import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.repository.RefreshTokenRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefreshTokenService {
    private final RefreshTokenRepository repository;
    private final Duration ttl;
    private final SecureRandom random = new SecureRandom();
    public RefreshTokenService(RefreshTokenRepository repository, @Value("${app.security.refresh-token-ttl:P30D}") Duration ttl) { this.repository = repository; this.ttl = ttl; }
    @Transactional public String issue(User user) { byte[] bytes = new byte[48]; random.nextBytes(bytes); String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); RefreshToken entity = new RefreshToken(); entity.setUser(user); entity.setTokenHash(hash(token)); entity.setExpiresAt(Instant.now().plus(ttl)); repository.save(entity); return token; }
    /**
     * Validates the browser session token without rotating it. Rotating on every page load
     * creates a race when a reload aborts the response before the replacement cookie is stored.
     * The opaque token remains revocable and is still replaced by a new login.
     */
    @Transactional(readOnly = true) public User validate(String token) {
        if (token == null || token.isBlank()) throw new AuthenticationException("Invalid refresh token.");
        RefreshToken entity = repository.findByTokenHash(hash(token)).orElseThrow(() -> new AuthenticationException("Invalid refresh token."));
        if (entity.isRevoked() || entity.getExpiresAt().isBefore(Instant.now())) throw new AuthenticationException("Invalid refresh token.");
        return entity.getUser();
    }
    @Transactional public User rotate(String token) {
        if (token == null || token.isBlank()) throw new AuthenticationException("Invalid refresh token.");
        RefreshToken entity = repository.findByTokenHash(hash(token)).orElseThrow(() -> new AuthenticationException("Invalid refresh token."));
        if (entity.isRevoked()) {
            revokeAll(entity.getUser().getId());
            throw new AuthenticationException("Refresh token reuse detected. Please sign in again.");
        }
        if (entity.getExpiresAt().isBefore(Instant.now())) throw new AuthenticationException("Invalid refresh token.");
        entity.setRevoked(true);
        return entity.getUser();
    }
    @Transactional public void revoke(String token) { repository.findByTokenHash(hash(token)).ifPresent(value -> value.setRevoked(true)); }
    @Transactional public void revokeAll(Long userId) { repository.findByUserIdAndRevokedFalse(userId).forEach(value -> value.setRevoked(true)); }
    private String hash(String value) { try { return Base64.getEncoder().encodeToString(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); } catch (Exception exception) { throw new IllegalStateException(exception); } }
}
