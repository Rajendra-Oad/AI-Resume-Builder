package com.airesumebuilder.feature.auth.service;

import com.airesumebuilder.feature.auth.dto.request.LoginRequest;
import com.airesumebuilder.feature.auth.dto.request.RegisterRequest;
import com.airesumebuilder.feature.auth.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);
}
