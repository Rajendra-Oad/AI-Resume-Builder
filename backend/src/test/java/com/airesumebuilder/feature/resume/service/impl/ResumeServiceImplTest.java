package com.airesumebuilder.feature.resume.service.impl;

import com.airesumebuilder.feature.resume.dto.request.CreateResumeRequest;
import com.airesumebuilder.feature.resume.dto.response.ResumeResponse;
import com.airesumebuilder.feature.resume.entity.Resume;
import com.airesumebuilder.feature.resume.repository.ResumeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ResumeServiceImplTest {

    @Mock
    private ResumeRepository resumeRepository;

    @InjectMocks
    private ResumeServiceImpl resumeService;

    @Test
    void createResume_shouldPersistResumeAndReturnResponse() {
        ResumeResponse response = resumeService.createResume(new CreateResumeRequest("Senior Engineer", "Experienced backend engineer"));

        ArgumentCaptor<Resume> resumeCaptor = ArgumentCaptor.forClass(Resume.class);
        verify(resumeRepository).save(resumeCaptor.capture());

        Resume savedResume = resumeCaptor.getValue();
        assertEquals("Senior Engineer", savedResume.getTitle());
        assertEquals("Experienced backend engineer", savedResume.getSummary());
        assertEquals("Senior Engineer", response.title());
    }
}
