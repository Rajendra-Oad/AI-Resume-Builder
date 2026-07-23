package com.airesumebuilder.integration.ai;

import com.airesumebuilder.common.exception.ValidationException;
import com.airesumebuilder.feature.ai.repository.AiPromptRepository;
import java.util.List;
import org.springframework.stereotype.Component;

/** Resolves only published, versioned prompt content from persistence. */
@Component
public class PromptManager {
    private final AiPromptRepository prompts;
    public PromptManager(AiPromptRepository prompts) { this.prompts = prompts; }
    public String resolve(String workflow, String locale) {
        List<String> instructions = prompts.findPublishedInstructions(workflow, locale == null || locale.isBlank() ? "en-US" : locale);
        if (instructions.isEmpty()) throw new ValidationException("No published AI prompt exists for this workflow.");
        return instructions.getFirst();
    }
}
