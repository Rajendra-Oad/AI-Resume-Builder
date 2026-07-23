package com.airesumebuilder.feature.user.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.feature.user.service.UserProfileService;
import com.airesumebuilder.feature.user.service.UserProfileService.ProfileRequest;
import com.airesumebuilder.feature.user.service.UserProfileService.ProfileResponse;
import com.airesumebuilder.feature.user.service.UserProfileService.OnboardingRequest;
import com.airesumebuilder.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
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
    @PutMapping("/me") public ResponseEntity<ApiResponse<ProfileResponse>> replace(@Valid @RequestBody ProfileRequest request){return ResponseEntity.ok(ApiResponse.success(profiles.update(currentUser.email(),request),"Profile updated."));}
    @PutMapping(value="/me/photo",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) public ResponseEntity<ApiResponse<ProfileResponse>> uploadPhoto(@RequestPart("photo") MultipartFile photo){return ResponseEntity.ok(ApiResponse.success(profiles.savePhoto(currentUser.email(),photo),"Profile photo updated."));}
    @PostMapping(value="/me/photo",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) public ResponseEntity<ApiResponse<ProfileResponse>> createPhoto(@RequestPart("photo") MultipartFile photo){return ResponseEntity.ok(ApiResponse.success(profiles.savePhoto(currentUser.email(),photo),"Profile photo uploaded."));}
    @GetMapping("/me/photo") public ResponseEntity<byte[]> photo(){var photo=profiles.photo(currentUser.email());return ResponseEntity.ok().contentType(MediaType.parseMediaType(photo.contentType())).header(HttpHeaders.CONTENT_DISPOSITION,"inline; filename=\""+photo.fileName()+"\"").body(photo.content());}
    @DeleteMapping("/me/photo") public ResponseEntity<Void> deletePhoto(){profiles.deletePhoto(currentUser.email());return ResponseEntity.noContent().build();}
    @PatchMapping("/me/onboarding") public ResponseEntity<ApiResponse<ProfileResponse>> completeOnboarding(@Valid @RequestBody OnboardingRequest request){return ResponseEntity.ok(ApiResponse.success(profiles.completeOnboarding(currentUser.email(),request),"Onboarding completed."));}
}
