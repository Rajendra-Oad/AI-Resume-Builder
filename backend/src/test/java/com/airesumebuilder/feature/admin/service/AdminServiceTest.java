package com.airesumebuilder.feature.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.airesumebuilder.common.exception.ValidationException;
import com.airesumebuilder.feature.admin.repository.AdminRepository;
import com.airesumebuilder.feature.admin.service.AdminService.ChangeRequest;
import java.util.List;
import org.junit.jupiter.api.Test;

class AdminServiceTest {

    @Test
    void rejectsInvalidRoleBeforeWriting() {
        AdminRepository repository = mock(AdminRepository.class);

        assertThatThrownBy(() -> new AdminService(repository).role("admin@test", 2, new ChangeRequest("owner")))
            .isInstanceOf(ValidationException.class);

        verify(repository, never()).update(anyString(), anyLong(), anyString(), anyString(), anyString());
    }

    @Test
    void rejectsMissingStatusRequest() {
        AdminRepository repository = mock(AdminRepository.class);

        assertThatThrownBy(() -> new AdminService(repository).status("admin@test", 2, null))
            .isInstanceOf(ValidationException.class);
    }

    @Test
    void preventsSelfDemotionAndSelfSuspension() {
        AdminRepository repository = mock(AdminRepository.class);
        AdminService service = new AdminService(repository);
        when(repository.email(2)).thenReturn("admin@test");

        assertThatThrownBy(() -> service.role("admin@test", 2, new ChangeRequest("user")))
            .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> service.status("admin@test", 2, new ChangeRequest("suspended")))
            .isInstanceOf(ValidationException.class);
    }

    @Test
    void boundsAndCountsActionHistoryPagination() {
        AdminRepository repository = mock(AdminRepository.class);
        when(repository.actions(100, 0)).thenReturn(List.of());
        when(repository.actionCount()).thenReturn(204L);

        var page = new AdminService(repository).actions(-3, 500);

        assertThat(page.page()).isZero();
        assertThat(page.size()).isEqualTo(100);
        assertThat(page.total()).isEqualTo(204);
        verify(repository).actions(100, 0);
    }
}
