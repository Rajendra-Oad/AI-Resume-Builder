package com.airesumebuilder.feature.job.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import java.util.List;
import org.junit.jupiter.api.Test;

class JobServiceTest {
    @Test
    void computesBoundedOffset() {
        JobRepository repository = mock(JobRepository.class);
        when(repository.list("owner@test", 25, 50)).thenReturn(List.of());
        when(repository.count("owner@test")).thenReturn(70L);

        var page = new JobService(repository).list("owner@test", 2, 25);

        assertThat(page.page()).isEqualTo(2);
        assertThat(page.size()).isEqualTo(25);
        assertThat(page.total()).isEqualTo(70);
        verify(repository).list("owner@test", 25, 50);
    }
}
