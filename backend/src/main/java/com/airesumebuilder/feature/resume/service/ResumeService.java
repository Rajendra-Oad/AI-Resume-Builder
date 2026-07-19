package com.airesumebuilder.feature.resume.service;

import com.airesumebuilder.feature.resume.dto.request.CreateResumeRequest;
import com.airesumebuilder.feature.resume.dto.response.ResumeResponse;

import java.util.List;

public interface ResumeService {
    List<ResumeResponse> listResumes();

    ResumeResponse createResume(CreateResumeRequest request);

    ResumeResponse getResume(Long id);
}
