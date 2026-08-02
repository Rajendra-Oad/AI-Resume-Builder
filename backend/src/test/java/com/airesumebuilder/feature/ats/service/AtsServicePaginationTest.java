package com.airesumebuilder.feature.ats.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.airesumebuilder.feature.analytics.service.UsageMetricService;
import com.airesumebuilder.feature.ats.repository.AtsRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

class AtsServicePaginationTest {
    @Test
    void capsHistoryPageSize() {
        AtsRepository repository = mock(AtsRepository.class);
        when(repository.list("owner@test", 4L, 100, 300)).thenReturn(List.of());
        when(repository.count("owner@test", 4L)).thenReturn(401L);
        AtsService service = new AtsService(repository, mock(AtsScoringEngine.class), mock(UsageMetricService.class));

        var page = service.list("owner@test", 4L, 3, 1000);

        assertThat(page.size()).isEqualTo(100);
        assertThat(page.total()).isEqualTo(401);
        verify(repository).list("owner@test", 4L, 100, 300);
    }
}
