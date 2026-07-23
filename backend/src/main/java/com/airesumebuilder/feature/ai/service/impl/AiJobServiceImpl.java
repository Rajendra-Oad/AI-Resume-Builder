package com.airesumebuilder.feature.ai.service.impl;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import com.airesumebuilder.feature.ai.dto.request.AiGenerationRequest;
import com.airesumebuilder.feature.ai.dto.response.AiJobResponse;
import com.airesumebuilder.feature.ai.repository.AiJobRepository;
import com.airesumebuilder.feature.ai.service.AiJobLifecycleService;
import com.airesumebuilder.feature.ai.service.AiJobRunner;
import com.airesumebuilder.feature.ai.service.AiJobService;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiJobServiceImpl implements AiJobService {
    private final AiJobRepository jobs;
    private final UserRepository users;
    private final AiJobRunner runner;
    private final AiJobLifecycleService lifecycle;

    public AiJobServiceImpl(AiJobRepository jobs, UserRepository users, AiJobRunner runner, AiJobLifecycleService lifecycle) {
        this.jobs = jobs;
        this.users = users;
        this.runner = runner;
        this.lifecycle = lifecycle;
    }

    public AiJobResponse submit(String email, AiGenerationRequest request) {
        Long userId = users.findByEmail(email).orElseThrow(() -> new ResourceNotFoundException("User not found.")).getId();
        String id = UUID.randomUUID().toString();
        // The insert commits before the async runner starts, preventing a create/start race.
        lifecycle.create(id, userId, request.workflow());
        runner.run(id, email, request);
        return new AiJobResponse(id, "PENDING", null, null);
    }

    @Transactional(readOnly = true)
    public AiJobResponse get(String email, String id) {
        Long userId = users.findByEmail(email).orElseThrow(() -> new ResourceNotFoundException("User not found.")).getId();
        return jobs.findOwned(id, userId).stream().findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("AI job not found."));
    }
}
