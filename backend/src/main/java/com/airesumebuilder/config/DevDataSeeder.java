package com.airesumebuilder.config;

import com.airesumebuilder.feature.auth.entity.User;
import com.airesumebuilder.feature.auth.repository.UserRepository;
import java.math.BigDecimal;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Idempotent demo data for local development; never registered outside the dev profile. */
@Component
@Profile("dev")
@ConditionalOnProperty(name = "app.dev.seed.enabled", havingValue = "true")
public class DevDataSeeder implements ApplicationRunner {
    public static final String USER_EMAIL = "demo.user@local.test";
    public static final String ADMIN_EMAIL = "demo.admin@local.test";
    private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final String password;

    public DevDataSeeder(
        JdbcTemplate jdbc,
        UserRepository users,
        PasswordEncoder passwordEncoder,
        @Value("${app.dev.seed.password:}") String password
    ) {
        this.jdbc = jdbc;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        if (password == null || password.length() < 12) {
            throw new IllegalStateException("DEV_SEED_PASSWORD must contain at least 12 characters when development seeding is enabled.");
        }

        User demo = upsertUser(USER_EMAIL, "Demo", "Candidate", "USER");
        upsertUser(ADMIN_EMAIL, "Demo", "Administrator", "ADMIN");
        seedProfiles(demo);
        seedTemplates();
        seedPrompts();
        Long resumeId = seedResumes(demo.getId());
        Long jobId = seedJob(demo.getId());
        seedAtsAndMatch(resumeId, jobId);
        seedNotifications(demo.getId());
        seedUsage(demo.getId());
        seedAudit(demo.getId(), resumeId);

        log.info("Development seed ready: userEmail={}, adminEmail={}. Password comes from DEV_SEED_PASSWORD and is not logged.", USER_EMAIL, ADMIN_EMAIL);
    }

    private User upsertUser(String email, String firstName, String lastName, String role) {
        User user = users.findByEmail(email).orElseGet(User::new);
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setRole(role);
        user.setStatus("ACTIVE");
        user.setPersona("USER".equals(role) ? "PROFESSIONAL" : null);
        user.setCareerGoal("USER".equals(role) ? "IMPROVE_RESUME" : null);
        user.setOnboardingCompleted(true);
        user.setVerifiedAt(Instant.now());
        user.setDeletedAt(null);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setPasswordHash(passwordEncoder.encode(password));
        return users.save(user);
    }

    private void seedProfiles(User demo) {
        jdbc.update("""
            INSERT INTO user_profiles (user_id, display_name, phone, location, created_at, updated_at)
            VALUES (?, 'Demo Candidate', '+1 555 0100', 'Remote', ?, ?)
            ON DUPLICATE KEY UPDATE display_name=VALUES(display_name), phone=VALUES(phone), location=VALUES(location), updated_at=VALUES(updated_at)
            """, demo.getId(), Instant.now(), Instant.now());
    }

    private void seedTemplates() {
        upsertTemplate("classic", "Clean, ATS-friendly single-column template.");
        upsertTemplate("modern", "Modern hierarchy with strong section labels.");
        upsertTemplate("compact", "Space-efficient layout for experienced candidates.");
    }

    private void upsertTemplate(String name, String description) {
        jdbc.update("""
            INSERT INTO templates (name, description, is_system, is_active, created_at)
            VALUES (?, ?, TRUE, TRUE, ?)
            ON DUPLICATE KEY UPDATE description=VALUES(description), is_active=TRUE
            """, name, description, Instant.now());
    }

    private void seedPrompts() {
        upsertPrompt("resume-summary", "RESUME", "Write a concise, factual professional summary using only the supplied candidate facts. Return plain text.");
        upsertPrompt("cover-letter", "COVER_LETTER", "Write a concise cover-letter draft using only the supplied role, company, and candidate facts. Do not invent achievements. Return plain text.");
    }

    private void upsertPrompt(String workflow, String category, String instruction) {
        jdbc.update("""
            INSERT INTO ai_prompt_templates (workflow, version, locale, status, system_instruction, category, created_at, published_at)
            VALUES (?, 1, 'en-US', 'PUBLISHED', ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE system_instruction=VALUES(system_instruction), category=VALUES(category), status='PUBLISHED', published_at=VALUES(published_at)
            """, workflow, instruction, category, Instant.now(), Instant.now());
    }

    private Long seedResumes(Long userId) {
        Long classicId = jdbc.queryForObject("SELECT id FROM templates WHERE name='classic'", Long.class);
        insertResume(userId, classicId, "Senior Software Engineer", "Senior Software Engineer", "Software engineer focused on reliable APIs, accessible web experiences, and measurable product outcomes.", "DRAFT");
        insertResume(userId, classicId, "Backend Engineer — Fintech", "Backend Engineer", "Backend engineer experienced in secure services, relational data modeling, and observable distributed systems.", "DRAFT");
        return jdbc.queryForObject("SELECT id FROM resumes WHERE user_id=? AND title='Senior Software Engineer' AND deleted_at IS NULL ORDER BY id LIMIT 1", Long.class, userId);
    }

    private void insertResume(Long userId, Long templateId, String title, String targetRole, String summary, String status) {
        jdbc.update("""
            INSERT INTO resumes (user_id, template_id, title, summary, target_job_title, status, created_at, updated_at)
            SELECT ?, ?, ?, ?, ?, ?, ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM resumes WHERE user_id=? AND title=? AND deleted_at IS NULL)
            """, userId, templateId, title, summary, targetRole, status, Instant.now(), Instant.now(), userId, title);
    }

