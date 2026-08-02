package com.airesumebuilder.feature.auth.service.impl;

import com.airesumebuilder.common.exception.AuthenticationException;
import com.airesumebuilder.common.exception.ConflictException;
import com.airesumebuilder.feature.auth.dto.request.LoginRequest;
import com.airesumebuilder.feature.auth.dto.request.RegisterRequest;
import com.airesumebuilder.feature.auth.dto.response.AuthResponse;
import com.airesumebuilder.feature.auth.dto.response.RegistrationResponse;
import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import com.airesumebuilder.feature.auth.service.AuthService;
import com.airesumebuilder.security.JwtService;
import com.airesumebuilder.security.RefreshTokenService;
import com.airesumebuilder.feature.auth.dto.request.ChangePasswordRequest;
import com.airesumebuilder.feature.auth.dto.request.ResetPasswordRequest;
import com.airesumebuilder.feature.auth.dto.request.ResendVerificationRequest;
import com.airesumebuilder.security.AccountRecoveryService;
import java.time.Duration;
import java.time.Instant;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.airesumebuilder.feature.auth.phone.PhoneNumbers;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final AccountRecoveryService accountRecoveryService;

    public AuthServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService, RefreshTokenService refreshTokenService, AccountRecoveryService accountRecoveryService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
        this.accountRecoveryService = accountRecoveryService;
    }

    @Override
    @Transactional
    public RegistrationResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ConflictException("Email already registered.");
        }
        String phone = request.phone() == null || request.phone().isBlank()
            ? null
            : PhoneNumbers.normalize(request.phone());
        if (phone != null && userRepository.existsByPhone(phone)) {
            throw new ConflictException("Phone number already registered.");
        }

        User user = new User();
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(request.email());
        user.setPhone(phone);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole("USER");
        user.setStatus("PENDING_VERIFICATION");

        User savedUser = userRepository.save(user);
        accountRecoveryService.createVerification(savedUser);
        return new RegistrationResponse(String.valueOf(savedUser.getId()), savedUser.getEmail(), savedUser.getStatus());
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.identifier().trim().toLowerCase())
            .orElseThrow(() -> new AuthenticationException("Invalid email or password."));

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(Instant.now())) throw new AuthenticationException("This account is temporarily locked. Try again later.");
        if (!"ACTIVE".equals(user.getStatus()) || user.getDeletedAt() != null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
            if (user.getFailedLoginAttempts() >= 5) user.setLockedUntil(Instant.now().plus(Duration.ofMinutes(15)));
            throw new AuthenticationException("Invalid email or password.");
        }
        user.setFailedLoginAttempts(0); user.setLockedUntil(null); user.setLastLoginAt(Instant.now());
        return response(user);
    }

    @Override @Transactional(readOnly = true) public AuthResponse refresh(String token) {
        User user = refreshTokenService.validate(token);
        return new AuthResponse(jwtService.createAccessToken(user), String.valueOf(user.getId()), user.getEmail(), user.getRole(), token);
    }
    @Override @Transactional public void logout(String token) { refreshTokenService.revoke(token); }
    @Override @Transactional public void changePassword(String email, ChangePasswordRequest request) { User user = userRepository.findByEmail(email).orElseThrow(() -> new AuthenticationException("Invalid account.")); if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) throw new AuthenticationException("Current password is incorrect."); user.setPasswordHash(passwordEncoder.encode(request.newPassword())); refreshTokenService.revokeAll(user.getId()); }
    @Override @Transactional public void requestPasswordReset(String email) { userRepository.findByEmailAndDeletedAtIsNull(email).ifPresent(accountRecoveryService::createPasswordReset); }
    @Override @Transactional public void resetPassword(ResetPasswordRequest request) { User user = accountRecoveryService.consumePasswordReset(request.token()); user.setPasswordHash(passwordEncoder.encode(request.newPassword())); refreshTokenService.revokeAll(user.getId()); }
    @Override @Transactional public void verifyEmail(String token) { accountRecoveryService.consumeVerification(token); }
    @Override @Transactional public void resendVerification(ResendVerificationRequest request) {
        userRepository.findByEmailAndDeletedAtIsNull(request.email().trim().toLowerCase())
            .filter(user -> "PENDING_VERIFICATION".equals(user.getStatus()))
            .ifPresent(accountRecoveryService::createVerification);
    }
    private AuthResponse response(User user) { return new AuthResponse(jwtService.createAccessToken(user), String.valueOf(user.getId()), user.getEmail(), user.getRole(), refreshTokenService.issue(user)); }
}
