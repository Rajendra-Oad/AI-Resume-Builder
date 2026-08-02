package com.airesumebuilder.feature.job.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.common.dto.Pagination;
import com.airesumebuilder.feature.job.service.JobService;
import com.airesumebuilder.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/jobs")
public class JobController {
    private final JobService service;
    private final CurrentUser user;
    public JobController(JobService service, CurrentUser user) { this.service = service; this.user = user; }

    @GetMapping("/health") public ResponseEntity<ApiResponse<String>> health() { return ResponseEntity.ok(ApiResponse.success("UP", "Job matching service is available.")); }
    @GetMapping
    public ResponseEntity<ApiResponse<List<JobService.Job>>> list(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "100") int size) {
        var result = service.list(user.email(), page, size);
        int pages = (int) Math.ceil(result.total() / (double) result.size());
        return ResponseEntity.ok(ApiResponse.paginated(result.items(), new Pagination(result.page(), result.size(), result.total(), pages)));
    }
    @GetMapping("/{id}") public ResponseEntity<ApiResponse<JobService.Job>> get(@PathVariable long id) { return ResponseEntity.ok(ApiResponse.success(service.get(user.email(), id), "Job retrieved.")); }
    @PostMapping public ResponseEntity<ApiResponse<JobService.Job>> create(@Valid @RequestBody JobService.Request request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.create(user.email(), request), "Job created.")); }
    @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@PathVariable long id) { service.delete(user.email(), id); return ResponseEntity.noContent().build(); }
}
