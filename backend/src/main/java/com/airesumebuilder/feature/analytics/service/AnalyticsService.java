package com.airesumebuilder.feature.analytics.service;

import com.airesumebuilder.common.exception.ValidationException;
import com.airesumebuilder.feature.analytics.repository.AnalyticsRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalyticsService {
    private static final int MAX_RANGE_DAYS = 366;
    private final AnalyticsRepository repository;

    public AnalyticsService(AnalyticsRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public UserAnalytics userOverview(String email, LocalDate from, LocalDate to) {
        DateRange range = range(from, to);
        AnalyticsRepository.UserTotals totals = repository.userTotals(email, range.start(), range.endExclusive());
        return new UserAnalytics(range.from(), range.to(), totals, activity(email, range));
    }

    @Transactional(readOnly = true)
    public AdminAnalytics adminOverview(LocalDate from, LocalDate to) {
        DateRange range = range(from, to);
        return new AdminAnalytics(range.from(), range.to(), repository.adminTotals(range.start(), range.endExclusive()));
    }

    private List<ActivityPoint> activity(String email, DateRange range) {
        Map<LocalDate, MutableActivity> days = new LinkedHashMap<>();
        for (LocalDate date = range.from(); !date.isAfter(range.to()); date = date.plusDays(1)) {
            days.put(date, new MutableActivity());
        }
        repository.userActivity(email, range.start(), range.endExclusive()).forEach(metric -> {
            MutableActivity day = days.get(metric.date());
            if (day != null) day.add(metric.metric(), metric.value());
        });
        return days.entrySet().stream()
            .map(entry -> entry.getValue().toPoint(entry.getKey()))
            .toList();
    }

    private DateRange range(LocalDate from, LocalDate to) {
        LocalDate resolvedTo = to == null ? LocalDate.now() : to;
        LocalDate resolvedFrom = from == null ? resolvedTo.minusDays(29) : from;
        if (resolvedFrom.isAfter(resolvedTo)) {
            throw new ValidationException("The analytics 'from' date must be on or before 'to'.");
        }
        long days = java.time.temporal.ChronoUnit.DAYS.between(resolvedFrom, resolvedTo) + 1;
        if (days > MAX_RANGE_DAYS) {
            throw new ValidationException("Analytics date ranges cannot exceed 366 days.");
        }
        return new DateRange(resolvedFrom, resolvedTo, resolvedFrom.atStartOfDay(), resolvedTo.plusDays(1).atStartOfDay());
    }

    private record DateRange(LocalDate from, LocalDate to, LocalDateTime start, LocalDateTime endExclusive) {}

    private static final class MutableActivity {
        private long resumes;
        private long aiRequests;
        private long pdfExports;
        private long atsReports;

        void add(String metric, long value) {
            switch (metric) {
                case "RESUMES" -> resumes += value;
                case "AI_REQUESTS" -> aiRequests += value;
                case "PDF_EXPORTS" -> pdfExports += value;
                case "ATS_REPORTS" -> atsReports += value;
                default -> { }
            }
        }

        ActivityPoint toPoint(LocalDate date) {
            return new ActivityPoint(date, resumes, aiRequests, pdfExports, atsReports);
        }
    }

    public record ActivityPoint(LocalDate date, long resumesCreated, long aiRequests, long pdfExports, long atsReports) {}
    public record UserAnalytics(LocalDate from, LocalDate to, AnalyticsRepository.UserTotals totals, List<ActivityPoint> activity) {}
    public record AdminAnalytics(LocalDate from, LocalDate to, AnalyticsRepository.AdminTotals totals) {}
}
