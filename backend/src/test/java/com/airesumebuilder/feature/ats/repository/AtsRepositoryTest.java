package com.airesumebuilder.feature.ats.repository;

import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class AtsRepositoryTest {
    @Test
    void refreshesJobMatchWhenSavingAnAtsReport() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(contains("INSERT INTO ats_reports"), eq(Long.class), eq(7L), eq(9L), eq(new BigDecimal("82.50"))))
            .thenReturn(31L);
        AtsRepository repository = new AtsRepository(jdbc);

        repository.save(
            new AtsRepository.AnalysisInput(7L, 9L, "resume", "job"),
            new BigDecimal("82.50"),
            List.of()
        );

        verify(jdbc).update(
            contains("ON CONFLICT (resume_id,job_description_id) DO UPDATE"),
            eq(7L),
            eq(9L),
            eq(new BigDecimal("82.50"))
        );
    }
}
