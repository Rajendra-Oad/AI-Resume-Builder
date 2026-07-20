package com.airesumebuilder.feature.resume.service.impl;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import com.airesumebuilder.feature.resume.dto.request.CreateResumeRequest;
import com.airesumebuilder.feature.resume.dto.request.UpdateResumeRequest;
import com.airesumebuilder.feature.resume.dto.response.ResumeResponse;
import com.airesumebuilder.feature.resume.entity.Resume;
import com.airesumebuilder.feature.resume.repository.ResumeRepository;
import com.airesumebuilder.feature.resume.service.ResumeService;
import com.airesumebuilder.events.ResumeCreatedEvent;
import com.airesumebuilder.events.ResumeDeletedEvent;
import com.airesumebuilder.events.ResumeUpdatedEvent;
import java.util.Map;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Service
public class ResumeServiceImpl implements ResumeService {

    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    public ResumeServiceImpl(ResumeRepository resumeRepository, UserRepository userRepository, ApplicationEventPublisher eventPublisher) {
        this.resumeRepository = resumeRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ResumeResponse> listResumes(String ownerEmail, Pageable pageable) {
        return resumeRepository.findByUserEmailAndDeletedAtIsNull(ownerEmail, pageable).map(this::toResponse);
    }

    @Override
    @Transactional
    public ResumeResponse createResume(String ownerEmail, CreateResumeRequest request) {
        User owner = findOwner(ownerEmail);

        Resume resume = new Resume();
        resume.setTitle(request.title());
        resume.setSummary(request.summary());
        resume.setStatus("DRAFT");
        resume.setUser(owner);

        Resume savedResume = resumeRepository.save(resume);
        eventPublisher.publishEvent(new ResumeCreatedEvent(savedResume.getId(), owner.getId()));
        return toResponse(savedResume);
    }

    @Override
    @Transactional(readOnly = true)
    public ResumeResponse getResume(String ownerEmail, Long id) {
        return toResponse(findResume(ownerEmail, id));
    }

    @Override
    @Transactional
    public ResumeResponse updateResume(String ownerEmail, Long id, UpdateResumeRequest request) {
        Resume resume = findResume(ownerEmail, id);
        Map<String,Object> before = snapshot(resume);
        resume.setTitle(request.title());
        resume.setSummary(request.summary());
        Resume saved = resumeRepository.save(resume);
        eventPublisher.publishEvent(new ResumeUpdatedEvent(saved.getId(), saved.getUser().getId(), before, snapshot(saved)));
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteResume(String ownerEmail, Long id) {
        Resume resume = findResume(ownerEmail, id);
        Map<String,Object> before = snapshot(resume);
        resume.setDeletedAt(java.time.Instant.now());
        resumeRepository.save(resume);
        eventPublisher.publishEvent(new ResumeDeletedEvent(resume.getId(), resume.getUser().getId(), before));
    }

    private User findOwner(String ownerEmail) {
        return userRepository.findByEmailAndDeletedAtIsNull(ownerEmail)
            .orElseThrow(() -> new ResourceNotFoundException("User account not found."));
    }

    private Resume findResume(String ownerEmail, Long id) {
        return resumeRepository.findByIdAndUserEmailAndDeletedAtIsNull(id, ownerEmail)
            .orElseThrow(() -> new ResourceNotFoundException("Resume not found."));
    }

    private ResumeResponse toResponse(Resume resume) {
        return new ResumeResponse(resume.getId(), resume.getTitle(), resume.getSummary());
    }

    private Map<String,Object> snapshot(Resume resume) {
        Map<String,Object> state = new java.util.LinkedHashMap<>();
        state.put("title", resume.getTitle()); state.put("summary", resume.getSummary());
        state.put("targetJobTitle", resume.getTargetJobTitle()); state.put("status", resume.getStatus());
        return state;
    }
}
