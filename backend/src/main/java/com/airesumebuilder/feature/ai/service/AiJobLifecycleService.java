package com.airesumebuilder.feature.ai.service;

import com.airesumebuilder.feature.ai.repository.AiJobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiJobLifecycleService {
    private final AiJobRepository jobs;

    public AiJobLifecycleService(AiJobRepository jobs) { this.jobs = jobs; }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void create(String id, Long userId, String workflow) { jobs.create(id, userId, workflow); }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean start(String id) { return jobs.markProcessing(id) == 1; }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void succeed(String id, String result) { jobs.markSucceeded(id, result); }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void fail(String id) { jobs.markFailed(id, "Generation failed."); }
}
