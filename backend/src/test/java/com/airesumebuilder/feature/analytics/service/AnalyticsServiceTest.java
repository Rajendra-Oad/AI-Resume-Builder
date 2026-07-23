package com.airesumebuilder.feature.analytics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.airesumebuilder.common.exception.ValidationException;
import com.airesumebuilder.feature.analytics.repository.AnalyticsRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class AnalyticsServiceTest {

    @Test
    void buildsContinuousDailyActivityAndScopesItToUser() {
        AnalyticsRepository repository = mock(AnalyticsRepository.class);
        AnalyticsService service = new AnalyticsService(repository);
        LocalDate from = LocalDate.of(2026, 7, 19);
        LocalDate to = LocalDate.of(2026, 7, 21);
        var totals = new AnalyticsRepository.UserTotals(2, 1, 82.5, 1, 3, 900, new BigDecimal("0.012000"));
        when(repository.userTotals("owner@test", from.atStartOfDay(), to.plusDays(1).atStartOfDay())).thenReturn(totals);
        when(repository.userActivity("owner@test", from.atStartOfDay(), to.plusDays(1).atStartOfDay())).thenReturn(List.of(
            new AnalyticsRepository.MetricPoint(from, "RESUMES", 2),
            new AnalyticsRepository.MetricPoint(to, "AI_REQUESTS", 3)
        ));

        var result = service.userOverview("owner@test", from, to);

        assertThat(result.totals()).isSameAs(totals);
        assertThat(result.activity()).hasSize(3);
        assertThat(result.activity().get(0).resumesCreated()).isEqualTo(2);
        assertThat(result.activity().get(1).aiRequests()).isZero();
        assertThat(result.activity().get(2).aiRequests()).isEqualTo(3);
        verify(repository).userTotals("owner@test", from.atStartOfDay(), to.plusDays(1).atStartOfDay());
    }

    @Test
    void rejectsReversedAndUnboundedDateRanges() {
        AnalyticsRepository repository = mock(AnalyticsRepository.class);
        AnalyticsService service = new AnalyticsService(repository);

        assertThatThrownBy(() -> service.userOverview("u@test", LocalDate.of(2026, 7, 22), LocalDate.of(2026, 7, 21)))
            .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> service.adminOverview(LocalDate.of(2024, 1, 1), LocalDate.of(2026, 1, 1)))
            .isInstanceOf(ValidationException.class);
    }

    @Test
    void retrievesAggregateAdminAnalyticsWithoutUserDetails() {
        AnalyticsRepository repository = mock(AnalyticsRepository.class);
        AnalyticsService service = new AnalyticsService(repository);
        LocalDate day = LocalDate.of(2026, 7, 21);
        var totals = new AnalyticsRepository.AdminTotals(10, 8, 2, 4, 5, 3, 1);
        when(repository.adminTotals(day.atStartOfDay(), day.plusDays(1).atStartOfDay())).thenReturn(totals);

        assertThat(service.adminOverview(day, day).totals()).isSameAs(totals);
    }
}
