package com.airesumebuilder.feature.admin.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.common.dto.Pagination;
import com.airesumebuilder.feature.admin.service.AdminService;
import com.airesumebuilder.feature.audit.service.AuditService;
import com.airesumebuilder.security.CurrentUser;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
    private final AdminService service;
    private final AuditService auditService;
    private final CurrentUser currentUser;

    public AdminController(AdminService service, AuditService auditService, CurrentUser currentUser) {
        this.service = service;
        this.auditService = auditService;
        this.currentUser = currentUser;
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<AdminService.UserView>>> users(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var result = service.users(page, size);
        return ResponseEntity.ok(ApiResponse.paginated(result.items(), pagination(result.page(), result.size(), result.total())));
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<ApiResponse<AdminService.UserView>> status(
        @PathVariable long id,
        @RequestBody AdminService.ChangeRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(service.status(currentUser.email(), id, request), "User status updated."));
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<AdminService.UserView>> role(
        @PathVariable long id,
        @RequestBody AdminService.ChangeRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(service.role(currentUser.email(), id, request), "User role updated."));
    }

    @GetMapping("/actions")
    public ResponseEntity<ApiResponse<List<AdminService.ActionView>>> actions(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var result = service.actions(page, size);
        return ResponseEntity.ok(ApiResponse.paginated(result.items(), pagination(result.page(), result.size(), result.total())));
    }

    @GetMapping("/audit")
    public ResponseEntity<ApiResponse<List<AuditService.AuditEntry>>> audit(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var result = auditService.listAll(page, size);
        return ResponseEntity.ok(ApiResponse.paginated(result.items(), pagination(result.page(), result.size(), result.total())));
    }

    private Pagination pagination(int page, int size, long total) {
        return new Pagination(page, size, total, (int) Math.ceil(total / (double) size));
    }
}
