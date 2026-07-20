package com.airesumebuilder.integration.ai;

import com.airesumebuilder.common.exception.ValidationException;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Resolves only published, versioned prompt content from persistence. */
@Component
public class PromptManager {
    private final JdbcTemplate jdbc;
    public PromptManager(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public String resolve(String workflow, String locale) {
        List<String> prompts = jdbc.query("SELECT system_instruction FROM ai_prompt_templates WHERE workflow=? AND locale=? AND status='PUBLISHED' ORDER BY version DESC LIMIT 1", (rs, row) -> rs.getString(1), workflow, locale == null || locale.isBlank() ? "en-US" : locale);
        if (prompts.isEmpty()) throw new ValidationException("No published AI prompt exists for this workflow.");
        return prompts.getFirst();
    }
}
