package com.airesumebuilder.feature.resume.version.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.airesumebuilder.events.ResumeUpdatedEvent;
import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.resume.entity.Resume;
import com.airesumebuilder.feature.resume.repository.ResumeRepository;
import com.airesumebuilder.feature.resume.version.repository.ResumeVersionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

class ResumeVersionServiceTest {

    @Test
    void snapshotsStructuredResumeState() {
        ResumeVersionRepository versions = mock(ResumeVersionRepository.class);
        ResumeVersionService service = service(versions, mock(ResumeRepository.class), mock(ApplicationEventPublisher.class));
        Resume resume = resume(8L, "Current", "Summary");
        when(versions.create(eq(8L), eq("USER_EDIT"), eq("Saved edit"), contains("Current"))).thenReturn(4L);

        assertThat(service.snapshot(resume, "USER_EDIT", "Saved edit")).isEqualTo(4L);
        verify(versions).create(eq(8L), eq("USER_EDIT"), eq("Saved edit"), contains("\"sections\":[]"));
    }

    @Test
    void boundsVersionHistoryPagination() {
        ResumeVersionRepository versions = mock(ResumeVersionRepository.class);
        when(versions.list("owner@test", 8, 100, 0)).thenReturn(List.of());
        when(versions.count("owner@test", 8)).thenReturn(205L);

        var page = service(versions, mock(ResumeRepository.class), mock(ApplicationEventPublisher.class))
            .list("owner@test", 8, -2, 500);

        assertThat(page.page()).isZero();
        assertThat(page.size()).isEqualTo(100);
        assertThat(page.total()).isEqualTo(205);
    }

    @Test
    void restoreCreatesANewRollbackVersionAndAuditEvent() {
        ResumeVersionRepository versions = mock(ResumeVersionRepository.class);
        ResumeRepository resumes = mock(ResumeRepository.class);
        ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
        ResumeVersionService service = service(versions, resumes, events);
        Resume resume = resume(8L, "Current", "Current summary");
        var summary = new ResumeVersionService.VersionSummary(3, 8, 2, "USER_EDIT", "Saved edit", Instant.now());
        String content = "{\"title\":\"Earlier\",\"summary\":\"Earlier summary\",\"targetJobTitle\":null,\"status\":\"DRAFT\",\"sections\":[]}";
        when(resumes.findByIdAndUserEmailAndDeletedAtIsNull(8L, "owner@test")).thenReturn(Optional.of(resume));
        when(resumes.save(resume)).thenReturn(resume);
        when(versions.get("owner@test", 8, 3)).thenReturn(new ResumeVersionRepository.VersionRecord(summary, content));

        var restored = service.restore("owner@test", 8, 3);

        assertThat(restored.title()).isEqualTo("Earlier");
        assertThat(resume.getSummary()).isEqualTo("Earlier summary");
        verify(versions).create(eq(8L), eq("ROLLBACK"), eq("Restored from version 2"), contains("Earlier"));
        verify(events).publishEvent(org.mockito.ArgumentMatchers.any(ResumeUpdatedEvent.class));
    }

    private ResumeVersionService service(ResumeVersionRepository versions, ResumeRepository resumes, ApplicationEventPublisher events) {
        return new ResumeVersionService(versions, resumes, new ObjectMapper(), events);
    }

    private Resume resume(long id, String title, String summary) {
        User owner = new User();
        ReflectionTestUtils.setField(owner, "id", 2L);
        Resume resume = new Resume();
        ReflectionTestUtils.setField(resume, "id", id);
        resume.setUser(owner);
        resume.setTitle(title);
        resume.setSummary(summary);
        resume.setStatus("DRAFT");
        return resume;
    }
}
