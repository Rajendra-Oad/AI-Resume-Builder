package com.airesumebuilder.feature.pdf.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.airesumebuilder.feature.analytics.service.UsageMetricService;
import com.airesumebuilder.feature.pdf.repository.PdfExportRepository;
import java.util.List;
import org.junit.jupiter.api.Test;

class PdfServicePaginationTest {
    @Test
    void verifiesOwnershipAndUsesBoundedPage() {
        PdfExportRepository repository = mock(PdfExportRepository.class);
        when(repository.history("owner@test", 8L, 1, 2)).thenReturn(List.of());
        when(repository.historyCount("owner@test", 8L)).thenReturn(3L);
        PdfService service = new PdfService(repository, mock(PdfRenderer.class), mock(UsageMetricService.class));

        var page = service.history("owner@test", 8L, 2, 1);

        assertThat(page.total()).isEqualTo(3);
        verify(repository).resume("owner@test", 8L);
        verify(repository).history("owner@test", 8L, 1, 2);
    }
}
