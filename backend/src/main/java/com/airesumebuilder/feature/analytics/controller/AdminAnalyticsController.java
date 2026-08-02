package com.airesumebuilder.feature.analytics.controller;

import com.airesumebuilder.common.dto.ApiResponse;
import com.airesumebuilder.feature.analytics.service.AnalyticsService;
import com.airesumebuilder.feature.analytics.service.UsageMetricService;
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
    private final UsageMetricService usageMetrics;

    public AdminAnalyticsController(AnalyticsService service, UsageMetricService usageMetrics) {
        this.service = service;
        this.usageMetrics = usageMetrics;
    }

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<AnalyticsService.AdminAnalytics>> overview(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(ApiResponse.success(service.adminOverview(from, to), "System analytics retrieved."));
    }

    @GetMapping("/usage-metrics")
    public ResponseEntity<ApiResponse<java.util.List<UsageMetricService.Metric>>> usageMetrics(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        LocalDate resolvedTo = to == null ? LocalDate.now() : to;
        LocalDate resolvedFrom = from == null ? resolvedTo.minusDays(29) : from;
        if (resolvedFrom.isAfter(resolvedTo)) {
            throw new com.airesumebuilder.common.exception.ValidationException("The usage-metrics 'from' date must be on or before 'to'.");
        }
        if (java.time.temporal.ChronoUnit.DAYS.between(resolvedFrom, resolvedTo) + 1 > 366) {
            throw new com.airesumebuilder.common.exception.ValidationException("Usage-metrics date ranges cannot exceed 366 days.");
        }
        return ResponseEntity.ok(ApiResponse.success(usageMetrics.list(resolvedFrom, resolvedTo), "Usage metrics retrieved."));
    }
}
