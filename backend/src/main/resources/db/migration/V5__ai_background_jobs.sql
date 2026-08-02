CREATE TABLE ai_jobs (
    id CHAR(36) NOT NULL,
    user_id BIGINT NOT NULL,
    workflow VARCHAR(80) NOT NULL,
    status VARCHAR(20) NOT NULL,
    result TEXT NULL,
    error_message VARCHAR(500) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_ai_jobs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_ai_jobs_user_created
    ON ai_jobs (user_id, created_at);