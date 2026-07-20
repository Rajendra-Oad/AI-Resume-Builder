package com.airesumebuilder.feature.resume.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.common.dto.Pagination;
import com.airesumebuilder.feature.resume.dto.request.CreateResumeRequest;
import com.airesumebuilder.feature.resume.dto.request.UpdateResumeRequest;
import com.airesumebuilder.feature.resume.dto.response.ResumeResponse;
import com.airesumebuilder.feature.resume.service.ResumeService;
import com.airesumebuilder.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/v1/resumes")
public class ResumeController {

    private final ResumeService resumeService;
    private final CurrentUser currentUser;

    public ResumeController(ResumeService resumeService, CurrentUser currentUser) {
        this.resumeService = resumeService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<java.util.List<ResumeResponse>>> listResumes(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        int boundedPage = Math.max(0, page);
        int boundedSize = Math.min(Math.max(1, size), 100);
        Page<ResumeResponse> result = resumeService.listResumes(
            currentUser.email(), PageRequest.of(boundedPage, boundedSize, Sort.by(Sort.Direction.DESC, "updatedAt")));
        return ResponseEntity.ok(ApiResponse.paginated(result.getContent(),
            new Pagination(result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ResumeResponse>> createResume(@Valid @RequestBody CreateResumeRequest request) {
        ResumeResponse response = resumeService.createResume(currentUser.email(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success(response, "Resume created successfully."));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ResumeResponse>> getResume(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(resumeService.getResume(currentUser.email(), id), "Resume retrieved successfully."));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ResumeResponse>> updateResume(@PathVariable Long id, @Valid @RequestBody UpdateResumeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(resumeService.updateResume(currentUser.email(), id, request), "Resume updated successfully."));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResume(@PathVariable Long id) {
        resumeService.deleteResume(currentUser.email(), id);
        return ResponseEntity.noContent().build();
    }
}
