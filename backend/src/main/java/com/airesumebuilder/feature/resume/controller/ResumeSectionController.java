package com.airesumebuilder.feature.resume.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.feature.resume.dto.request.*;
import com.airesumebuilder.feature.resume.dto.response.ResumeSectionResponse;
import com.airesumebuilder.feature.resume.service.ResumeSectionService;
import com.airesumebuilder.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/resumes/{resumeId}/sections")
public class ResumeSectionController {
    private final ResumeSectionService sections;private final CurrentUser user;
    public ResumeSectionController(ResumeSectionService sections,CurrentUser user){this.sections=sections;this.user=user;}
    @GetMapping public ResponseEntity<ApiResponse<List<ResumeSectionResponse>>> list(@PathVariable long resumeId){return ResponseEntity.ok(ApiResponse.success(sections.list(user.email(),resumeId),"Resume sections retrieved."));}
    @PostMapping public ResponseEntity<ApiResponse<ResumeSectionResponse>> create(@PathVariable long resumeId,@Valid @RequestBody ResumeSectionRequest request){return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(sections.create(user.email(),resumeId,request),"Resume section created."));}
    @PutMapping("/{sectionId}") public ResponseEntity<ApiResponse<ResumeSectionResponse>> update(@PathVariable long resumeId,@PathVariable long sectionId,@Valid @RequestBody ResumeSectionRequest request){return ResponseEntity.ok(ApiResponse.success(sections.update(user.email(),resumeId,sectionId,request),"Resume section updated."));}
    @DeleteMapping("/{sectionId}") public ResponseEntity<Void> delete(@PathVariable long resumeId,@PathVariable long sectionId){sections.delete(user.email(),resumeId,sectionId);return ResponseEntity.noContent().build();}
    @PatchMapping("/order") public ResponseEntity<ApiResponse<List<ResumeSectionResponse>>> reorder(@PathVariable long resumeId,@Valid @RequestBody ReorderSectionsRequest request){return ResponseEntity.ok(ApiResponse.success(sections.reorder(user.email(),resumeId,request.sectionIds()),"Resume sections reordered."));}
}
