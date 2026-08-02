DROP INDEX idx_resumes_user_status_created;
DROP INDEX idx_notifications_user_status_created;
DROP INDEX idx_ai_prompt_templates_lookup;
DROP INDEX idx_usage_metrics_name_date;

CREATE INDEX idx_users_active_created
    ON users (created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_resumes_user_active_updated
    ON resumes (user_id, updated_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_resumes_user_deleted_at
    ON resumes (user_id, deleted_at DESC)
    WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_resumes_user_active_created
    ON resumes (user_id, created_at)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_resumes_active_created
    ON resumes (created_at)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_notifications_user_created
    ON notifications (user_id, created_at DESC);

CREATE INDEX idx_notifications_user_unread_created
    ON notifications (user_id, created_at DESC)
    WHERE read_at IS NULL;

CREATE INDEX idx_ai_prompt_templates_published_lookup
    ON ai_prompt_templates (workflow, locale, status, version DESC);

CREATE INDEX idx_admin_action_logs_created
    ON admin_action_logs (created_at DESC);

CREATE INDEX idx_audit_logs_created
    ON audit_logs (created_at DESC);

CREATE INDEX idx_ai_requests_created
    ON ai_requests (created_at);

CREATE INDEX idx_pdf_exports_created
    ON pdf_exports (created_at);

CREATE INDEX idx_ats_reports_created
    ON ats_reports (created_at);
