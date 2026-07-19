package com.airesumebuilder.feature.ai.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.feature.ai.service.AiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    private final AiService aiService;

    public AiController(AiService aiService) {
        this.aiService = aiService;
    }

    @GetMapping("/generate")
    public ResponseEntity<ApiResponse<String>> generate(@RequestParam String prompt) {
        return ResponseEntity.ok(ApiResponse.success(aiService.generateContent(prompt), "AI content generated successfully."));
    }
}
