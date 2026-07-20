package com.airesumebuilder.feature.user.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.feature.user.service.UserProfileService;
import com.airesumebuilder.feature.user.service.UserProfileService.ProfileRequest;
import com.airesumebuilder.feature.user.service.UserProfileService.ProfileResponse;
import com.airesumebuilder.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    private final UserProfileService profiles; private final CurrentUser currentUser;
    public UserController(UserProfileService profiles,CurrentUser currentUser){this.profiles=profiles;this.currentUser=currentUser;}

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<ProfileResponse>> getProfile() {
        return ResponseEntity.ok(ApiResponse.success(profiles.get(currentUser.email()), "Profile retrieved."));
    }
    @PatchMapping("/me") public ResponseEntity<ApiResponse<ProfileResponse>> update(@Valid @RequestBody ProfileRequest request){return ResponseEntity.ok(ApiResponse.success(profiles.update(currentUser.email(),request),"Profile updated."));}
}
