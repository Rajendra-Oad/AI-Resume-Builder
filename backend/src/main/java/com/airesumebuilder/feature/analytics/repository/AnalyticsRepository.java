package com.airesumebuilder.feature.analytics.repository;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AnalyticsRepository {
    private final JdbcTemplate jdbc;

    public AnalyticsRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public UserTotals userTotals(String email, LocalDateTime start, LocalDateTime end) {
        return jdbc.queryForObject(
            "SELECT " +
                "(SELECT COUNT(*) FROM resumes r WHERE r.user_id=u.id AND r.deleted_at IS NULL AND r.created_at>=? AND r.created_at<?) resumes, " +
                "(SELECT COUNT(*) FROM ats_reports a JOIN resumes r ON r.id=a.resume_id WHERE r.user_id=u.id AND a.created_at>=? AND a.created_at<?) ats_reports, " +
                "(SELECT AVG(a.overall_score) FROM ats_reports a JOIN resumes r ON r.id=a.resume_id WHERE r.user_id=u.id AND a.created_at>=? AND a.created_at<?) avg_ats, " +
                "(SELECT COUNT(*) FROM pdf_exports p WHERE p.user_id=u.id AND p.created_at>=? AND p.created_at<?) pdf_exports, " +
                "(SELECT COUNT(*) FROM ai_requests q WHERE q.user_id=u.id AND q.created_at>=? AND q.created_at<?) ai_requests, " +
                "(SELECT COALESCE(SUM(l.input_tokens+l.output_tokens),0) FROM ai_usage_ledger l WHERE l.user_id=u.id AND l.created_at>=? AND l.created_at<?) ai_tokens, " +
                "(SELECT COALESCE(SUM(l.cost_estimate),0) FROM ai_usage_ledger l WHERE l.user_id=u.id AND l.created_at>=? AND l.created_at<?) ai_cost " +
                "FROM users u WHERE u.email=? AND u.deleted_at IS NULL",
            this::userTotals,
            start, end, start, end, start, end, start, end, start, end, start, end, start, end, email
        );
    }

    public List<MetricPoint> userActivity(String email, LocalDateTime start, LocalDateTime end) {
        return jdbc.query(
            "SELECT metric_date,metric,SUM(value) value FROM (" +
                "SELECT DATE(r.created_at) metric_date,'RESUMES' metric,COUNT(*) value FROM resumes r JOIN users u ON u.id=r.user_id WHERE u.email=? AND u.deleted_at IS NULL AND r.deleted_at IS NULL AND r.created_at>=? AND r.created_at<? GROUP BY DATE(r.created_at) " +
                "UNION ALL SELECT DATE(q.created_at),'AI_REQUESTS',COUNT(*) FROM ai_requests q JOIN users u ON u.id=q.user_id WHERE u.email=? AND u.deleted_at IS NULL AND q.created_at>=? AND q.created_at<? GROUP BY DATE(q.created_at) " +
                "UNION ALL SELECT DATE(p.created_at),'PDF_EXPORTS',COUNT(*) FROM pdf_exports p JOIN users u ON u.id=p.user_id WHERE u.email=? AND u.deleted_at IS NULL AND p.created_at>=? AND p.created_at<? GROUP BY DATE(p.created_at) " +
                "UNION ALL SELECT DATE(a.created_at),'ATS_REPORTS',COUNT(*) FROM ats_reports a JOIN resumes r ON r.id=a.resume_id JOIN users u ON u.id=r.user_id WHERE u.email=? AND u.deleted_at IS NULL AND a.created_at>=? AND a.created_at<? GROUP BY DATE(a.created_at)" +
                ") metrics GROUP BY metric_date,metric ORDER BY metric_date",
            (result, row) -> new MetricPoint(result.getDate("metric_date").toLocalDate(), result.getString("metric"), result.getLong("value")),
            email, start, end, email, start, end, email, start, end, email, start, end
        );
    }

    public AdminTotals adminTotals(LocalDateTime start, LocalDateTime end) {
        return jdbc.queryForObject(
            "SELECT " +
                "(SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) total_users, " +
                "(SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND status='ACTIVE') active_users, " +
                "(SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND created_at>=? AND created_at<?) new_users, " +
                "(SELECT COUNT(*) FROM resumes WHERE deleted_at IS NULL AND created_at>=? AND created_at<?) resumes, " +
                "(SELECT COUNT(*) FROM ai_requests WHERE created_at>=? AND created_at<?) ai_requests, " +
                "(SELECT COUNT(*) FROM pdf_exports WHERE created_at>=? AND created_at<?) pdf_exports, " +
                "(SELECT COUNT(*) FROM ats_reports WHERE created_at>=? AND created_at<?) ats_reports",
            (result, row) -> new AdminTotals(
                result.getLong("total_users"), result.getLong("active_users"), result.getLong("new_users"),
                result.getLong("resumes"), result.getLong("ai_requests"), result.getLong("pdf_exports"), result.getLong("ats_reports")
            ),
            start, end, start, end, start, end, start, end, start, end
        );
    }

    private UserTotals userTotals(ResultSet result, int row) throws SQLException {
        BigDecimal cost = result.getBigDecimal("ai_cost");
        Number average = (Number) result.getObject("avg_ats");
        return new UserTotals(
            result.getLong("resumes"), result.getLong("ats_reports"), average == null ? null : average.doubleValue(),
            result.getLong("pdf_exports"), result.getLong("ai_requests"), result.getLong("ai_tokens"),
            cost == null ? BigDecimal.ZERO : cost
        );
    }

    public record MetricPoint(LocalDate date, String metric, long value) {}
    public record UserTotals(long resumesCreated, long atsReports, Double averageAtsScore, long pdfExports, long aiRequests, long aiTokens, BigDecimal estimatedAiCost) {}
    public record AdminTotals(long totalUsers, long activeUsers, long newUsers, long resumesCreated, long aiRequests, long pdfExports, long atsReports) {}
}