    private Long seedJob(Long userId) {
        jdbc.update("""
            INSERT INTO job_descriptions (user_id, title, company_name, source_url, content, extracted_skills, seniority_level, is_external, created_at, updated_at)
            SELECT ?, 'Senior Software Engineer', 'Example Labs', 'seed://job/senior-software-engineer',
                   'Build secure Java services and accessible React applications. Required skills: Java, Spring Boot, React, MySQL, API design.',
                   JSON_ARRAY('Java','Spring Boot','React','MySQL','REST'), 'SENIOR', FALSE, ?, ?
            WHERE NOT EXISTS (SELECT 1 FROM job_descriptions WHERE source_url='seed://job/senior-software-engineer')
            """, userId, Instant.now(), Instant.now());
        return jdbc.queryForObject("SELECT id FROM job_descriptions WHERE source_url='seed://job/senior-software-engineer' ORDER BY id LIMIT 1", Long.class);
    }

    private void seedAtsAndMatch(Long resumeId, Long jobId) {
        jdbc.update("""
            INSERT INTO ats_reports (resume_id, job_description_id, overall_score, created_at)
            SELECT ?, ?, 78.50, ? WHERE NOT EXISTS (
                SELECT 1 FROM ats_reports WHERE resume_id=? AND job_description_id=?
            )
            """, resumeId, jobId, Instant.now(), resumeId, jobId);
        Long reportId = jdbc.queryForObject(
            "SELECT id FROM ats_reports WHERE resume_id=? AND job_description_id=? ORDER BY id LIMIT 1",
            Long.class,
            resumeId,
            jobId
        );
        seedAtsKeyword(reportId, "Java", true, "1.000");
        seedAtsKeyword(reportId, "Spring Boot", true, "0.950");
        seedAtsKeyword(reportId, "React", false, "0.800");
        jdbc.update("""
            INSERT INTO ats_missing_skills (ats_report_id, skill_name, suggested_action)
            SELECT ?, 'React', 'Add a specific React project or accomplishment when it is supported by your experience.'
            WHERE NOT EXISTS (SELECT 1 FROM ats_missing_skills WHERE ats_report_id=? AND skill_name='React')
            """, reportId, reportId);
        jdbc.update("""
            INSERT INTO ats_recommendations (ats_report_id, category, recommendation_text)
            SELECT ?, 'CONTENT', 'Quantify one recent accomplishment with a measurable result.'
            WHERE NOT EXISTS (
                SELECT 1 FROM ats_recommendations
                WHERE ats_report_id=? AND category='CONTENT' AND recommendation_text='Quantify one recent accomplishment with a measurable result.'
            )
            """, reportId, reportId);
        jdbc.update("""
            INSERT INTO job_matches (resume_id, job_description_id, match_score, computed_at, expires_at)
            VALUES (?, ?, 82.00, ?, DATE_ADD(?, INTERVAL 7 DAY))
            ON DUPLICATE KEY UPDATE match_score=VALUES(match_score), computed_at=VALUES(computed_at), expires_at=VALUES(expires_at)
            """, resumeId, jobId, Instant.now(), Instant.now());
    }

    private void seedAtsKeyword(Long reportId, String keyword, boolean found, String weight) {
        jdbc.update("""
            INSERT INTO ats_keyword_matches (ats_report_id, keyword, found_in_resume, importance_weight)
            SELECT ?, ?, ?, CAST(? AS DECIMAL(6,3))
            WHERE NOT EXISTS (SELECT 1 FROM ats_keyword_matches WHERE ats_report_id=? AND keyword=?)
            """, reportId, keyword, found, weight, reportId, keyword);
    }

    private void seedNotifications(Long userId) {
        jdbc.update("""
            INSERT INTO notifications (user_id, type, title, body, status, created_at)
            SELECT ?, 'WELCOME', 'Welcome to your demo workspace', 'Explore the seeded resumes, AI Center, and templates.', 'SENT', ?
            WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id=? AND type='WELCOME' AND title='Welcome to your demo workspace')
            """, userId, Instant.now(), userId);
    }

    private void seedUsage(Long userId) {
        Long providerId = jdbc.queryForObject("SELECT id FROM ai_providers WHERE provider_key='gemini'", Long.class);
        Integer existing = jdbc.queryForObject("SELECT COUNT(*) FROM ai_requests WHERE user_id=? AND prompt_reference='dev-seed:usage'", Integer.class, userId);
        if (existing != null && existing > 0) return;
        jdbc.update("INSERT INTO ai_requests (user_id,provider_id,credential_source,request_type,status,prompt_reference,created_at,completed_at) VALUES (?,?, 'PLATFORM','resume-summary','SUCCEEDED','dev-seed:usage',?,?)", userId, providerId, Instant.now(), Instant.now());
        Long requestId = jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
        jdbc.update("INSERT INTO ai_usage_ledger (user_id,provider_id,ai_request_id,input_tokens,output_tokens,cost_estimate,billing_period_reference,created_at) VALUES (?,?,?,?,?,?,?,?)", userId, providerId, requestId, 320, 110, new BigDecimal("0.000076"), "DEV-SEED", Instant.now());
    }

    private void seedAudit(Long userId, Long resumeId) {
        jdbc.update("""
            INSERT INTO audit_logs (user_id, entity_type, entity_id, action, after_state, created_at)
            SELECT ?, 'Resume', ?, 'DEV_SEED_CREATED', JSON_OBJECT('seed', TRUE), ?
            WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE user_id=? AND entity_type='Resume' AND entity_id=? AND action='DEV_SEED_CREATED')
            """, userId, resumeId, Instant.now(), userId, resumeId);
    }
}
