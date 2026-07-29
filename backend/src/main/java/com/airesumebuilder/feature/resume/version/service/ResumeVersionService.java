package com.airesumebuilder.feature.resume.version.service;

import com.airesumebuilder.common.exception.ResourceNotFoundException;
import com.airesumebuilder.events.ResumeUpdatedEvent;
import com.airesumebuilder.feature.resume.dto.response.ResumeResponse;
import com.airesumebuilder.feature.resume.entity.Certification;
import com.airesumebuilder.feature.resume.entity.Education;
import com.airesumebuilder.feature.resume.entity.Experience;
import com.airesumebuilder.feature.resume.entity.Project;
import com.airesumebuilder.feature.resume.entity.Resume;
import com.airesumebuilder.feature.resume.entity.ResumeSection;
import com.airesumebuilder.feature.resume.entity.Skill;
import com.airesumebuilder.feature.resume.repository.ResumeRepository;
import com.airesumebuilder.feature.resume.version.repository.ResumeVersionRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ResumeVersionService {
    private final ResumeVersionRepository versions;
    private final ResumeRepository resumes;
    private final ObjectMapper json;
    private final ApplicationEventPublisher events;

    public ResumeVersionService(ResumeVersionRepository versions, ResumeRepository resumes, ObjectMapper json, ApplicationEventPublisher events) {
        this.versions = versions;
        this.resumes = resumes;
        this.json = json;
        this.events = events;
    }

    @Transactional
    public long snapshot(Resume resume, String source, String label) {
        try {
            return versions.create(resume.getId(), source, label, json.writeValueAsString(snapshotState(resume)));
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            throw new IllegalStateException("Resume version serialization failed.", exception);
        }
    }

    @Transactional(readOnly = true)
    public VersionPage list(String email, long resumeId, int page, int size) {
        int boundedPage = Math.max(0, page);
        int boundedSize = Math.min(Math.max(1, size), 100);
        return new VersionPage(
            versions.list(email, resumeId, boundedSize, boundedPage * boundedSize),
            boundedPage,
            boundedSize,
            versions.count(email, resumeId)
        );
    }

    @Transactional(readOnly = true)
    public VersionDetail get(String email, long resumeId, long versionId) {
        var record = versions.get(email, resumeId, versionId);
        try {
            return new VersionDetail(record.summary(), json.readTree(record.content()));
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            throw new IllegalStateException("Stored resume version is invalid.", exception);
        }
    }

    @Transactional
    public ResumeResponse restore(String email, long resumeId, long versionId) {
        Resume resume = resumes.findByIdAndUserEmailAndDeletedAtIsNull(resumeId, email)
            .orElseThrow(() -> new ResourceNotFoundException("Resume not found."));
        var version = versions.get(email, resumeId, versionId);
        Map<String, Object> before = snapshotState(resume);
        try {
            Map<String, Object> state = json.readValue(version.content(), new TypeReference<>() {});
            apply(resume, state);
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            throw new IllegalStateException("Stored resume version is invalid.", exception);
        }
        Resume saved = resumes.save(resume);
        snapshot(saved, "ROLLBACK", "Restored from version " + version.summary().versionNumber());
        events.publishEvent(new ResumeUpdatedEvent(saved.getId(), saved.getUser().getId(), before, snapshotState(saved)));
        return response(saved);
    }

    private Map<String, Object> snapshotState(Resume resume) {
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("title", resume.getTitle());
        state.put("summary", resume.getSummary());
        state.put("targetJobTitle", resume.getTargetJobTitle());
        state.put("fullName", resume.getFullName());
        state.put("status", resume.getStatus());
        state.put("contactEmail",resume.getContactEmail()); state.put("phone",resume.getPhone()); state.put("location",resume.getLocation());
        state.put("githubUrl",resume.getGithubUrl()); state.put("linkedinUrl",resume.getLinkedinUrl());
        state.put("skillsContent",resume.getSkillsContent()); state.put("experienceContent",resume.getExperienceContent());
        state.put("projectsContent",resume.getProjectsContent()); state.put("educationContent",resume.getEducationContent());
        state.put("certificationsContent",resume.getCertificationsContent()); state.put("languagesContent",resume.getLanguagesContent());
        state.put("fontFamily",resume.getFontFamily()); state.put("fontSize",resume.getFontSize()); state.put("lineSpacing",resume.getLineSpacing());
        state.put("sectionSpacing",resume.getSectionSpacing()); state.put("pageMargin",resume.getPageMargin());
        state.put("sections", resume.getSections().stream().map(this::sectionState).toList());
        return state;
    }

    private Map<String, Object> sectionState(ResumeSection section) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("displayOrder", section.getDisplayOrder());
        if (section instanceof Education item) {
            value.put("type", "EDUCATION"); value.put("institution", item.getInstitution()); value.put("degree", item.getDegree());
            value.put("startYear", item.getStartYear()); value.put("endYear", item.getEndYear());
        } else if (section instanceof Experience item) {
            value.put("type", "EXPERIENCE"); value.put("employer", item.getEmployer()); value.put("role", item.getRole());
            value.put("startDate", item.getStartDate()); value.put("endDate", item.getEndDate());
        } else if (section instanceof Project item) {
            value.put("type", "PROJECT"); value.put("name", item.getName()); value.put("description", item.getDescription());
        } else if (section instanceof Skill item) {
            value.put("type", "SKILL"); value.put("name", item.getName()); value.put("proficiencyLevel", item.getProficiencyLevel());
        } else if (section instanceof Certification item) {
            value.put("type", "CERTIFICATION"); value.put("name", item.getName()); value.put("issuedBy", item.getIssuedBy());
        } else {
            throw new IllegalStateException("Unsupported resume section type: " + section.getClass().getSimpleName());
        }
        return value;
    }

    @SuppressWarnings("unchecked")
    private void apply(Resume resume, Map<String, Object> state) {
        resume.setTitle((String) state.get("title"));
        resume.setSummary((String) state.get("summary"));
        resume.setTargetJobTitle((String) state.get("targetJobTitle"));
        resume.setFullName((String) state.get("fullName"));
        resume.setStatus((String) state.getOrDefault("status", "DRAFT"));
        resume.setContactEmail((String)state.get("contactEmail")); resume.setPhone((String)state.get("phone")); resume.setLocation((String)state.get("location"));
        resume.setGithubUrl((String)state.get("githubUrl")); resume.setLinkedinUrl((String)state.get("linkedinUrl"));
        resume.setSkillsContent((String)state.get("skillsContent")); resume.setExperienceContent((String)state.get("experienceContent"));
        resume.setProjectsContent((String)state.get("projectsContent")); resume.setEducationContent((String)state.get("educationContent"));
        resume.setCertificationsContent((String)state.get("certificationsContent")); resume.setLanguagesContent((String)state.get("languagesContent"));
        resume.setFontFamily((String)state.getOrDefault("fontFamily","HELVETICA"));
        resume.setFontSize(decimal(state.get("fontSize"),"10.5")); resume.setLineSpacing(decimal(state.get("lineSpacing"),"1.25"));
        resume.setSectionSpacing(number(state.get("sectionSpacing"),12)); resume.setPageMargin(number(state.get("pageMargin"),42));
        List<ResumeSection> restored = new ArrayList<>();
        Object rawSections = state.get("sections");
        if (rawSections instanceof List<?> sectionList) {
            for (Object raw : sectionList) restored.add(section(resume, (Map<String, Object>) raw));
        }
        resume.getSections().clear();
        resume.getSections().addAll(restored);
    }

    private ResumeSection section(Resume resume, Map<String, Object> value) {
        String type = String.valueOf(value.get("type"));
        ResumeSection section = switch (type) {
            case "EDUCATION" -> education(value);
            case "EXPERIENCE" -> experience(value);
            case "PROJECT" -> project(value);
            case "SKILL" -> skill(value);
            case "CERTIFICATION" -> certification(value);
            default -> throw new IllegalStateException("Stored resume version contains an unsupported section type.");
        };
        section.setResume(resume);
        section.setDisplayOrder(number(value.get("displayOrder"), 0));
        return section;
    }

    private Education education(Map<String, Object> v) { Education x=new Education(); x.setInstitution((String)v.get("institution")); x.setDegree((String)v.get("degree")); x.setStartYear(numberOrNull(v.get("startYear"))); x.setEndYear(numberOrNull(v.get("endYear"))); return x; }
    private Experience experience(Map<String, Object> v) { Experience x=new Experience(); x.setEmployer((String)v.get("employer")); x.setRole((String)v.get("role")); x.setStartDate((String)v.get("startDate")); x.setEndDate((String)v.get("endDate")); return x; }
    private Project project(Map<String, Object> v) { Project x=new Project(); x.setName((String)v.get("name")); x.setDescription((String)v.get("description")); return x; }
    private Skill skill(Map<String, Object> v) { Skill x=new Skill(); x.setName((String)v.get("name")); x.setProficiencyLevel((String)v.get("proficiencyLevel")); return x; }
    private Certification certification(Map<String, Object> v) { Certification x=new Certification(); x.setName((String)v.get("name")); x.setIssuedBy((String)v.get("issuedBy")); return x; }
    private int number(Object value, int fallback) { return value instanceof Number number ? number.intValue() : fallback; }
    private Integer numberOrNull(Object value) { return value instanceof Number number ? number.intValue() : null; }
    private java.math.BigDecimal decimal(Object value,String fallback){return value==null?new java.math.BigDecimal(fallback):new java.math.BigDecimal(String.valueOf(value));}
    private ResumeResponse response(Resume r){return new ResumeResponse(r.getId(),r.getTitle(),r.getSummary(),r.getTargetJobTitle(),r.getFullName(),r.getContactEmail(),r.getPhone(),r.getLocation(),r.getGithubUrl(),r.getLinkedinUrl(),r.getSkillsContent(),r.getExperienceContent(),r.getProjectsContent(),r.getEducationContent(),r.getCertificationsContent(),r.getLanguagesContent(),r.getFontFamily(),r.getFontSize(),r.getLineSpacing(),r.getSectionSpacing(),r.getPageMargin(),r.getTemplate()==null?null:r.getTemplate().getId(),r.getTemplate()==null?null:r.getTemplate().getConfiguration());}

    public record VersionSummary(long id, long resumeId, int versionNumber, String source, String label, Instant createdAt) {}
    public record VersionDetail(VersionSummary version, JsonNode snapshot) {}
    public record VersionPage(List<VersionSummary> items, int page, int size, long total) {}
}
