package com.airesumebuilder.feature.ai.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class AiUsageRepositoryTest {
    @Test
    void calculatesMonthlySpendFromTheUtcPostgreSqlMonthBoundary() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        String sql = "SELECT COALESCE(SUM(cost_estimate),0) FROM ai_usage_ledger WHERE user_id=? "
            + "AND created_at >= (date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')";
        when(jdbc.queryForObject(sql, BigDecimal.class, 42L)).thenReturn(new BigDecimal("1.250000"));

        BigDecimal spent = new AiUsageRepository(jdbc).spentThisMonth(42L);

        assertThat(spent).isEqualByComparingTo("1.250000");
        verify(jdbc).queryForObject(eq(sql), eq(BigDecimal.class), eq(42L));
    }
}
