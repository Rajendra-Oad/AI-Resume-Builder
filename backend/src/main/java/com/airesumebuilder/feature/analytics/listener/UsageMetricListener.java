package com.airesumebuilder.feature.analytics.listener;

import com.airesumebuilder.events.ResumeCreatedEvent;
import com.airesumebuilder.feature.analytics.service.UsageMetricService;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class UsageMetricListener {
    private final UsageMetricService metrics;

    public UsageMetricListener(UsageMetricService metrics) {
        this.metrics = metrics;
    }

    @EventListener
    public void resumeCreated(ResumeCreatedEvent event) {
        metrics.increment(UsageMetricService.RESUME_CREATED);
    }
}
