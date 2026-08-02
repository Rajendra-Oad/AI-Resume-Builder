package com.airesumebuilder.security;

import com.airesumebuilder.common.exception.AuthenticationException;
import com.airesumebuilder.feature.auth.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final Duration accessTokenTtl;
    private final String issuer;
    private final String audience;

    public JwtService(
        @Value("${JWT_SECRET}") String secret,
        @Value("${app.security.jwt.access-token-ttl:PT15M}") Duration accessTokenTtl,
        @Value("${app.security.jwt.issuer:ai-resume-builder}") String issuer,
        @Value("${app.security.jwt.audience:ai-resume-builder-web}") String audience
    ) {
        if (secret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET must contain at least 32 characters.");
        }
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenTtl = accessTokenTtl;
        this.issuer = issuer;
        this.audience = audience;
    }

    public String createAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
            .issuer(issuer)
            .audience().add(audience).and()
            .subject(user.getPublicId().toString())
            .id(UUID.randomUUID().toString())
            .claim("userId", user.getPublicId().toString())
            .claim("email", user.getEmail())
            .claim("role", user.getRole())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(accessTokenTtl)))
            .signWith(signingKey)
            .compact();
    }

    public String extractEmail(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(issuer)
                .requireAudience(audience)
                .build()
                .parseSignedClaims(token)
                .getPayload();
            return String.valueOf(claims.get("email", String.class) == null ? "" : claims.get("email", String.class));
        } catch (Exception exception) {
            throw new AuthenticationException("The access token is invalid or expired.");
        }
    }
}
