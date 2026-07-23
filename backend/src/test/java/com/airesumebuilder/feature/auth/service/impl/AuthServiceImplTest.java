package com.airesumebuilder.feature.auth.service.impl;

import com.airesumebuilder.feature.auth.dto.request.RegisterRequest;
import com.airesumebuilder.feature.auth.dto.response.AuthResponse;
import com.airesumebuilder.feature.auth.dto.response.RegistrationResponse;
import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import com.airesumebuilder.security.JwtService;
import com.airesumebuilder.security.RefreshTokenService;
import com.airesumebuilder.security.AccountRecoveryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock private RefreshTokenService refreshTokenService;
    @Mock private AccountRecoveryService accountRecoveryService;

    private AuthServiceImpl authService;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        authService = new AuthServiceImpl(
            userRepository,
            passwordEncoder,
            new JwtService("test-secret-with-at-least-thirty-two-characters", Duration.ofMinutes(15), "test-issuer", "test-audience"), refreshTokenService, accountRecoveryService
        );
    }

    @Test
    void register_shouldPersistUserWithEncodedPassword() {
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);
        when(passwordEncoder.encode("secret-password-123")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RegistrationResponse response = authService.register(new RegisterRequest("Ada", "Lovelace", "test@example.com", "+91 98765 43210", "secret-password-123"));

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals("+919876543210", userCaptor.getValue().getPhone());

        User savedUser = userCaptor.getValue();
        assertEquals("Ada", savedUser.getFirstName());
        assertEquals("Lovelace", savedUser.getLastName());
        assertEquals("test@example.com", savedUser.getEmail());
        assertEquals("encoded-password", savedUser.getPasswordHash());
        assertEquals("PENDING_VERIFICATION", savedUser.getStatus());
        assertEquals(null, savedUser.getVerifiedAt());
        assertEquals("test@example.com", response.email());
        verify(accountRecoveryService).createVerification(savedUser);
    }

    @Test
    void refresh_shouldKeepValidRefreshTokenStable() {
        User user = new User();
        user.setEmail("test@example.com");
        user.setRole("USER");
        when(refreshTokenService.validate("stable-refresh-token")).thenReturn(user);

        AuthResponse response = authService.refresh("stable-refresh-token");

        assertEquals("stable-refresh-token", response.refreshToken());
        assertNotNull(response.accessToken());
        verify(refreshTokenService).validate("stable-refresh-token");
    }
}
