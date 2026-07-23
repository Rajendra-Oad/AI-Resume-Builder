package com.airesumebuilder.feature.audit.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.airesumebuilder.feature.audit.service.AuditService;
import com.airesumebuilder.security.CurrentUser;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class AuditControllerTest {

    @Test
    void returnsOnlyTheCurrentUsersPaginatedAuditEntries() {
        AuditService service = mock(AuditService.class);
        CurrentUser currentUser = mock(CurrentUser.class);
        AuditController controller = new AuditController(service, currentUser);
        AuditService.AuditEntry entry = new AuditService.AuditEntry(
            7L,
            "Resume",
            12L,
            "UPDATED",
            "{}",
            "{\"title\":\"Updated\"}",
            null,
            Instant.parse("2026-07-21T00:00:00Z")
        );

        when(currentUser.email()).thenReturn("owner@example.com");
        when(service.listMine("owner@example.com", 1, 10))
            .thenReturn(new AuditService.Page(List.of(entry), 1, 10, 21));

        var response = controller.list(1, 10).getBody();

        assertThat(response).isNotNull();
        assertThat(response.success()).isTrue();
        assertThat(response.data()).containsExactly(entry);
        assertThat(response.pagination().page()).isEqualTo(1);
        assertThat(response.pagination().totalElements()).isEqualTo(21);
        assertThat(response.pagination().totalPages()).isEqualTo(3);
        verify(service).listMine("owner@example.com", 1, 10);
    }
}
