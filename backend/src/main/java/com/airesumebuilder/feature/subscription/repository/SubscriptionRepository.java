package com.airesumebuilder.feature.subscription.repository;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import com.airesumebuilder.feature.subscription.service.SubscriptionService.Payment;
import com.airesumebuilder.feature.subscription.service.SubscriptionService.Subscription;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SubscriptionRepository {
    private final JdbcTemplate jdbc;

    public SubscriptionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Subscription current(String email) {
        return jdbc.query(
            "SELECT s.* FROM subscriptions s JOIN users u ON u.id=s.user_id " +
                "WHERE u.email=? AND u.deleted_at IS NULL AND s.is_current=TRUE",
            this::subscription,
            email
        ).stream().findFirst().orElse(null);
    }

    public Subscription createFree(String email) {
        int inserted = jdbc.update(
            "INSERT INTO subscriptions(user_id,plan,status,starts_at,is_current,created_at,updated_at) " +
                "SELECT id,'FREE','ACTIVE',NOW(6),TRUE,NOW(6),NOW(6) FROM users " +
                "WHERE email=? AND deleted_at IS NULL " +
                "AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id=users.id AND s.is_current=TRUE)",
            email
        );
        Subscription result = current(email);
        if (inserted == 0 && result == null) {
            throw new ResourceNotFoundException("User account not found.");
        }
        return result;
    }

    public List<Subscription> history(String email, int limit, int offset) {
        return jdbc.query(
            "SELECT s.* FROM subscriptions s JOIN users u ON u.id=s.user_id " +
                "WHERE u.email=? AND u.deleted_at IS NULL ORDER BY s.starts_at DESC LIMIT ? OFFSET ?",
            this::subscription,
            email,
            limit,
            offset
        );
    }

    public long historyCount(String email) {
        Long count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM subscriptions s JOIN users u ON u.id=s.user_id " +
                "WHERE u.email=? AND u.deleted_at IS NULL",
            Long.class,
            email
        );
        return count == null ? 0 : count;
    }

    public List<Payment> payments(String email, int limit, int offset) {
        return jdbc.query(
            "SELECT p.id,p.subscription_id,s.plan,p.provider,p.provider_reference,p.amount,p.currency,p.status,p.occurred_at " +
                "FROM payment_transactions p JOIN subscriptions s ON s.id=p.subscription_id " +
                "JOIN users u ON u.id=s.user_id WHERE u.email=? AND u.deleted_at IS NULL " +
                "ORDER BY p.occurred_at DESC LIMIT ? OFFSET ?",
            this::payment,
            email,
            limit,
            offset
        );
    }

    public long paymentCount(String email) {
        Long count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM payment_transactions p JOIN subscriptions s ON s.id=p.subscription_id " +
                "JOIN users u ON u.id=s.user_id WHERE u.email=? AND u.deleted_at IS NULL",
            Long.class,
            email
        );
        return count == null ? 0 : count;
    }

    public void cancelCurrent(String email) {
        int updated = jdbc.update(
            "UPDATE subscriptions s JOIN users u ON u.id=s.user_id " +
                "SET s.status='CANCELLED',s.is_current=FALSE,s.ends_at=NOW(6),s.updated_at=NOW(6) " +
                "WHERE u.email=? AND u.deleted_at IS NULL AND s.is_current=TRUE AND s.plan<>'FREE'",
            email
        );
        if (updated == 0) {
            throw new ResourceNotFoundException("Current paid subscription not found.");
        }
    }

    private Subscription subscription(ResultSet result, int row) throws SQLException {
        Timestamp end = result.getTimestamp("ends_at");
        return new Subscription(
            result.getLong("id"),
            result.getString("plan"),
            result.getString("status"),
            result.getBoolean("is_current"),
            result.getTimestamp("starts_at").toInstant(),
            end == null ? null : end.toInstant()
        );
    }

    private Payment payment(ResultSet result, int row) throws SQLException {
        return new Payment(
            result.getLong("id"),
            result.getLong("subscription_id"),
            result.getString("plan"),
            result.getString("provider"),
            masked(result.getString("provider_reference")),
            result.getBigDecimal("amount"),
            result.getString("currency"),
            result.getString("status"),
            result.getTimestamp("occurred_at").toInstant()
        );
    }

    private String masked(String reference) {
        if (reference == null || reference.length() <= 4) {
            return "****";
        }
        return "****" + reference.substring(reference.length() - 4);
    }
}
