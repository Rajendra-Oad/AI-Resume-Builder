package com.airesumebuilder.feature.ai.service;

import com.airesumebuilder.common.exception.ConflictException;
import com.airesumebuilder.common.exception.ResourceNotFoundException;
import com.airesumebuilder.feature.ai.dto.request.PromptTemplateRequest;
import com.airesumebuilder.feature.ai.repository.AiPromptRepository;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiPromptAdminService {
    private final AiPromptRepository prompts;

    public AiPromptAdminService(AiPromptRepository prompts) { this.prompts = prompts; }

    @Transactional
    public void createDraft(PromptTemplateRequest request) {
        prompts.createDraft(request, prompts.nextVersion(request.workflow(), request.locale()));
    }

    @Transactional
    public void sendForReview(String workflow, int version) {
        transition(workflow, version, "DRAFT", "REVIEW");
    }

    @Transactional
    public void approve(String workflow, int version) {
        transition(workflow, version, "REVIEW", "APPROVED");
    }

    @Transactional
    public void publish(String workflow, int version) {
        String locale = prompts.locale(workflow, version);
        if (locale == null) throw new ResourceNotFoundException("Prompt template not found.");
        prompts.unpublish(workflow, locale);
        if (prompts.transition(workflow, version, "APPROVED", "PUBLISHED", Instant.now()) == 0) {
            throw new ConflictException("Only an approved prompt can be published.");
        }
    }

    private void transition(String workflow, int version, String expected, String target) {
        if (prompts.locale(workflow, version) == null) throw new ResourceNotFoundException("Prompt template not found.");
        if (prompts.transition(workflow, version, expected, target, Instant.now()) == 0) {
            throw new ConflictException("Prompt must be in " + expected + " status before moving to " + target + ".");
        }
    }
}
