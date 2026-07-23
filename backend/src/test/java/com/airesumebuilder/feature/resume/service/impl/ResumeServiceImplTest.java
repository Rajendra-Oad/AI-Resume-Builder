package com.airesumebuilder.feature.resume.service.impl;

import com.airesumebuilder.feature.resume.dto.request.CreateResumeRequest;
import com.airesumebuilder.feature.resume.dto.response.ResumeResponse;
import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import com.airesumebuilder.feature.resume.entity.Resume;
import com.airesumebuilder.feature.resume.repository.ResumeRepository;
import com.airesumebuilder.feature.resume.version.service.ResumeVersionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;
import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import com.airesumebuilder.common.exception.ValidationException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResumeServiceImplTest {

    @Mock
    private ResumeRepository resumeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private ResumeVersionService versionService;

    @InjectMocks
    private ResumeServiceImpl resumeService;

    @Test
    void createResume_shouldPersistResumeAndReturnResponse() {
        User owner = new User();
        owner.setEmail("user@example.com");
        when(userRepository.findByEmailAndDeletedAtIsNull("user@example.com")).thenReturn(Optional.of(owner));
        when(resumeRepository.save(any(Resume.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResumeResponse response = resumeService.createResume("user@example.com", new CreateResumeRequest("Senior Engineer", "Experienced backend engineer"));

        ArgumentCaptor<Resume> resumeCaptor = ArgumentCaptor.forClass(Resume.class);
        verify(resumeRepository).save(resumeCaptor.capture());

        Resume savedResume = resumeCaptor.getValue();
        assertEquals("Senior Engineer", savedResume.getTitle());
        assertEquals("Experienced backend engineer", savedResume.getSummary());
        assertEquals(owner, savedResume.getUser());
        assertEquals("Senior Engineer", response.title());
        verify(versionService).snapshot(savedResume, "USER_EDIT", "Initial version");
    }

    @Test
    void duplicateResume_shouldCreateIndependentDraftWithAllEditableFields() {
        User owner = new User();
        owner.setEmail("user@example.com");
        Resume source = new Resume();
        source.setUser(owner);
        source.setTitle("Backend Engineer");
        source.setSummary("Distributed systems specialist");
        source.setTargetJobTitle("Staff Engineer");
        source.setContactEmail("user@example.com");
        source.setPhone("1234567890");
        source.setLocation("Bengaluru");
        source.setGithubUrl("github.com/user");
        source.setLinkedinUrl("linkedin.com/in/user");
        source.setSkillsContent("Java, Spring");
        source.setExperienceContent("Built resilient services");
        source.setProjectsContent("Platform migration");
        source.setEducationContent("B.Tech");
        source.setCertificationsContent("Cloud certification");
        source.setLanguagesContent("English");
        source.setFontFamily("TIMES");
        source.setFontSize(new BigDecimal("11.5"));
        source.setLineSpacing(new BigDecimal("1.40"));
        source.setSectionSpacing(16);
        source.setPageMargin(36);
        source.setStatus("PUBLISHED");

        when(resumeRepository.findByIdAndUserEmailAndDeletedAtIsNull(9L, "user@example.com"))
            .thenReturn(Optional.of(source));
        when(resumeRepository.save(any(Resume.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResumeResponse response = resumeService.duplicateResume("user@example.com", 9L);

        ArgumentCaptor<Resume> captor = ArgumentCaptor.forClass(Resume.class);
        verify(resumeRepository).save(captor.capture());
        Resume copy = captor.getValue();
        assertEquals("Backend Engineer (Copy)", copy.getTitle());
        assertEquals("DRAFT", copy.getStatus());
        assertEquals(source.getSummary(), copy.getSummary());
        assertEquals(source.getExperienceContent(), copy.getExperienceContent());
        assertEquals(source.getFontFamily(), copy.getFontFamily());
        assertEquals(source.getPageMargin(), copy.getPageMargin());
        assertEquals(owner, copy.getUser());
        assertEquals("Backend Engineer (Copy)", response.title());
        verify(versionService).snapshot(copy, "USER_EDIT", "Duplicated from Backend Engineer");
    }

    @Test
    void restoreResume_shouldReactivateResumeInsideRecoveryWindow() {
        User owner = new User();
        owner.setEmail("user@example.com");
        Resume deleted = new Resume();
        deleted.setUser(owner);
        deleted.setTitle("Recover me");
        deleted.setDeletedAt(java.time.Instant.now().minus(java.time.Duration.ofDays(5)));
        when(resumeRepository.findByIdAndUserEmailAndDeletedAtIsNotNull(17L, "user@example.com"))
            .thenReturn(Optional.of(deleted));
        when(resumeRepository.save(deleted)).thenReturn(deleted);

        ResumeResponse response = resumeService.restoreResume("user@example.com", 17L);

        assertNull(deleted.getDeletedAt());
        assertEquals("Recover me", response.title());
        verify(versionService).snapshot(deleted, "ROLLBACK", "Restored from Recently Deleted");
    }

    @Test
    void restoreResume_shouldRejectExpiredRecoveryWindow() {
        User owner = new User();
        owner.setEmail("user@example.com");
        Resume expired = new Resume();
        expired.setUser(owner);
        expired.setTitle("Expired");
        expired.setDeletedAt(java.time.Instant.now().minus(java.time.Duration.ofDays(31)));
        when(resumeRepository.findByIdAndUserEmailAndDeletedAtIsNotNull(18L, "user@example.com"))
            .thenReturn(Optional.of(expired));

        assertThrows(ValidationException.class, () -> resumeService.restoreResume("user@example.com", 18L));
    }
}
