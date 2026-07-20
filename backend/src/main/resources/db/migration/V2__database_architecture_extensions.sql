CREATE TABLE templates (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    preview_url VARCHAR(500) NULL,
    is_system BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    configuration JSON NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_templates_name UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE resumes
    ADD COLUMN target_job_title VARCHAR(255) NULL AFTER summary,
    ADD COLUMN template_id BIGINT NULL AFTER user_id,
    ADD CONSTRAINT fk_resumes_template FOREIGN KEY (template_id) REFERENCES templates(id);

ALTER TABLE refresh_tokens
    ADD CONSTRAINT uk_refresh_tokens_hash UNIQUE (token_hash);

CREATE TABLE resume_versions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    resume_id BIGINT NOT NULL,
    template_id BIGINT NULL,
    version_number INT NOT NULL,
    source_type VARCHAR(50) NOT NULL DEFAULT 'USER_EDIT',
    label VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_resume_versions_number UNIQUE (resume_id, version_number),
    CONSTRAINT chk_resume_versions_source CHECK (source_type IN ('USER_EDIT', 'AI_GENERATED', 'AI_IMPROVED', 'ROLLBACK')),
    CONSTRAINT fk_resume_versions_resume FOREIGN KEY (resume_id) REFERENCES resumes(id),
    CONSTRAINT fk_resume_versions_template FOREIGN KEY (template_id) REFERENCES templates(id),
    INDEX idx_resume_versions_resume_created (resume_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE resume_version_snapshots (
    id BIGINT NOT NULL AUTO_INCREMENT,
    resume_version_id BIGINT NOT NULL,
    content JSON NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_resume_version_snapshots_version UNIQUE (resume_version_id),
    CONSTRAINT fk_resume_version_snapshots_version FOREIGN KEY (resume_version_id) REFERENCES resume_versions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ai_providers (
    id BIGINT NOT NULL AUTO_INCREMENT,
    provider_key VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    capabilities JSON NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_ai_providers_key UNIQUE (provider_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ai_requests (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    resume_id BIGINT NULL,
    provider_id BIGINT NOT NULL,
    request_type VARCHAR(80) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    prompt_reference VARCHAR(500) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    completed_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_ai_requests_status CHECK (status IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'RETRYING')),
    CONSTRAINT fk_ai_requests_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_ai_requests_resume FOREIGN KEY (resume_id) REFERENCES resumes(id),
    CONSTRAINT fk_ai_requests_provider FOREIGN KEY (provider_id) REFERENCES ai_providers(id),
    INDEX idx_ai_requests_user_created (user_id, created_at),
    INDEX idx_ai_requests_resume_created (resume_id, created_at),
    INDEX idx_ai_requests_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ai_generated_contents (
    id BIGINT NOT NULL AUTO_INCREMENT,
    ai_request_id BIGINT NOT NULL,
    content MEDIUMTEXT NOT NULL,
    metadata JSON NULL,
    applied_to_resume BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_ai_generated_contents_request UNIQUE (ai_request_id),
    CONSTRAINT fk_ai_generated_contents_request FOREIGN KEY (ai_request_id) REFERENCES ai_requests(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ai_request_attempts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    ai_request_id BIGINT NOT NULL,
    attempt_number INT NOT NULL,
    error_code VARCHAR(100) NULL,
    error_message VARCHAR(1000) NULL,
    latency_ms BIGINT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_ai_request_attempts_number UNIQUE (ai_request_id, attempt_number),
    CONSTRAINT fk_ai_request_attempts_request FOREIGN KEY (ai_request_id) REFERENCES ai_requests(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ai_usage_ledger (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    provider_id BIGINT NOT NULL,
    ai_request_id BIGINT NULL,
    input_tokens INT NOT NULL DEFAULT 0,
    output_tokens INT NOT NULL DEFAULT 0,
    cost_estimate DECIMAL(12, 6) NOT NULL DEFAULT 0,
    billing_period_reference VARCHAR(30) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_ai_usage_ledger_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_ai_usage_ledger_provider FOREIGN KEY (provider_id) REFERENCES ai_providers(id),
    CONSTRAINT fk_ai_usage_ledger_request FOREIGN KEY (ai_request_id) REFERENCES ai_requests(id),
    INDEX idx_ai_usage_ledger_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE job_descriptions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NULL,
    title VARCHAR(255) NULL,
    company_name VARCHAR(255) NULL,
    source_url VARCHAR(1000) NULL,
    content MEDIUMTEXT NOT NULL,
    extracted_skills JSON NULL,
    seniority_level VARCHAR(100) NULL,
    is_external BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_job_descriptions_user FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_job_descriptions_user_created (user_id, created_at),
    FULLTEXT INDEX ftx_job_descriptions_content (title, company_name, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ats_reports (
    id BIGINT NOT NULL AUTO_INCREMENT,
    resume_id BIGINT NOT NULL,
    job_description_id BIGINT NOT NULL,
    overall_score DECIMAL(5, 2) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT chk_ats_reports_score CHECK (overall_score >= 0 AND overall_score <= 100),
    CONSTRAINT fk_ats_reports_resume FOREIGN KEY (resume_id) REFERENCES resumes(id),
    CONSTRAINT fk_ats_reports_job FOREIGN KEY (job_description_id) REFERENCES job_descriptions(id),
    INDEX idx_ats_reports_resume_created (resume_id, created_at),
    INDEX idx_ats_reports_job_created (job_description_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ats_keyword_matches (
    id BIGINT NOT NULL AUTO_INCREMENT,
    ats_report_id BIGINT NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    found_in_resume BOOLEAN NOT NULL,
    importance_weight DECIMAL(6, 3) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_ats_keyword_matches_report FOREIGN KEY (ats_report_id) REFERENCES ats_reports(id),
    INDEX idx_ats_keyword_matches_report (ats_report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ats_missing_skills (
    id BIGINT NOT NULL AUTO_INCREMENT,
    ats_report_id BIGINT NOT NULL,
    skill_name VARCHAR(255) NOT NULL,
    suggested_action TEXT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_ats_missing_skills_report FOREIGN KEY (ats_report_id) REFERENCES ats_reports(id),
    INDEX idx_ats_missing_skills_report (ats_report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ats_recommendations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    ats_report_id BIGINT NOT NULL,
    category VARCHAR(50) NOT NULL,
    recommendation_text TEXT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_ats_recommendations_category CHECK (category IN ('FORMATTING', 'KEYWORDS', 'STRUCTURE', 'CONTENT')),
    CONSTRAINT fk_ats_recommendations_report FOREIGN KEY (ats_report_id) REFERENCES ats_reports(id),
    INDEX idx_ats_recommendations_report (ats_report_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE job_matches (
    id BIGINT NOT NULL AUTO_INCREMENT,
    resume_id BIGINT NOT NULL,
    job_description_id BIGINT NOT NULL,
    match_score DECIMAL(5, 2) NOT NULL,
    computed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    expires_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_job_matches_score CHECK (match_score >= 0 AND match_score <= 100),
    CONSTRAINT uk_job_matches_resume_job UNIQUE (resume_id, job_description_id),
    CONSTRAINT fk_job_matches_resume FOREIGN KEY (resume_id) REFERENCES resumes(id),
    CONSTRAINT fk_job_matches_job FOREIGN KEY (job_description_id) REFERENCES job_descriptions(id),
    INDEX idx_job_matches_resume_score (resume_id, match_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    type VARCHAR(80) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    read_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT chk_notifications_status CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'READ')),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_notifications_user_status_created (user_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subscriptions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    plan VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    starts_at DATETIME(6) NOT NULL,
    ends_at DATETIME(6) NULL,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    current_user_id BIGINT GENERATED ALWAYS AS (CASE WHEN is_current THEN user_id ELSE NULL END) STORED,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_subscriptions_current_user UNIQUE (current_user_id),
    CONSTRAINT chk_subscriptions_plan CHECK (plan IN ('FREE', 'PREMIUM', 'PRO')),
    CONSTRAINT chk_subscriptions_status CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE')),
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_subscriptions_user_starts (user_id, starts_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_transactions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    subscription_id BIGINT NOT NULL,
    provider VARCHAR(80) NOT NULL,
    provider_reference VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency CHAR(3) NOT NULL,
    status VARCHAR(30) NOT NULL,
    occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_payment_transactions_reference UNIQUE (provider, provider_reference),
    CONSTRAINT chk_payment_transactions_status CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
    CONSTRAINT fk_payment_transactions_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
    INDEX idx_payment_transactions_subscription_occurred (subscription_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usage_metrics (
    id BIGINT NOT NULL AUTO_INCREMENT,
    metric_date DATE NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    dimension_key VARCHAR(150) NOT NULL DEFAULT '',
    metric_value BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_usage_metrics_rollup UNIQUE (metric_date, metric_name, dimension_key),
    INDEX idx_usage_metrics_name_date (metric_name, metric_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL,
    before_state JSON NULL,
    after_state JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_audit_logs_entity_created (entity_type, entity_id, created_at),
    INDEX idx_audit_logs_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_action_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    admin_user_id BIGINT NOT NULL,
    target_user_id BIGINT NULL,
    action VARCHAR(100) NOT NULL,
    details JSON NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_admin_action_logs_admin FOREIGN KEY (admin_user_id) REFERENCES users(id),
    CONSTRAINT fk_admin_action_logs_target FOREIGN KEY (target_user_id) REFERENCES users(id),
    INDEX idx_admin_action_logs_admin_created (admin_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO templates (name, description, is_system, is_active)
VALUES ('classic', 'Clean, ATS-friendly single-column template.', TRUE, TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO ai_providers (provider_key, display_name, is_active)
VALUES ('gemini', 'Google Gemini', TRUE), ('openai', 'OpenAI', TRUE)
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), is_active = VALUES(is_active);
