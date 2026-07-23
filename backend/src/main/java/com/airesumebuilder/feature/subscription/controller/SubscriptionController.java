package com.airesumebuilder.feature.subscription.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.common.dto.Pagination;
import com.airesumebuilder.feature.subscription.service.SubscriptionService;
import com.airesumebuilder.security.CurrentUser;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/subscriptions")
public class SubscriptionController {
    private final SubscriptionService service;
    private final CurrentUser currentUser;

    public SubscriptionController(SubscriptionService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping("/plans")
    public ResponseEntity<ApiResponse<List<SubscriptionService.Plan>>> plans() {
        return ResponseEntity.ok(ApiResponse.success(service.plans(), "Plans retrieved."));
    }

    @GetMapping("/current")
    public ResponseEntity<ApiResponse<SubscriptionService.Subscription>> current() {
        return ResponseEntity.ok(ApiResponse.success(service.current(currentUser.email()), "Subscription retrieved."));
    }

    @GetMapping("/entitlement")
    public ResponseEntity<ApiResponse<SubscriptionService.Entitlement>> entitlement() {
        return ResponseEntity.ok(ApiResponse.success(service.entitlement(currentUser.email()), "Entitlement retrieved."));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<SubscriptionService.Subscription>>> history(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var result = service.history(currentUser.email(), page, size);
        return ResponseEntity.ok(ApiResponse.paginated(result.items(), pagination(result.page(), result.size(), result.total())));
    }

    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<List<SubscriptionService.Payment>>> payments(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var result = service.payments(currentUser.email(), page, size);
        return ResponseEntity.ok(ApiResponse.paginated(result.items(), pagination(result.page(), result.size(), result.total())));
    }

    @PostMapping("/cancel")
    public ResponseEntity<ApiResponse<SubscriptionService.Subscription>> cancel() {
        return ResponseEntity.ok(ApiResponse.success(service.cancel(currentUser.email()), "Subscription cancelled; free plan activated."));
    }

    private Pagination pagination(int page, int size, long total) {
        return new Pagination(page, size, total, (int) Math.ceil(total / (double) size));
    }
}
