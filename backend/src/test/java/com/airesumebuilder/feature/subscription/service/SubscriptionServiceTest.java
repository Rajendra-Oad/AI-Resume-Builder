package com.airesumebuilder.feature.subscription.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.airesumebuilder.common.exception.ValidationException;
import com.airesumebuilder.feature.subscription.repository.SubscriptionRepository;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class SubscriptionServiceTest {

    @Test
    void provisionsFreePlanWhenNoneExists() {
        SubscriptionRepository repository = mock(SubscriptionRepository.class);
        var free = subscription(1, "FREE");
        when(repository.createFree("u@test")).thenReturn(free);

        assertThat(new SubscriptionService(repository).current("u@test")).isSameAs(free);
    }

    @Test
    void resolvesPremiumEntitlementFromCurrentServerState() {
        SubscriptionRepository repository = mock(SubscriptionRepository.class);
        when(repository.current("u@test")).thenReturn(subscription(2, "PREMIUM"));

        var entitlement = new SubscriptionService(repository).entitlement("u@test");

        assertThat(entitlement.plan()).isEqualTo("PREMIUM");
        assertThat(entitlement.active()).isTrue();
        assertThat(entitlement.premium()).isTrue();
    }

    @Test
    void refusesToCancelFreePlan() {
        SubscriptionRepository repository = mock(SubscriptionRepository.class);
        when(repository.current("u@test")).thenReturn(subscription(1, "FREE"));

        assertThatThrownBy(() -> new SubscriptionService(repository).cancel("u@test"))
            .isInstanceOf(ValidationException.class);
        verify(repository, never()).cancelCurrent(anyString());
    }

    @Test
    void cancelsPaidPlanThenMakesFreePlanCurrent() {
        SubscriptionRepository repository = mock(SubscriptionRepository.class);
        var premium = subscription(2, "PREMIUM");
        var free = subscription(3, "FREE");
        when(repository.current("u@test")).thenReturn(premium);
        when(repository.createFree("u@test")).thenReturn(free);

        assertThat(new SubscriptionService(repository).cancel("u@test")).isSameAs(free);
        verify(repository).cancelCurrent("u@test");
    }

    @Test
    void boundsAndCountsPaymentHistory() {
        SubscriptionRepository repository = mock(SubscriptionRepository.class);
        when(repository.payments("u@test", 100, 0)).thenReturn(List.of());
        when(repository.paymentCount("u@test")).thenReturn(102L);

        var result = new SubscriptionService(repository).payments("u@test", -1, 900);

        assertThat(result.page()).isZero();
        assertThat(result.size()).isEqualTo(100);
        assertThat(result.total()).isEqualTo(102);
    }

    private SubscriptionService.Subscription subscription(long id, String plan) {
        return new SubscriptionService.Subscription(id, plan, "ACTIVE", true, Instant.now(), null);
    }
}
