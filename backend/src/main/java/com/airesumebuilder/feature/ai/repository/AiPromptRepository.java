package com.airesumebuilder.feature.ai.repository;

import com.airesumebuilder.feature.ai.dto.request.PromptTemplateRequest;
import java.time.Instant;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AiPromptRepository {
    private final JdbcTemplate jdbc;

    public AiPromptRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public int nextVersion(String workflow, String locale) {
        Integer version = jdbc.queryForObject(
            "SELECT COALESCE(MAX(version),0)+1 FROM ai_prompt_templates WHERE workflow=? AND locale=?",
            Integer.class,
            workflow,
            locale
        );
        return version == null ? 1 : version;
    }

    public void createDraft(PromptTemplateRequest request, int version) {
        jdbc.update(
            "INSERT INTO ai_prompt_templates (workflow,version,locale,status,system_instruction,category,created_at) VALUES (?,?,?,?,?,?,?)",
            request.workflow(), version, request.locale(), "DRAFT", request.systemInstruction(), request.category(), Instant.now()
        );
    }

    public int transition(String workflow, int version, String expectedStatus, String newStatus, Instant transitionedAt) {
        String timestampAssignment = switch (newStatus) {
            case "REVIEW" -> ",reviewed_at=?";
            case "PUBLISHED" -> ",published_at=?";
            default -> "";
        };
        if (timestampAssignment.isEmpty()) {
            return jdbc.update(
                "UPDATE ai_prompt_templates SET status=? WHERE workflow=? AND version=? AND status=?",
                newStatus, workflow, version, expectedStatus
            );
        }
        return jdbc.update(
            "UPDATE ai_prompt_templates SET status=?" + timestampAssignment + " WHERE workflow=? AND version=? AND status=?",
            newStatus, transitionedAt, workflow, version, expectedStatus
        );
    }

    public void unpublish(String workflow, String locale) {
        jdbc.update(
            "UPDATE ai_prompt_templates SET status='APPROVED' WHERE workflow=? AND locale=? AND status='PUBLISHED'",
            workflow,
            locale
        );
    }

    public List<String> findPublishedInstructions(String workflow, String locale) {
        return jdbc.query(
            "SELECT system_instruction FROM ai_prompt_templates WHERE workflow=? AND locale=? AND status='PUBLISHED' ORDER BY version DESC LIMIT 1",
            (result, row) -> result.getString(1),
            workflow,
            locale
        );
    }

    public String locale(String workflow, int version) {
        List<String> locales = jdbc.query(
            "SELECT locale FROM ai_prompt_templates WHERE workflow=? AND version=?",
            (result, row) -> result.getString(1), workflow, version
        );
        return locales.isEmpty() ? null : locales.getFirst();
    }
}
