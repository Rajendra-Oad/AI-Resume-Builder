package com.airesumebuilder.security;

import com.airesumebuilder.common.exception.AuthenticationException;
import com.airesumebuilder.feature.auth.entity.EmailVerificationToken;
import com.airesumebuilder.feature.auth.entity.PasswordResetToken;
import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.repository.EmailVerificationTokenRepository;
import com.airesumebuilder.feature.auth.repository.PasswordResetTokenRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountRecoveryService {
    private final PasswordResetTokenRepository resetTokens;
    private final EmailVerificationTokenRepository verificationTokens;
    private final SecureRandom random = new SecureRandom();
    private final String appUrl;
    private final SecurityEmailService emailService;

    public AccountRecoveryService(PasswordResetTokenRepository resetTokens, EmailVerificationTokenRepository verificationTokens,
        @Value("${app.security.frontend-url:http://localhost:5173}") String appUrl, SecurityEmailService emailService) {
        this.resetTokens = resetTokens; this.verificationTokens = verificationTokens; this.appUrl = appUrl; this.emailService = emailService;
    }

    @Transactional public void createPasswordReset(User user) {
        String raw = newToken(); PasswordResetToken entry = new PasswordResetToken();
        entry.setUser(user); entry.setTokenHash(hash(raw)); entry.setExpiresAt(Instant.now().plus(Duration.ofMinutes(30))); resetTokens.save(entry);
        emailService.sendActionEmail(user.getEmail(), "Reset your AI Resume Builder password", "Reset your password", "We received a request to reset your AI Resume Builder password.", "Reset password", appUrl + "/reset-password?token=" + raw, "in 30 minutes");
    }
    @Transactional public User consumePasswordReset(String raw) {
        PasswordResetToken entry = resetTokens.findByTokenHash(hash(raw)).orElseThrow(() -> new AuthenticationException("Invalid or expired reset token."));
        if (entry.getUsedAt() != null || entry.getExpiresAt().isBefore(Instant.now())) throw new AuthenticationException("Invalid or expired reset token.");
        entry.setUsedAt(Instant.now()); return entry.getUser();
    }
    @Transactional public void createVerification(User user) {
        verificationTokens.findByUserIdAndUsedAtIsNull(user.getId()).forEach(token -> token.setUsedAt(Instant.now()));
        String raw = newToken(); EmailVerificationToken entry = new EmailVerificationToken();
        entry.setUser(user); entry.setTokenHash(hash(raw)); entry.setExpiresAt(Instant.now().plus(Duration.ofHours(24))); verificationTokens.save(entry);
        emailService.sendActionEmail(user.getEmail(), "Verify your AI Resume Builder email", "Verify your email", "Confirm your email address to secure your AI Resume Builder account.", "Verify email", appUrl + "/verify-email?token=" + raw, "in 24 hours");
    }
    @Transactional public User consumeVerification(String raw) {
        EmailVerificationToken entry = verificationTokens.findByTokenHash(hash(raw)).orElseThrow(() -> new AuthenticationException("Invalid or expired verification token."));
        if (entry.getUsedAt() != null || entry.getExpiresAt().isBefore(Instant.now())) throw new AuthenticationException("Invalid or expired verification token.");
        entry.setUsedAt(Instant.now()); entry.getUser().setStatus("ACTIVE"); entry.getUser().setVerifiedAt(Instant.now()); return entry.getUser();
    }
    private String newToken() { byte[] bytes = new byte[32]; random.nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    private String hash(String raw) { try { return Base64.getEncoder().encodeToString(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8))); } catch (Exception ex) { throw new IllegalStateException(ex); } }
}
