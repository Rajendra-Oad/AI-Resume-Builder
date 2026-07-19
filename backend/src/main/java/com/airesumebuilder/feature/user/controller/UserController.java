package com.airesumebuilder.feature.user.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<String>> getProfile() {
        return ResponseEntity.ok(ApiResponse.success("user-profile", "User profile endpoint ready."));
    }
}
