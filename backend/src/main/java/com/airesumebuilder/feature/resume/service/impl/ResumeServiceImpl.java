package com.airesumebuilder.feature.resume.service.impl;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import com.airesumebuilder.feature.resume.dto.request.CreateResumeRequest;
import com.airesumebuilder.feature.resume.dto.response.ResumeResponse;
import com.airesumebuilder.feature.resume.entity.Resume;
import com.airesumebuilder.feature.resume.repository.ResumeRepository;
import com.airesumebuilder.feature.resume.service.ResumeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ResumeServiceImpl implements ResumeService {

    private static final String DEFAULT_USER_EMAIL = "system@example.com";

    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;

    public ResumeServiceImpl(ResumeRepository resumeRepository, UserRepository userRepository) {
        this.resumeRepository = resumeRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ResumeResponse> listResumes() {
        return resumeRepository.findAll().stream()
            .map(resume -> new ResumeResponse(resume.getId(), resume.getTitle(), resume.getSummary()))
            .toList();
    }

    @Override
    @Transactional
    public ResumeResponse createResume(CreateResumeRequest request) {
        User owner = userRepository.findByEmail(DEFAULT_USER_EMAIL)
            .orElseGet(() -> {
                User defaultUser = new User();
                defaultUser.setFirstName("System");
                defaultUser.setLastName("User");
                defaultUser.setEmail(DEFAULT_USER_EMAIL);
                defaultUser.setPasswordHash("change-me");
                defaultUser.setRole("USER");
                defaultUser.setStatus("ACTIVE");
                return userRepository.save(defaultUser);
            });

        Resume resume = new Resume();
        resume.setTitle(request.title());
        resume.setSummary(request.summary());
        resume.setStatus("DRAFT");
        resume.setUser(owner);

        Resume savedResume = resumeRepository.save(resume);
        return new ResumeResponse(savedResume.getId(), savedResume.getTitle(), savedResume.getSummary());
    }

    @Override
    @Transactional(readOnly = true)
    public ResumeResponse getResume(Long id) {
        Resume resume = resumeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Resume not found with id: " + id));

        return new ResumeResponse(resume.getId(), resume.getTitle(), resume.getSummary());
    }
}
