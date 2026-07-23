package com.airesumebuilder.feature.subscription.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.airesumebuilder.feature.subscription.service.SubscriptionService;
import com.airesumebuilder.security.CurrentUser;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class SubscriptionControllerTest {

    @Test
    void scopesPaginatedHistoryToCurrentUser() {
        SubscriptionService service = mock(SubscriptionService.class);
        CurrentUser currentUser = mock(CurrentUser.class);
        SubscriptionController controller = new SubscriptionController(service, currentUser);
        var subscription = new SubscriptionService.Subscription(1, "FREE", "ACTIVE", true, Instant.now(), null);
        when(currentUser.email()).thenReturn("owner@test");
        when(service.history("owner@test", 1, 10))
            .thenReturn(new SubscriptionService.SubscriptionPage(List.of(subscription), 1, 10, 22));

        var response = controller.history(1, 10).getBody();

        assertThat(response).isNotNull();
        assertThat(response.data()).containsExactly(subscription);
        assertThat(response.pagination().totalElements()).isEqualTo(22);
        assertThat(response.pagination().totalPages()).isEqualTo(3);
        verify(service).history("owner@test", 1, 10);
    }

    @Test
    void scopesCancellationToCurrentUser() {
        SubscriptionService service = mock(SubscriptionService.class);
        CurrentUser currentUser = mock(CurrentUser.class);
        SubscriptionController controller = new SubscriptionController(service, currentUser);
        var free = new SubscriptionService.Subscription(2, "FREE", "ACTIVE", true, Instant.now(), null);
        when(currentUser.email()).thenReturn("owner@test");
        when(service.cancel("owner@test")).thenReturn(free);

        assertThat(controller.cancel().getBody().data()).isEqualTo(free);
        verify(service).cancel("owner@test");
    }
}
