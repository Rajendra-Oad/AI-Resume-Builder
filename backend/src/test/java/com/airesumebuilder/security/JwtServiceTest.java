package com.airesumebuilder.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.airesumebuilder.common.exception.AuthenticationException;
import com.airesumebuilder.feature.auth.entity.User;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class JwtServiceTest {
    private static final String SECRET = "01234567890123456789012345678901";

    @Test
    void createsAndValidatesAccessToken() {
        JwtService service = new JwtService(SECRET, Duration.ofMinutes(15), "issuer", "audience");
        User user = user(42L, "ADMIN");

        assertThat(service.extractEmail(service.createAccessToken(user))).isEqualTo("person@example.com");
    }

    @Test
    void rejectsWrongIssuerTamperingAndExpiredTokens() throws InterruptedException {
        User user = user(1L, "USER");
        JwtService issuer = new JwtService(SECRET, Duration.ofMillis(1), "issuer", "audience");
        String token = issuer.createAccessToken(user);
        Thread.sleep(5);

        assertThatThrownBy(() -> issuer.extractEmail(token)).isInstanceOf(AuthenticationException.class);
        assertThatThrownBy(() -> new JwtService(SECRET, Duration.ofMinutes(1), "other", "audience").extractEmail(token))
            .isInstanceOf(AuthenticationException.class);
        assertThatThrownBy(() -> issuer.extractEmail(token + "changed")).isInstanceOf(AuthenticationException.class);
    }

    @Test
    void rejectsShortSigningSecret() {
        assertThatThrownBy(() -> new JwtService("short", Duration.ofMinutes(1), "issuer", "audience"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("32 characters");
    }

    private User user(long id, String role) {
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        when(user.getEmail()).thenReturn("person@example.com");
        when(user.getRole()).thenReturn(role);
        return user;
    }
}
