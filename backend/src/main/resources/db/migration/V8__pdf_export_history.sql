CREATE TABLE pdf_exports (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    resume_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    byte_size BIGINT NOT NULL,
    content_sha256 CHAR(64) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_pdf_exports_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_pdf_exports_resume FOREIGN KEY (resume_id) REFERENCES resumes(id),
    INDEX idx_pdf_exports_user_created (user_id, created_at),
    INDEX idx_pdf_exports_resume_created (resume_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
