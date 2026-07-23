package com.airesumebuilder.feature.analytics.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.feature.analytics.service.AnalyticsService;
import com.airesumebuilder.security.CurrentUser;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {
    private final AnalyticsService service;
    private final CurrentUser currentUser;

    public AnalyticsController(AnalyticsService service, CurrentUser currentUser) {
        this.service = service;
        this.currentUser = currentUser;
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AnalyticsService.UserAnalytics>> overview(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ApiResponse.success(service.userOverview(currentUser.email(), from, to), "Analytics retrieved."));
    }
}
