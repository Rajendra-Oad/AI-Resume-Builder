package com.airesumebuilder.feature.analytics.service;

import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UsageMetricService {
    public static final String RESUME_CREATED = "RESUME_CREATED";
    public static final String AI_REQUEST = "AI_REQUEST";
    public static final String PDF_EXPORT = "PDF_EXPORT";
    public static final String ATS_REPORT = "ATS_REPORT";

    private static final String GLOBAL_DIMENSION = "";
    private final JdbcTemplate jdbc;

    public UsageMetricService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public void increment(String metricName) {
        jdbc.update(
            "INSERT INTO usage_metrics(metric_date,metric_name,dimension_key,metric_value,created_at) " +
                "VALUES (CURRENT_DATE,?,?,1,CURRENT_TIMESTAMP) " +
                "ON CONFLICT (metric_date,metric_name,dimension_key) DO UPDATE " +
                "SET metric_value=usage_metrics.metric_value+1",
            metricName,
            GLOBAL_DIMENSION
        );
    }

    @Transactional(readOnly = true)
    public List<Metric> list(LocalDate from, LocalDate to) {
        return jdbc.query(
            "SELECT metric_date,metric_name,dimension_key,metric_value " +
                "FROM usage_metrics WHERE metric_date>=? AND metric_date<=? " +
                "ORDER BY metric_date,metric_name,dimension_key",
            (result, row) -> new Metric(
                result.getDate("metric_date").toLocalDate(),
                result.getString("metric_name"),
                result.getString("dimension_key"),
                result.getLong("metric_value")
            ),
            from,
            to
        );
    }

    public record Metric(LocalDate date, String name, String dimensionKey, long value) {}
}
