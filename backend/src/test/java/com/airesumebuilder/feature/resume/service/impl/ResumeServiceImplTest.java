package com.airesumebuilder.feature.resume.service.impl;

import com.airesumebuilder.feature.resume.dto.request.CreateResumeRequest;
import com.airesumebuilder.feature.resume.dto.response.ResumeResponse;
import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import com.airesumebuilder.feature.resume.entity.Resume;
import com.airesumebuilder.feature.resume.repository.ResumeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
    }
}
