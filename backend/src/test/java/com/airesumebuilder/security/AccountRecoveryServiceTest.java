package com.airesumebuilder.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.airesumebuilder.feature.auth.entity.EmailVerificationToken;
import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.repository.EmailVerificationTokenRepository;
import com.airesumebuilder.feature.auth.repository.PasswordResetTokenRepository;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AccountRecoveryServiceTest {
    @Mock private PasswordResetTokenRepository resetTokens;
    @Mock private EmailVerificationTokenRepository verificationTokens;
    @Mock private SecurityEmailService emailService;

    @Test
    void verificationLifecycle_sendsOneTimeEmailAndActivatesUser() {
        AccountRecoveryService service = new AccountRecoveryService(
            resetTokens, verificationTokens, "https://app.example.test", emailService
        );
        User user = new User();
        user.setEmail("ada@example.test");
        user.setStatus("PENDING_VERIFICATION");

        service.createVerification(user);

        ArgumentCaptor<EmailVerificationToken> token = ArgumentCaptor.forClass(EmailVerificationToken.class);
        verify(verificationTokens).save(token.capture());
        assertNotNull(token.getValue().getTokenHash());
        assertNotNull(token.getValue().getExpiresAt());
        verify(emailService).sendActionEmail(
            org.mockito.ArgumentMatchers.eq("ada@example.test"), anyString(), anyString(), anyString(), anyString(),
            org.mockito.ArgumentMatchers.contains("/verify-email?token="), anyString()
        );

        EmailVerificationToken storedToken = new EmailVerificationToken();
        storedToken.setUser(user);
        storedToken.setExpiresAt(Instant.now().plusSeconds(60));
        when(verificationTokens.findByTokenHash(anyString())).thenReturn(Optional.of(storedToken));

        service.consumeVerification("raw-token");

        assertEquals("ACTIVE", user.getStatus());
        assertNotNull(user.getVerifiedAt());
        assertNotNull(storedToken.getUsedAt());
    }
}
