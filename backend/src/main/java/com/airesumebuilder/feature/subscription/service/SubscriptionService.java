package com.airesumebuilder.feature.subscription.service;

import com.airesumebuilder.common.exception.ValidationException;
import com.airesumebuilder.feature.subscription.repository.SubscriptionRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubscriptionService {
    private static final List<Plan> PLANS = List.of(
        new Plan("FREE", "Free", false, true),
        new Plan("PREMIUM", "Premium", true, false),
        new Plan("PRO", "Pro", true, false)
    );
    private final SubscriptionRepository repository;

    public SubscriptionService(SubscriptionRepository repository) {
        this.repository = repository;
    }

    public List<Plan> plans() {
        return PLANS;
    }

    @Transactional
    public Subscription current(String email) {
        Subscription subscription = repository.current(email);
        return subscription == null ? repository.createFree(email) : subscription;
    }

    @Transactional
    public Entitlement entitlement(String email) {
        Subscription subscription = current(email);
        return new Entitlement(subscription.plan(), "ACTIVE".equals(subscription.status()), !"FREE".equals(subscription.plan()));
    }

    @Transactional(readOnly = true)
    public SubscriptionPage history(String email, int page, int size) {
        PageRequest request = pageRequest(page, size);
        return new SubscriptionPage(
            repository.history(email, request.size(), request.offset()),
            request.page(),
            request.size(),
            repository.historyCount(email)
        );
    }

    @Transactional(readOnly = true)
    public PaymentPage payments(String email, int page, int size) {
        PageRequest request = pageRequest(page, size);
        return new PaymentPage(
            repository.payments(email, request.size(), request.offset()),
            request.page(),
            request.size(),
            repository.paymentCount(email)
        );
    }

    @Transactional
    public Subscription cancel(String email) {
        Subscription subscription = repository.current(email);
        if (subscription == null) {
            throw new ValidationException("No current subscription exists.");
        }
        if ("FREE".equals(subscription.plan())) {
            throw new ValidationException("The free plan cannot be cancelled.");
        }
        repository.cancelCurrent(email);
        return repository.createFree(email);
    }

    private PageRequest pageRequest(int page, int size) {
        int boundedPage = Math.max(0, page);
        int boundedSize = Math.min(Math.max(1, size), 100);
        return new PageRequest(boundedPage, boundedSize, boundedPage * boundedSize);
    }

    private record PageRequest(int page, int size, int offset) {}

    public record Plan(String code, String displayName, boolean paid, boolean selfServiceAvailable) {}
    public record Entitlement(String plan, boolean active, boolean premium) {}
    public record Subscription(long id, String plan, String status, boolean current, Instant startsAt, Instant endsAt) {}
    public record SubscriptionPage(List<Subscription> items, int page, int size, long total) {}
    public record Payment(long id, long subscriptionId, String plan, String provider, String reference, BigDecimal amount, String currency, String status, Instant occurredAt) {}
    public record PaymentPage(List<Payment> items, int page, int size, long total) {}
}
