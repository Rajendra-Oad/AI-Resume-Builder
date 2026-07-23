package com.airesumebuilder.feature.ai.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.feature.ai.dto.request.PromptTemplateRequest;
import com.airesumebuilder.feature.ai.dto.response.AiProviderHealthResponse;
import com.airesumebuilder.feature.ai.service.AiPromptAdminService;
import com.airesumebuilder.integration.ai.AiProviderFactory;
import com.airesumebuilder.integration.ai.AiProviderHealth;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/ai/prompts")
@PreAuthorize("hasRole('ADMIN')")
public class AiPromptAdminController {
    private final AiPromptAdminService prompts;
    private final AiProviderFactory providers;
    private final AiProviderHealth health;

    public AiPromptAdminController(AiPromptAdminService prompts, AiProviderFactory providers, AiProviderHealth health) {
        this.prompts = prompts;
        this.providers = providers;
        this.health = health;
    }

    @GetMapping("/providers/health")
    public ResponseEntity<ApiResponse<List<AiProviderHealthResponse>>> providerHealth() {
        List<AiProviderHealthResponse> response = providers.all().stream()
            .map(provider -> new AiProviderHealthResponse(provider.key(), health.status(provider.key())))
            .toList();
        return ResponseEntity.ok(ApiResponse.success(response, "Provider health retrieved."));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> create(@Valid @RequestBody PromptTemplateRequest request) {
        prompts.createDraft(request);
        return ResponseEntity.ok(ApiResponse.success(null, "Prompt draft created."));
    }

    @PostMapping("/{workflow}/{version}/review")
    public ResponseEntity<ApiResponse<Void>> review(@PathVariable String workflow, @PathVariable int version) {
        prompts.sendForReview(workflow, version);
        return ResponseEntity.ok(ApiResponse.success(null, "Prompt sent for review."));
    }

    @PostMapping("/{workflow}/{version}/approve")
    public ResponseEntity<ApiResponse<Void>> approve(@PathVariable String workflow, @PathVariable int version) {
        prompts.approve(workflow, version);
        return ResponseEntity.ok(ApiResponse.success(null, "Prompt approved."));
    }

    @PostMapping("/{workflow}/{version}/publish")
    public ResponseEntity<ApiResponse<Void>> publish(@PathVariable String workflow, @PathVariable int version) {
        prompts.publish(workflow, version);
        return ResponseEntity.ok(ApiResponse.success(null, "Prompt published."));
    }
}
