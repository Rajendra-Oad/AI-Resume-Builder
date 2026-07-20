package com.airesumebuilder.feature.ai.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.feature.ai.dto.request.AiGenerationRequest;
import com.airesumebuilder.feature.ai.dto.response.AiGenerationResponse;
import com.airesumebuilder.feature.ai.service.AiService;
import com.airesumebuilder.feature.ai.service.AiJobService;
import com.airesumebuilder.feature.ai.dto.response.AiJobResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import com.airesumebuilder.security.CurrentUser;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import com.airesumebuilder.integration.ai.AiBudgetManager;
import com.airesumebuilder.feature.ai.dto.response.AiUsageResponse;

@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

    private final AiService aiService;
    private final AiJobService aiJobService;
    private final UserRepository users; private final AiBudgetManager budget; private final CurrentUser currentUser;

    public AiController(AiService aiService, AiJobService aiJobService, UserRepository users, AiBudgetManager budget, CurrentUser currentUser) {
        this.aiService = aiService; this.aiJobService = aiJobService; this.users=users;this.budget=budget;this.currentUser=currentUser;
    }
    @org.springframework.web.bind.annotation.GetMapping("/usage") public ResponseEntity<ApiResponse<AiUsageResponse>> usage(){var spent=budget.spent(users.findByEmail(currentUser.email()).orElseThrow().getId());var limit=budget.limit();return ResponseEntity.ok(ApiResponse.success(new AiUsageResponse(spent,limit,limit.subtract(spent).max(java.math.BigDecimal.ZERO)),"AI usage retrieved."));}
    @PostMapping("/jobs") public ResponseEntity<ApiResponse<AiJobResponse>> submitJob(@Valid @RequestBody AiGenerationRequest request){return ResponseEntity.accepted().body(ApiResponse.success(aiJobService.submit(currentUser.email(),request),"AI job queued."));}
    @org.springframework.web.bind.annotation.GetMapping("/jobs/{id}") public ResponseEntity<ApiResponse<AiJobResponse>> job(@PathVariable String id){return ResponseEntity.ok(ApiResponse.success(aiJobService.get(currentUser.email(),id), "AI job status retrieved."));}
    @org.springframework.web.bind.annotation.GetMapping(value="/jobs/{id}/stream", produces="text/event-stream") public SseEmitter stream(@PathVariable String id){String email=currentUser.email();SseEmitter emitter=new SseEmitter(65_000L);new Thread(()->{try{for(int i=0;i<60;i++){AiJobResponse job=aiJobService.get(email,id);emitter.send(SseEmitter.event().name("job").data(job));if("SUCCEEDED".equals(job.status())||"FAILED".equals(job.status())){emitter.complete();return;}Thread.sleep(1000);}emitter.complete();}catch(Exception e){emitter.completeWithError(e);}}).start();return emitter;}

    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<AiGenerationResponse>> generate(@Valid @RequestBody AiGenerationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(aiService.generate(currentUser.email(), request), "AI content generated successfully."));
    }
}
