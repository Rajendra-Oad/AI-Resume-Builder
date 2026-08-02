package com.airesumebuilder.feature.admin.repository;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import com.airesumebuilder.feature.admin.service.AdminService.ActionView;
import com.airesumebuilder.feature.admin.service.AdminService.UserView;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AdminRepository {
    private final JdbcTemplate jdbc;

    public AdminRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<UserView> users(int limit, int offset) {
        return jdbc.query(
            "SELECT id,first_name,last_name,email,role,status,created_at FROM users " +
                "WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?",
            this::user,
            limit,
            offset
        );
    }

    public long userCount() {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE deleted_at IS NULL", Long.class);
        return count == null ? 0 : count;
    }

    public UserView update(String adminEmail, long id, String field, String value, String action) {
        String column = field.equals("role") ? "role" : "status";
        if (jdbc.update("UPDATE users SET " + column + "=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND deleted_at IS NULL", value, id) == 0) {
            throw new ResourceNotFoundException("User not found.");
        }
        if (column.equals("status") && !value.equals("ACTIVE")) {
            jdbc.update("UPDATE refresh_tokens SET revoked=TRUE WHERE user_id=? AND revoked=FALSE", id);
        }
        jdbc.update(
            "INSERT INTO admin_action_logs(admin_user_id,target_user_id,action,details,created_at) " +
                "SELECT id,?,?,jsonb_build_object(CAST(? AS TEXT),?),CURRENT_TIMESTAMP FROM users WHERE email=? AND deleted_at IS NULL",
            id,
            action,
            column,
            value,
            adminEmail
        );
        return get(id);
    }

    public UserView get(long id) {
        return jdbc.query(
            "SELECT id,first_name,last_name,email,role,status,created_at FROM users WHERE id=? AND deleted_at IS NULL",
            this::user,
            id
        ).stream().findFirst().orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    public String email(long id) {
        return get(id).email();
    }

    public List<ActionView> actions(int limit, int offset) {
        return jdbc.query(
            "SELECT id,admin_user_id,target_user_id,action,details,created_at FROM admin_action_logs " +
                "ORDER BY created_at DESC LIMIT ? OFFSET ?",
            this::action,
            limit,
            offset
        );
    }

    public long actionCount() {
        Long count = jdbc.queryForObject("SELECT COUNT(*) FROM admin_action_logs", Long.class);
        return count == null ? 0 : count;
    }

    private UserView user(ResultSet result, int row) throws SQLException {
        return new UserView(
            result.getLong("id"),
            result.getString("first_name"),
            result.getString("last_name"),
            result.getString("email"),
            result.getString("role"),
            result.getString("status"),
            result.getTimestamp("created_at").toInstant()
        );
    }

    private ActionView action(ResultSet result, int row) throws SQLException {
        return new ActionView(
            result.getLong("id"),
            result.getLong("admin_user_id"),
            (Long) result.getObject("target_user_id"),
            result.getString("action"),
            result.getString("details"),
            result.getTimestamp("created_at").toInstant()
        );
    }
}
