package com.airesumebuilder.feature.analytics.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.feature.analytics.service.AnalyticsService;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/analytics")
public class AdminAnalyticsController {
    private final AnalyticsService service;

    public AdminAnalyticsController(AnalyticsService service) {
        this.service = service;
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AnalyticsService.AdminAnalytics>> overview(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ApiResponse.success(service.adminOverview(from, to), "System analytics retrieved."));
    }
}
