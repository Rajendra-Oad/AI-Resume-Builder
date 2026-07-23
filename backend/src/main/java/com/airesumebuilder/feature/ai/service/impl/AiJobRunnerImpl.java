package com.airesumebuilder.feature.ai.service.impl;

import com.airesumebuilder.feature.ai.dto.request.AiGenerationRequest;
import com.airesumebuilder.feature.ai.service.AiJobLifecycleService;
import com.airesumebuilder.feature.ai.service.AiJobRunner;
import com.airesumebuilder.feature.ai.service.AiService;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class AiJobRunnerImpl implements AiJobRunner {
    private final AiJobLifecycleService lifecycle;
    private final AiService ai;

    public AiJobRunnerImpl(AiJobLifecycleService lifecycle, AiService ai) {
        this.lifecycle = lifecycle;
        this.ai = ai;
    }

    @Override
    @Async("aiTaskExecutor")
    public void run(String id, String email, AiGenerationRequest request) {
        if (!lifecycle.start(id)) return;
        try {
            var result = ai.generate(email, request);
            lifecycle.succeed(id, result.content());
        } catch (Exception exception) {
            lifecycle.fail(id);
        }
    }
}
