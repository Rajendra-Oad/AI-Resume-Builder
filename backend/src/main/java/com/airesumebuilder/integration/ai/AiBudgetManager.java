package com.airesumebuilder.integration.ai;

import com.airesumebuilder.common.exception.ExternalServiceException;
import java.math.BigDecimal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class AiBudgetManager {
    private final JdbcTemplate jdbc; private final BigDecimal monthlyLimit;
    public AiBudgetManager(JdbcTemplate jdbc, @Value("${app.ai.budget.per-user-monthly-usd:2.00}") BigDecimal monthlyLimit) { this.jdbc = jdbc; this.monthlyLimit = monthlyLimit; }
    public void check(Long userId) { if (spent(userId).compareTo(monthlyLimit) >= 0) throw new ExternalServiceException("Your monthly AI budget has been reached."); }
    public BigDecimal spent(Long userId) { BigDecimal spent=jdbc.queryForObject("SELECT COALESCE(SUM(cost_estimate),0) FROM ai_usage_ledger WHERE user_id=? AND created_at >= DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-01')", BigDecimal.class, userId); return spent==null?BigDecimal.ZERO:spent; }
    public BigDecimal limit(){return monthlyLimit;}
}
