package com.airesumebuilder.feature.resume.version.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.common.dto.Pagination;
import com.airesumebuilder.feature.resume.dto.response.ResumeResponse;
import com.airesumebuilder.feature.resume.version.service.ResumeVersionService;
import com.airesumebuilder.security.CurrentUser;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/resumes/{resumeId}/versions")
public class ResumeVersionController {
    private final ResumeVersionService service;
    private final CurrentUser currentUser;

    public ResumeVersionController(ResumeVersionService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ResumeVersionService.VersionSummary>>> list(
        @PathVariable long resumeId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var result = service.list(currentUser.email(), resumeId, page, size);
        var pagination = new Pagination(result.page(), result.size(), result.total(), (int) Math.ceil(result.total() / (double) result.size()));
        return ResponseEntity.ok(ApiResponse.paginated(result.items(), pagination));
    }

    @GetMapping("/{versionId}")
    public ResponseEntity<ApiResponse<ResumeVersionService.VersionDetail>> get(
        @PathVariable long resumeId,
        @PathVariable long versionId
    ) {
        return ResponseEntity.ok(ApiResponse.success(service.get(currentUser.email(), resumeId, versionId), "Resume version retrieved."));
    }

    @PostMapping("/{versionId}/restore")
    public ResponseEntity<ApiResponse<ResumeResponse>> restore(
        @PathVariable long resumeId,
        @PathVariable long versionId
    ) {
        return ResponseEntity.ok(ApiResponse.success(service.restore(currentUser.email(), resumeId, versionId), "Resume version restored."));
    }

    @PostMapping("/{versionId}/rollback")
    public ResponseEntity<ApiResponse<ResumeResponse>> rollback(@PathVariable long resumeId,@PathVariable long versionId){return ResponseEntity.ok(ApiResponse.success(service.restore(currentUser.email(),resumeId,versionId),"Resume rolled back."));}
}
