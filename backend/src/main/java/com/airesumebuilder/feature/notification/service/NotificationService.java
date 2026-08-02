package com.airesumebuilder.feature.notification.service;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
    private final NotificationRepository repository;

    public NotificationService(NotificationRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Page list(String email, boolean unread, int page, int size) {
        int boundedPage = Math.max(0, page);
        int boundedSize = Math.min(Math.max(1, size), 100);
        return new Page(repository.list(email, unread, boundedSize, boundedPage * boundedSize),
            boundedPage, boundedSize, repository.count(email, unread));
    }

    @Transactional
    public Item read(String email, long id) {
        return repository.read(email, id);
    }

    @Transactional
    public int readAll(String email) {
        return repository.readAll(email);
    }

    @Transactional(readOnly = true)
    public Preferences preferences(String email) {
        return repository.preferences(email);
    }

    @Transactional
    public Preferences updatePreferences(String email, Preferences preferences) {
        return repository.updatePreferences(email, preferences);
    }

    public record Item(long id, String type, String title, String body, String status, Instant readAt, Instant createdAt) {}
    public record Page(List<Item> items, int page, int size, long total) {}
    public record Preferences(boolean emailEnabled, boolean inAppEnabled, boolean jobAlertsEnabled, boolean aiUpdatesEnabled) {}
}

@Repository
class NotificationRepository {
    private final JdbcTemplate jdbc;

    NotificationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    List<NotificationService.Item> list(String email, boolean unread, int limit, int offset) {
        return jdbc.query(
            "SELECT n.* FROM notifications n JOIN users u ON u.id=n.user_id WHERE u.email=?" +
                (unread ? " AND n.read_at IS NULL" : "") + " ORDER BY n.created_at DESC,n.id DESC LIMIT ? OFFSET ?",
            this::map,
            email, limit, offset
        );
    }

    long count(String email, boolean unread) {
        Long count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM notifications n JOIN users u ON u.id=n.user_id WHERE u.email=?" +
                (unread ? " AND n.read_at IS NULL" : ""), Long.class, email);
        return count == null ? 0 : count;
    }

    NotificationService.Item read(String email, long id) {
        if (jdbc.update(
            "UPDATE notifications n SET status='READ',read_at=COALESCE(n.read_at,CURRENT_TIMESTAMP) " +
                "FROM users u WHERE u.id=n.user_id AND u.email=? AND n.id=?",
            email,
            id
        ) == 0) {
            throw new ResourceNotFoundException("Notification not found.");
        }
        return jdbc.query(
            "SELECT n.* FROM notifications n JOIN users u ON u.id=n.user_id WHERE u.email=? AND n.id=?",
            this::map,
            email,
            id
        ).getFirst();
    }

    int readAll(String email) {
        return jdbc.update(
            "UPDATE notifications n SET status='READ',read_at=COALESCE(n.read_at,CURRENT_TIMESTAMP) " +
                "FROM users u WHERE u.id=n.user_id AND u.email=? AND n.read_at IS NULL",
            email
        );
    }

    NotificationService.Preferences preferences(String email) {
        return jdbc.query(
            "SELECT p.* FROM user_notification_preferences p JOIN users u ON u.id=p.user_id WHERE u.email=?",
            (org.springframework.jdbc.core.RowMapper<NotificationService.Preferences>) this::preferences,
            email
        ).stream().findFirst().orElse(new NotificationService.Preferences(true, true, true, true));
    }

    NotificationService.Preferences updatePreferences(String email, NotificationService.Preferences preferences) {
        jdbc.update(
            "INSERT INTO user_notification_preferences (user_id,email_enabled,in_app_enabled,job_alerts_enabled,ai_updates_enabled) " +
                "SELECT id,?,?,?,? FROM users WHERE email=? ON CONFLICT (user_id) DO UPDATE SET " +
                "email_enabled=EXCLUDED.email_enabled,in_app_enabled=EXCLUDED.in_app_enabled," +
                "job_alerts_enabled=EXCLUDED.job_alerts_enabled,ai_updates_enabled=EXCLUDED.ai_updates_enabled",
            preferences.emailEnabled(),
            preferences.inAppEnabled(),
            preferences.jobAlertsEnabled(),
            preferences.aiUpdatesEnabled(),
            email
        );
        return preferences(email);
    }

    private NotificationService.Preferences preferences(ResultSet result, int row) throws SQLException {
        return new NotificationService.Preferences(
            result.getBoolean("email_enabled"),
            result.getBoolean("in_app_enabled"),
            result.getBoolean("job_alerts_enabled"),
            result.getBoolean("ai_updates_enabled")
        );
    }

    private NotificationService.Item map(ResultSet result, int row) throws SQLException {
        Timestamp readAt = result.getTimestamp("read_at");
        return new NotificationService.Item(
            result.getLong("id"),
            result.getString("type"),
            result.getString("title"),
            result.getString("body"),
            result.getString("status"),
            readAt == null ? null : readAt.toInstant(),
            result.getTimestamp("created_at").toInstant()
        );
    }
}
