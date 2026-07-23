package com.airesumebuilder.feature.auth.service;

import com.airesumebuilder.feature.auth.dto.request.LoginRequest;
import com.airesumebuilder.feature.auth.dto.request.RegisterRequest;
import com.airesumebuilder.feature.auth.dto.response.AuthResponse;
import com.airesumebuilder.feature.auth.dto.response.RegistrationResponse;
import com.airesumebuilder.feature.auth.dto.request.ChangePasswordRequest;
import com.airesumebuilder.feature.auth.dto.request.ResetPasswordRequest;
import com.airesumebuilder.feature.auth.dto.request.ResendVerificationRequest;

public interface AuthService {
    RegistrationResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);
    AuthResponse refresh(String refreshToken);
    void logout(String refreshToken);
    void changePassword(String email, ChangePasswordRequest request);
    void requestPasswordReset(String email);
    void resetPassword(ResetPasswordRequest request);
    void verifyEmail(String token);
    void resendVerification(ResendVerificationRequest request);
}
