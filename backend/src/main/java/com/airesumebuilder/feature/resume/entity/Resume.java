package com.airesumebuilder.feature.resume.entity;

import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.template.entity.Template;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

@Entity
@Table(name = "resumes")
public class Resume {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String summary;

    @Column(name = "target_job_title", length = 255)
    private String targetJobTitle;

    @Column(nullable = false)
    private String status = "DRAFT";

    @Column(name = "contact_email") private String contactEmail;
    private String phone;
    private String location;
    @Column(name = "github_url") private String githubUrl;
    @Column(name = "linkedin_url") private String linkedinUrl;
    @Column(name = "skills_content", columnDefinition = "TEXT") private String skillsContent;
    @Column(name = "experience_content", columnDefinition = "MEDIUMTEXT") private String experienceContent;
    @Column(name = "projects_content", columnDefinition = "MEDIUMTEXT") private String projectsContent;
    @Column(name = "education_content", columnDefinition = "MEDIUMTEXT") private String educationContent;
    @Column(name = "certifications_content", columnDefinition = "TEXT") private String certificationsContent;
    @Column(name = "languages_content", columnDefinition = "TEXT") private String languagesContent;
    @Column(name = "font_family", nullable = false) private String fontFamily = "HELVETICA";
    @Column(name = "font_size", nullable = false) private BigDecimal fontSize = new BigDecimal("10.5");
    @Column(name = "line_spacing", nullable = false) private BigDecimal lineSpacing = new BigDecimal("1.25");
    @Column(name = "section_spacing", nullable = false) private Integer sectionSpacing = 12;
    @Column(name = "page_margin", nullable = false) private Integer pageMargin = 42;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private Template template;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @OneToMany(mappedBy = "resume", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ResumeSection> sections = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getTargetJobTitle() {
        return targetJobTitle;
    }

    public void setTargetJobTitle(String targetJobTitle) {
        this.targetJobTitle = targetJobTitle;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getContactEmail(){return contactEmail;} public void setContactEmail(String value){contactEmail=value;}
    public String getPhone(){return phone;} public void setPhone(String value){phone=value;}
    public String getLocation(){return location;} public void setLocation(String value){location=value;}
    public String getGithubUrl(){return githubUrl;} public void setGithubUrl(String value){githubUrl=value;}
    public String getLinkedinUrl(){return linkedinUrl;} public void setLinkedinUrl(String value){linkedinUrl=value;}
    public String getSkillsContent(){return skillsContent;} public void setSkillsContent(String value){skillsContent=value;}
    public String getExperienceContent(){return experienceContent;} public void setExperienceContent(String value){experienceContent=value;}
    public String getProjectsContent(){return projectsContent;} public void setProjectsContent(String value){projectsContent=value;}
    public String getEducationContent(){return educationContent;} public void setEducationContent(String value){educationContent=value;}
    public String getCertificationsContent(){return certificationsContent;} public void setCertificationsContent(String value){certificationsContent=value;}
    public String getLanguagesContent(){return languagesContent;} public void setLanguagesContent(String value){languagesContent=value;}
    public String getFontFamily(){return fontFamily;} public void setFontFamily(String value){fontFamily=value;}
    public BigDecimal getFontSize(){return fontSize;} public void setFontSize(BigDecimal value){fontSize=value;}
    public BigDecimal getLineSpacing(){return lineSpacing;} public void setLineSpacing(BigDecimal value){lineSpacing=value;}
    public Integer getSectionSpacing(){return sectionSpacing;} public void setSectionSpacing(Integer value){sectionSpacing=value;}
    public Integer getPageMargin(){return pageMargin;} public void setPageMargin(Integer value){pageMargin=value;}

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Template getTemplate() { return template; }

    public void setTemplate(Template template) { this.template = template; }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Instant deletedAt) {
        this.deletedAt = deletedAt;
    }

    public List<ResumeSection> getSections() {
        return sections;
    }

    public void setSections(List<ResumeSection> sections) {
        this.sections = sections;
    }
}
