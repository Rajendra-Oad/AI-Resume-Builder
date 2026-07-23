package com.airesumebuilder.feature.ai.repository;

import com.airesumebuilder.feature.ai.dto.response.AiJobResponse;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AiJobRepository {
    private final JdbcTemplate jdbc;

    public AiJobRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void create(String id, Long userId, String workflow) {
        jdbc.update("INSERT INTO ai_jobs (id,user_id,workflow,status,created_at) VALUES (?,?,?,'PENDING',?)", id, userId, workflow, Instant.now());
    }

    public List<AiJobResponse> findOwned(String id, Long userId) {
        return jdbc.query(
            "SELECT id,status,result,error_message FROM ai_jobs WHERE id=? AND user_id=?",
            (result, row) -> new AiJobResponse(result.getString(1), result.getString(2), result.getString(3), result.getString(4)),
            id, userId
        );
    }

    public int markProcessing(String id) {
        return jdbc.update("UPDATE ai_jobs SET status='PROCESSING' WHERE id=? AND status='PENDING'", id);
    }

    public int markSucceeded(String id, String result) {
        return jdbc.update("UPDATE ai_jobs SET status='SUCCEEDED',result=?,completed_at=? WHERE id=? AND status='PROCESSING'", result, Instant.now(), id);
    }

    public int markFailed(String id, String message) {
        return jdbc.update("UPDATE ai_jobs SET status='FAILED',error_message=?,completed_at=? WHERE id=? AND status IN ('PENDING','PROCESSING')", message, Instant.now(), id);
    }
}
