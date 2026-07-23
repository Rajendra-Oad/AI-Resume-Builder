package com.airesumebuilder.feature.resume.version.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.airesumebuilder.feature.resume.version.service.ResumeVersionService;
import com.airesumebuilder.security.CurrentUser;
import java.util.List;
import org.junit.jupiter.api.Test;

class ResumeVersionControllerTest {

    @Test
    void scopesVersionHistoryToAuthenticatedOwner() {
        ResumeVersionService service = mock(ResumeVersionService.class);
        CurrentUser currentUser = mock(CurrentUser.class);
        ResumeVersionController controller = new ResumeVersionController(service, currentUser);
        when(currentUser.email()).thenReturn("owner@test");
        when(service.list("owner@test", 8, 1, 10)).thenReturn(new ResumeVersionService.VersionPage(List.of(), 1, 10, 23));

        var response = controller.list(8, 1, 10).getBody();

        assertThat(response).isNotNull();
        assertThat(response.pagination().totalElements()).isEqualTo(23);
        assertThat(response.pagination().totalPages()).isEqualTo(3);
        verify(service).list("owner@test", 8, 1, 10);
    }
}
