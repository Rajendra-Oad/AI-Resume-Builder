package com.airesumebuilder.integration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.airesumebuilder.events.ResumeCreatedEvent;
import com.airesumebuilder.events.ResumeUpdatedEvent;
import com.airesumebuilder.feature.audit.listener.ResumeAuditListener;
import com.airesumebuilder.feature.audit.service.AuditService;
import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import com.airesumebuilder.feature.resume.dto.request.CreateResumeRequest;
import com.airesumebuilder.feature.resume.dto.request.UpdateResumeRequest;
import com.airesumebuilder.feature.resume.entity.Resume;
import com.airesumebuilder.feature.resume.repository.ResumeRepository;
import com.airesumebuilder.feature.resume.service.impl.ResumeServiceImpl;
import com.airesumebuilder.feature.resume.version.service.ResumeVersionService;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

class CrossModuleWorkflowTest {

    @Test
    void resumeCreateAndUpdateProduceVersionsAndAuditEvents() {
        ResumeRepository resumes = mock(ResumeRepository.class);
        UserRepository users = mock(UserRepository.class);
        ResumeVersionService versions = mock(ResumeVersionService.class);
        AuditService audit = mock(AuditService.class);
        ResumeAuditListener auditListener = new ResumeAuditListener(audit);
        ApplicationEventPublisher events = event -> {
            if (event instanceof ResumeCreatedEvent created) auditListener.created(created);
            if (event instanceof ResumeUpdatedEvent updated) auditListener.updated(updated);
        };
        ResumeServiceImpl service = new ResumeServiceImpl(resumes, users, events, versions);
        User owner = new User();
        owner.setEmail("owner@test");
        ReflectionTestUtils.setField(owner, "id", 4L);
        when(users.findByEmailAndDeletedAtIsNull("owner@test")).thenReturn(Optional.of(owner));
        when(resumes.save(any(Resume.class))).thenAnswer(invocation -> {
            Resume resume = invocation.getArgument(0);
            if (resume.getId() == null) ReflectionTestUtils.setField(resume, "id", 12L);
            return resume;
        });

        service.createResume("owner@test", new CreateResumeRequest("Initial", "Initial summary"));

        verify(versions).snapshot(any(Resume.class), eq("USER_EDIT"), eq("Initial version"));
        verify(audit).record(4L, "Resume", 12L, "CREATED", Map.of("resumeId", 12L));

        Resume stored = new Resume();
        ReflectionTestUtils.setField(stored, "id", 12L);
        stored.setUser(owner);
        stored.setTitle("Initial");
        stored.setSummary("Initial summary");
        stored.setStatus("DRAFT");
        when(resumes.findByIdAndUserEmailAndDeletedAtIsNull(12L, "owner@test")).thenReturn(Optional.of(stored));

        service.updateResume("owner@test", 12L, new UpdateResumeRequest("Updated", "Updated summary"));

        verify(versions).snapshot(stored, "USER_EDIT", "Saved edit");
        verify(audit).recordChange(
            eq(4L), eq("Resume"), eq(12L), eq("UPDATED"),
            eq(state("Initial", "Initial summary")),
            eq(state("Updated", "Updated summary"))
        );
    }

    private Map<String, Object> state(String title, String summary) {
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("title", title);
        state.put("summary", summary);
        state.put("targetJobTitle", null);
        state.put("fullName", null);
        state.put("status", "DRAFT");
        return state;
    }
}
