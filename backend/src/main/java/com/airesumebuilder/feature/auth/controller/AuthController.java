package com.airesumebuilder.feature.auth.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.feature.auth.dto.request.LoginRequest;
import com.airesumebuilder.feature.auth.dto.request.RegisterRequest;
import com.airesumebuilder.feature.auth.dto.response.AuthResponse;
import com.airesumebuilder.feature.auth.dto.response.RegistrationResponse;
import com.airesumebuilder.feature.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.ResponseCookie;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.airesumebuilder.security.CurrentUser;
import com.airesumebuilder.feature.auth.dto.request.ChangePasswordRequest;
import com.airesumebuilder.feature.auth.dto.request.ForgotPasswordRequest;
import com.airesumebuilder.feature.auth.dto.request.ResetPasswordRequest;
import com.airesumebuilder.feature.auth.dto.request.ResendVerificationRequest;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final boolean secureCookies; private final CurrentUser currentUser;

    public AuthController(AuthService authService, @Value("${app.security.secure-cookies:false}") boolean secureCookies, CurrentUser currentUser) {
        this.authService = authService; this.secureCookies = secureCookies; this.currentUser=currentUser;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<RegistrationResponse>> register(@Valid @RequestBody RegisterRequest request) {
        RegistrationResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(response, "Registration successful. Check your email to verify your account."));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return withRefreshCookie(ResponseEntity.ok(), response).body(ApiResponse.success(response, "Login successful."));
    }

    @PostMapping("/refresh") public ResponseEntity<ApiResponse<AuthResponse>> refresh(@CookieValue(name="refresh_token", required=false) String token) { AuthResponse response = authService.refresh(token); return withRefreshCookie(ResponseEntity.ok(), response).body(ApiResponse.success(response, "Session refreshed.")); }
    @PostMapping("/logout") public ResponseEntity<Void> logout(@CookieValue(name="refresh_token", required=false) String token) { if (token != null) authService.logout(token); return ResponseEntity.noContent().header("Set-Cookie", expiredCookie()).build(); }
    @PostMapping("/change-password") public ResponseEntity<ApiResponse<Void>> changePassword(@Valid @RequestBody ChangePasswordRequest request) { authService.changePassword(currentUser.email(), request); return ResponseEntity.ok(ApiResponse.success(null, "Password changed.")); }
    @PostMapping("/forgot-password") public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) { authService.requestPasswordReset(request.email()); return ResponseEntity.ok(ApiResponse.success(null, "If that account exists, a reset link has been sent.")); }
    @PostMapping("/reset-password") public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) { authService.resetPassword(request); return ResponseEntity.ok(ApiResponse.success(null, "Password reset successfully.")); }
    @PostMapping("/verify-email") public ResponseEntity<ApiResponse<Void>> verifyEmail(@RequestParam String token) { authService.verifyEmail(token); return ResponseEntity.ok(ApiResponse.success(null, "Email verified successfully.")); }
    @PostMapping("/resend-verification") public ResponseEntity<ApiResponse<Void>> resendVerification(@Valid @RequestBody ResendVerificationRequest request) { authService.resendVerification(request); return ResponseEntity.ok(ApiResponse.success(null, "If that account is awaiting verification, a new link has been sent.")); }
    private ResponseEntity.BodyBuilder withRefreshCookie(ResponseEntity.BodyBuilder response, AuthResponse auth) { return response.header("Set-Cookie", cookie(auth.refreshToken())); }
    private String cookie(String token) { return ResponseCookie.from("refresh_token", token).httpOnly(true).secure(secureCookies).sameSite("Strict").path("/api/v1/auth").maxAge(java.time.Duration.ofDays(30)).build().toString(); }
    private String expiredCookie() { return ResponseCookie.from("refresh_token", "").httpOnly(true).secure(secureCookies).sameSite("Strict").path("/api/v1/auth").maxAge(0).build().toString(); }
}
