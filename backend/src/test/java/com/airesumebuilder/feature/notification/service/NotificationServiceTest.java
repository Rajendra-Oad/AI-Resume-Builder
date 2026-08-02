package com.airesumebuilder.feature.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import java.util.List;
import org.junit.jupiter.api.Test;

class NotificationServiceTest {
    @Test
    void boundsPageAndSizeBeforeQuerying() {
        NotificationRepository repository = mock(NotificationRepository.class);
        when(repository.list("owner@test", true, 100, 0)).thenReturn(List.of());
        when(repository.count("owner@test", true)).thenReturn(201L);

        var page = new NotificationService(repository).list("owner@test", true, -3, 500);

        assertThat(page.page()).isZero();
        assertThat(page.size()).isEqualTo(100);
        assertThat(page.total()).isEqualTo(201);
        verify(repository).list("owner@test", true, 100, 0);
    }
}
