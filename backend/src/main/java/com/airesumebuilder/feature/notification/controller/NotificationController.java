package com.airesumebuilder.feature.notification.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.common.dto.Pagination;
import com.airesumebuilder.feature.notification.service.NotificationService;
import com.airesumebuilder.security.CurrentUser;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService service;
    private final CurrentUser user;

    public NotificationController(NotificationService service, CurrentUser user) { this.service = service; this.user = user; }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> health() { return ResponseEntity.ok(ApiResponse.success("UP", "Notification service is available.")); }

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationService.Item>>> list(
        @RequestParam(defaultValue = "false") boolean unreadOnly,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var result = service.list(user.email(), unreadOnly, page, size);
        int pages = (int) Math.ceil(result.total() / (double) result.size());
        return ResponseEntity.ok(ApiResponse.paginated(result.items(), new Pagination(result.page(), result.size(), result.total(), pages)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationService.Item>> read(@PathVariable long id) { return ResponseEntity.ok(ApiResponse.success(service.read(user.email(), id), "Notification read.")); }
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> all() { return ResponseEntity.ok(ApiResponse.success(Map.of("updated", service.readAll(user.email())), "Notifications read.")); }
    @GetMapping("/preferences")
    public ResponseEntity<ApiResponse<NotificationService.Preferences>> preferences() { return ResponseEntity.ok(ApiResponse.success(service.preferences(user.email()), "Notification preferences retrieved.")); }
    @PutMapping("/preferences")
    public ResponseEntity<ApiResponse<NotificationService.Preferences>> updatePreferences(@RequestBody NotificationService.Preferences preferences) { return ResponseEntity.ok(ApiResponse.success(service.updatePreferences(user.email(), preferences), "Notification preferences updated.")); }
}
