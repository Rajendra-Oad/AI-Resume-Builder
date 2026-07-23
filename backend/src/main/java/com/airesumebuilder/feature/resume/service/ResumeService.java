package com.airesumebuilder.feature.resume.service;

import com.airesumebuilder.feature.resume.dto.request.CreateResumeRequest;
import com.airesumebuilder.feature.resume.dto.request.UpdateResumeRequest;
import com.airesumebuilder.feature.resume.dto.request.PatchResumeRequest;
import com.airesumebuilder.feature.resume.dto.response.ResumeResponse;
import com.airesumebuilder.feature.resume.dto.response.DeletedResumeResponse;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ResumeService {
    Page<ResumeResponse> listResumes(String ownerEmail, Pageable pageable);

    ResumeResponse createResume(String ownerEmail, CreateResumeRequest request);

    ResumeResponse getResume(String ownerEmail, Long id);

    ResumeResponse updateResume(String ownerEmail, Long id, UpdateResumeRequest request);
    ResumeResponse patchResume(String ownerEmail, Long id, PatchResumeRequest request);
    ResumeResponse publishResume(String ownerEmail, Long id);

    ResumeResponse duplicateResume(String ownerEmail, Long id);

    Page<DeletedResumeResponse> listDeletedResumes(String ownerEmail, Pageable pageable);

    ResumeResponse restoreResume(String ownerEmail, Long id);

    void deleteResume(String ownerEmail, Long id);
}
