package com.airesumebuilder.feature.resume.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.feature.resume.dto.request.CreateResumeRequest;
import com.airesumebuilder.feature.resume.dto.response.ResumeResponse;
import com.airesumebuilder.feature.resume.service.ResumeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    private final ResumeService resumeService;

    public ResumeController(ResumeService resumeService) {
        this.resumeService = resumeService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ResumeResponse>>> listResumes() {
        return ResponseEntity.ok(ApiResponse.success(resumeService.listResumes(), "Resumes retrieved successfully."));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ResumeResponse>> createResume(@Valid @RequestBody CreateResumeRequest request) {
        ResumeResponse response = resumeService.createResume(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(response, "Resume created successfully."));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ResumeResponse>> getResume(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(resumeService.getResume(id), "Resume retrieved successfully."));
    }
}
