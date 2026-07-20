package com.airesumebuilder.feature.ai.controller;
import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.feature.ai.dto.request.PromptTemplateRequest;
import jakarta.validation.Valid;
import java.time.Instant;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.airesumebuilder.integration.ai.AiProviderFactory;
import com.airesumebuilder.integration.ai.AiProviderHealth;
import com.airesumebuilder.feature.ai.dto.response.AiProviderHealthResponse;
@RestController @RequestMapping("/api/v1/admin/ai/prompts") @PreAuthorize("hasRole('ADMIN')")
public class AiPromptAdminController { private final JdbcTemplate jdbc; private final AiProviderFactory providers; private final AiProviderHealth health; public AiPromptAdminController(JdbcTemplate jdbc,AiProviderFactory providers,AiProviderHealth health){this.jdbc=jdbc;this.providers=providers;this.health=health;}
 @GetMapping("/providers/health") public ResponseEntity<ApiResponse<java.util.List<AiProviderHealthResponse>>> providerHealth(){return ResponseEntity.ok(ApiResponse.success(providers.all().stream().map(p->new AiProviderHealthResponse(p.key(),health.status(p.key()))).toList(),"Provider health retrieved."));}
 @PostMapping public ResponseEntity<ApiResponse<Void>> create(@Valid @RequestBody PromptTemplateRequest r){Integer next=jdbc.queryForObject("SELECT COALESCE(MAX(version),0)+1 FROM ai_prompt_templates WHERE workflow=? AND locale=?",Integer.class,r.workflow(),r.locale());jdbc.update("INSERT INTO ai_prompt_templates (workflow,version,locale,status,system_instruction,category,created_at) VALUES (?,?,?,?,?,?,?)",r.workflow(),next,r.locale(),"DRAFT",r.systemInstruction(),r.category(),Instant.now());return ResponseEntity.ok(ApiResponse.success(null,"Prompt draft created."));}
 @PostMapping("/{workflow}/{version}/review") public ResponseEntity<ApiResponse<Void>> review(@PathVariable String workflow,@PathVariable int version){jdbc.update("UPDATE ai_prompt_templates SET status='REVIEW',reviewed_at=? WHERE workflow=? AND version=?",Instant.now(),workflow,version);return ResponseEntity.ok(ApiResponse.success(null,"Prompt sent for review."));}
 @PostMapping("/{workflow}/{version}/approve") public ResponseEntity<ApiResponse<Void>> approve(@PathVariable String workflow,@PathVariable int version){jdbc.update("UPDATE ai_prompt_templates SET status='APPROVED' WHERE workflow=? AND version=?",workflow,version);return ResponseEntity.ok(ApiResponse.success(null,"Prompt approved."));}
 @PostMapping("/{workflow}/{version}/publish") public ResponseEntity<ApiResponse<Void>> publish(@PathVariable String workflow,@PathVariable int version){jdbc.update("UPDATE ai_prompt_templates SET status='DRAFT' WHERE workflow=? AND status='PUBLISHED'",workflow);jdbc.update("UPDATE ai_prompt_templates SET status='PUBLISHED',published_at=? WHERE workflow=? AND version=? AND status='APPROVED'",Instant.now(),workflow,version);return ResponseEntity.ok(ApiResponse.success(null,"Prompt published."));} }
