package com.airesumebuilder.feature.analytics.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.airesumebuilder.feature.analytics.repository.AnalyticsRepository;
import com.airesumebuilder.feature.analytics.service.AnalyticsService;
import com.airesumebuilder.security.CurrentUser;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class AnalyticsControllerTest {

    @Test
    void requestsOnlyTheAuthenticatedUsersAnalytics() {
        AnalyticsService service = mock(AnalyticsService.class);
        CurrentUser currentUser = mock(CurrentUser.class);
        AnalyticsController controller = new AnalyticsController(service, currentUser);
        LocalDate day = LocalDate.of(2026, 7, 21);
        var totals = new AnalyticsRepository.UserTotals(0, 0, null, 0, 0, 0, BigDecimal.ZERO);
        var analytics = new AnalyticsService.UserAnalytics(day, day, totals, List.of());
        when(currentUser.email()).thenReturn("owner@test");
        when(service.userOverview("owner@test", day, day)).thenReturn(analytics);

        assertThat(controller.overview(day, day).getBody().data()).isSameAs(analytics);
        verify(service).userOverview("owner@test", day, day);
    }
}
