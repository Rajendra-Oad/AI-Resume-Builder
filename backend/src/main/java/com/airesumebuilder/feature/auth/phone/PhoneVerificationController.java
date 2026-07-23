package com.airesumebuilder.feature.auth.phone;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/users/me/phone")
public class PhoneVerificationController {
    private final PhoneVerificationService service; private final CurrentUser user;
    public PhoneVerificationController(PhoneVerificationService service,CurrentUser user){this.service=service;this.user=user;}
    @PostMapping("/send-otp") public ResponseEntity<ApiResponse<PhoneVerificationService.Dispatch>> send(@Valid @RequestBody SendRequest r){return ResponseEntity.ok(ApiResponse.success(service.send(user.email(),r.phone()),"Verification code sent."));}
    @PostMapping("/verify-otp") public ResponseEntity<ApiResponse<PhoneVerificationService.Verification>> verify(@Valid @RequestBody VerifyRequest r){return ResponseEntity.ok(ApiResponse.success(service.verify(user.email(),r.code()),"Phone number verified."));}
    public record SendRequest(@NotBlank @Pattern(regexp="[+0-9 ()-]{10,20}")String phone){}
    public record VerifyRequest(@NotBlank @Pattern(regexp="[0-9]{6}")String code){}
}
