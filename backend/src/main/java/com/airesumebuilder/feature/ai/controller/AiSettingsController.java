package com.airesumebuilder.feature.ai.controller;
import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.feature.ai.dto.request.AiSettingsRequest;
import com.airesumebuilder.feature.ai.dto.request.ProviderCredentialRequest;
import com.airesumebuilder.feature.ai.dto.response.AiSettingsResponse;
import com.airesumebuilder.feature.ai.service.AiUserSettingsService;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import com.airesumebuilder.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/ai/settings")
public class AiSettingsController {
 private final AiUserSettingsService settings; private final UserRepository users; private final CurrentUser currentUser;
 public AiSettingsController(AiUserSettingsService settings,UserRepository users,CurrentUser currentUser){this.settings=settings;this.users=users;this.currentUser=currentUser;}
 private Long id(){return users.findByEmail(currentUser.email()).orElseThrow().getId();}
 @GetMapping public ResponseEntity<ApiResponse<AiSettingsResponse>> get(){return ResponseEntity.ok(ApiResponse.success(settings.get(id()),"AI settings retrieved."));}
 @PutMapping public ResponseEntity<ApiResponse<AiSettingsResponse>> update(@Valid @RequestBody AiSettingsRequest request){return ResponseEntity.ok(ApiResponse.success(settings.update(id(),request),"AI settings updated."));}
 @PutMapping("/credentials/{provider}") public ResponseEntity<ApiResponse<AiSettingsResponse>> save(@PathVariable String provider,@Valid @RequestBody ProviderCredentialRequest request){return ResponseEntity.ok(ApiResponse.success(settings.saveCredential(id(),provider,request.apiKey()),"Provider key stored securely."));}
 @DeleteMapping("/credentials/{provider}") public ResponseEntity<ApiResponse<AiSettingsResponse>> delete(@PathVariable String provider){return ResponseEntity.ok(ApiResponse.success(settings.deleteCredential(id(),provider),"Provider key removed."));}
}
