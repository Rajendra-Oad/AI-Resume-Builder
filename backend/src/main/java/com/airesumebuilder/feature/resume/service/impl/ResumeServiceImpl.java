package com.airesumebuilder.feature.resume.service.impl;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import com.airesumebuilder.feature.resume.dto.request.CreateResumeRequest;
import com.airesumebuilder.feature.resume.dto.request.UpdateResumeRequest;
import com.airesumebuilder.feature.resume.dto.request.PatchResumeRequest;
import com.airesumebuilder.feature.resume.dto.response.ResumeResponse;
import com.airesumebuilder.feature.resume.dto.response.DeletedResumeResponse;
import com.airesumebuilder.common.exception.ValidationException;
import com.airesumebuilder.feature.resume.entity.Resume;
import com.airesumebuilder.feature.resume.repository.ResumeRepository;
import com.airesumebuilder.feature.resume.service.ResumeService;
import com.airesumebuilder.feature.resume.version.service.ResumeVersionService;
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

    private static final java.time.Duration RECOVERY_WINDOW = java.time.Duration.ofDays(30);

    private final ResumeRepository resumeRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final ResumeVersionService versionService;

    public ResumeServiceImpl(ResumeRepository resumeRepository, UserRepository userRepository, ApplicationEventPublisher eventPublisher, ResumeVersionService versionService) {
        this.resumeRepository = resumeRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
        this.versionService = versionService;
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
        resume.setContactEmail(owner.getEmail());
        resume.setStatus("DRAFT");
        resume.setUser(owner);

        Resume savedResume = resumeRepository.save(resume);
        versionService.snapshot(savedResume, "USER_EDIT", "Initial version");
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
        resume.setTargetJobTitle(request.targetJobTitle());
        resume.setContactEmail(request.contactEmail());
        resume.setPhone(request.phone());
        resume.setLocation(request.location());
        resume.setGithubUrl(request.githubUrl());
        resume.setLinkedinUrl(request.linkedinUrl());
        resume.setSkillsContent(request.skillsContent());
        resume.setExperienceContent(request.experienceContent());
        resume.setProjectsContent(request.projectsContent());
        resume.setEducationContent(request.educationContent());
        resume.setCertificationsContent(request.certificationsContent());
        resume.setLanguagesContent(request.languagesContent());
        resume.setFontFamily(request.fontFamily() == null ? "HELVETICA" : request.fontFamily());
        resume.setFontSize(request.fontSize() == null ? new java.math.BigDecimal("10.5") : request.fontSize());
        resume.setLineSpacing(request.lineSpacing() == null ? new java.math.BigDecimal("1.25") : request.lineSpacing());
        resume.setSectionSpacing(request.sectionSpacing() == null ? 12 : request.sectionSpacing());
        resume.setPageMargin(request.pageMargin() == null ? 42 : request.pageMargin());
        Resume saved = resumeRepository.save(resume);
        versionService.snapshot(saved, "USER_EDIT", "Saved edit");
        eventPublisher.publishEvent(new ResumeUpdatedEvent(saved.getId(), saved.getUser().getId(), before, snapshot(saved)));
        return toResponse(saved);
    }

    @Override @Transactional
    public ResumeResponse patchResume(String ownerEmail,Long id,PatchResumeRequest request){Resume resume=findResume(ownerEmail,id);Map<String,Object> before=snapshot(resume);if(request.title()!=null){if(request.title().isBlank())throw new ValidationException("Title cannot be blank.");resume.setTitle(request.title().trim());}if(request.summary()!=null)resume.setSummary(blankToNull(request.summary()));if(request.targetJobTitle()!=null)resume.setTargetJobTitle(blankToNull(request.targetJobTitle()));if(request.contactEmail()!=null)resume.setContactEmail(blankToNull(request.contactEmail()));if(request.phone()!=null)resume.setPhone(blankToNull(request.phone()));if(request.location()!=null)resume.setLocation(blankToNull(request.location()));if(request.githubUrl()!=null)resume.setGithubUrl(blankToNull(request.githubUrl()));if(request.linkedinUrl()!=null)resume.setLinkedinUrl(blankToNull(request.linkedinUrl()));if(request.fontFamily()!=null)resume.setFontFamily(request.fontFamily());if(request.fontSize()!=null)resume.setFontSize(request.fontSize());if(request.lineSpacing()!=null)resume.setLineSpacing(request.lineSpacing());if(request.sectionSpacing()!=null)resume.setSectionSpacing(request.sectionSpacing());if(request.pageMargin()!=null)resume.setPageMargin(request.pageMargin());Resume saved=resumeRepository.save(resume);versionService.snapshot(saved,"USER_EDIT","Updated resume metadata");eventPublisher.publishEvent(new ResumeUpdatedEvent(saved.getId(),saved.getUser().getId(),before,snapshot(saved)));return toResponse(saved);}

    @Override @Transactional
    public ResumeResponse publishResume(String ownerEmail,Long id){Resume resume=findResume(ownerEmail,id);if("PUBLISHED".equals(resume.getStatus()))return toResponse(resume);if(resume.getTitle()==null||resume.getTitle().isBlank())throw new ValidationException("A title is required before publishing.");Map<String,Object> before=snapshot(resume);resume.setStatus("PUBLISHED");Resume saved=resumeRepository.save(resume);versionService.snapshot(saved,"USER_EDIT","Published resume");eventPublisher.publishEvent(new ResumeUpdatedEvent(saved.getId(),saved.getUser().getId(),before,snapshot(saved)));return toResponse(saved);}

    @Override
    @Transactional
    public ResumeResponse duplicateResume(String ownerEmail, Long id) {
        Resume source = findResume(ownerEmail, id);
        Resume copy = new Resume();
        copy.setTitle(copyTitle(source.getTitle()));
        copy.setSummary(source.getSummary());
        copy.setTargetJobTitle(source.getTargetJobTitle());
        copy.setContactEmail(source.getContactEmail());
        copy.setPhone(source.getPhone());
        copy.setLocation(source.getLocation());
        copy.setGithubUrl(source.getGithubUrl());
        copy.setLinkedinUrl(source.getLinkedinUrl());
        copy.setSkillsContent(source.getSkillsContent());
        copy.setExperienceContent(source.getExperienceContent());
        copy.setProjectsContent(source.getProjectsContent());
        copy.setEducationContent(source.getEducationContent());
        copy.setCertificationsContent(source.getCertificationsContent());
        copy.setLanguagesContent(source.getLanguagesContent());
        copy.setFontFamily(source.getFontFamily());
        copy.setFontSize(source.getFontSize());
        copy.setLineSpacing(source.getLineSpacing());
        copy.setSectionSpacing(source.getSectionSpacing());
        copy.setPageMargin(source.getPageMargin());
        copy.setStatus("DRAFT");
        copy.setUser(source.getUser());

        Resume saved = resumeRepository.save(copy);
        versionService.snapshot(saved, "USER_EDIT", "Duplicated from " + source.getTitle());
        eventPublisher.publishEvent(new ResumeCreatedEvent(saved.getId(), saved.getUser().getId()));
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DeletedResumeResponse> listDeletedResumes(String ownerEmail, Pageable pageable) {
        java.time.Instant cutoff = java.time.Instant.now().minus(RECOVERY_WINDOW);
        return resumeRepository.findByUserEmailAndDeletedAtIsNotNullAndDeletedAtAfter(ownerEmail, cutoff, pageable)
            .map(this::toDeletedResponse);
    }

    @Override
    @Transactional
    public ResumeResponse restoreResume(String ownerEmail, Long id) {
        Resume resume = resumeRepository.findByIdAndUserEmailAndDeletedAtIsNotNull(id, ownerEmail)
            .orElseThrow(() -> new ResourceNotFoundException("Deleted resume not found."));
        if (!resume.getDeletedAt().plus(RECOVERY_WINDOW).isAfter(java.time.Instant.now())) {
            throw new ValidationException("The 30-day recovery window for this resume has expired.");
        }
        Map<String,Object> before = snapshot(resume);
        before.put("deletedAt", resume.getDeletedAt());
        resume.setDeletedAt(null);
        Resume restored = resumeRepository.save(resume);
        versionService.snapshot(restored, "ROLLBACK", "Restored from Recently Deleted");
        Map<String,Object> after = snapshot(restored);
        after.put("deletedAt", null);
        eventPublisher.publishEvent(new ResumeUpdatedEvent(restored.getId(), restored.getUser().getId(), before, after));
        return toResponse(restored);
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

    private String copyTitle(String title) {
        String base = title == null || title.isBlank() ? "Untitled resume" : title.trim();
        String suffix = " (Copy)";
        int maxBaseLength = 255 - suffix.length();
        return (base.length() > maxBaseLength ? base.substring(0, maxBaseLength).trim() : base) + suffix;
    }
    private String blankToNull(String value){return value==null||value.isBlank()?null:value.trim();}

    private ResumeResponse toResponse(Resume resume) {
        return new ResumeResponse(resume.getId(),resume.getTitle(),resume.getSummary(),resume.getTargetJobTitle(),resume.getContactEmail(),resume.getPhone(),resume.getLocation(),resume.getGithubUrl(),resume.getLinkedinUrl(),resume.getSkillsContent(),resume.getExperienceContent(),resume.getProjectsContent(),resume.getEducationContent(),resume.getCertificationsContent(),resume.getLanguagesContent(),resume.getFontFamily(),resume.getFontSize(),resume.getLineSpacing(),resume.getSectionSpacing(),resume.getPageMargin());
    }

    private DeletedResumeResponse toDeletedResponse(Resume resume) {
        return new DeletedResumeResponse(resume.getId(), resume.getTitle(), resume.getSummary(),
            resume.getDeletedAt(), resume.getDeletedAt().plus(RECOVERY_WINDOW));
    }

    private Map<String,Object> snapshot(Resume resume) {
        Map<String,Object> state = new java.util.LinkedHashMap<>();
        state.put("title", resume.getTitle()); state.put("summary", resume.getSummary());
        state.put("targetJobTitle", resume.getTargetJobTitle()); state.put("status", resume.getStatus());
        return state;
    }
}
