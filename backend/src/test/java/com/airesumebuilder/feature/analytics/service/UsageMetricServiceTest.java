package com.airesumebuilder.feature.analytics.service;

import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class UsageMetricServiceTest {
    @Test
    void incrementsTheDailyGlobalMetricAtomically() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        UsageMetricService service = new UsageMetricService(jdbc);

        service.increment(UsageMetricService.ATS_REPORT);

        verify(jdbc).update(
            contains("ON CONFLICT (metric_date,metric_name,dimension_key) DO UPDATE"),
            eq(UsageMetricService.ATS_REPORT),
            eq("")
        );
    }
}
