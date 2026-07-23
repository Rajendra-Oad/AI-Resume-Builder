package com.airesumebuilder.feature.admin.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.airesumebuilder.feature.admin.service.AdminService;
import com.airesumebuilder.feature.audit.service.AuditService;
import com.airesumebuilder.security.CurrentUser;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class AdminControllerTest {

    @Test
    void returnsPaginatedAdminActionHistory() {
        AdminService service = mock(AdminService.class);
        AuditService auditService = mock(AuditService.class);
        CurrentUser currentUser = mock(CurrentUser.class);
        AdminController controller = new AdminController(service, auditService, currentUser);
        var action = new AdminService.ActionView(1, 2, 3L, "USER_STATUS_CHANGED", "{}", Instant.now());
        when(service.actions(1, 10)).thenReturn(new AdminService.ActionPage(List.of(action), 1, 10, 24));

        var response = controller.actions(1, 10).getBody();

        assertThat(response).isNotNull();
        assertThat(response.data()).containsExactly(action);
        assertThat(response.pagination().totalElements()).isEqualTo(24);
        assertThat(response.pagination().totalPages()).isEqualTo(3);
    }

    @Test
    void attributesStatusChangesToTheAuthenticatedAdministrator() {
        AdminService service = mock(AdminService.class);
        AuditService auditService = mock(AuditService.class);
        CurrentUser currentUser = mock(CurrentUser.class);
        AdminController controller = new AdminController(service, auditService, currentUser);
        var request = new AdminService.ChangeRequest("SUSPENDED");
        var user = new AdminService.UserView(3, "Test", "User", "user@test", "USER", "SUSPENDED", Instant.now());
        when(currentUser.email()).thenReturn("admin@test");
        when(service.status("admin@test", 3, request)).thenReturn(user);

        var response = controller.status(3, request).getBody();

        assertThat(response).isNotNull();
        assertThat(response.data()).isEqualTo(user);
        verify(service).status("admin@test", 3, request);
    }
}
