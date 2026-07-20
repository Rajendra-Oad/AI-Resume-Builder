CREATE TABLE user_ai_settings (
    user_id BIGINT NOT NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'PLATFORM',
    preferred_provider VARCHAR(50) NOT NULL DEFAULT 'gemini',
    allow_platform_fallback BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (user_id),
    CONSTRAINT chk_user_ai_settings_mode CHECK (mode IN ('PLATFORM', 'BYOK')),
    CONSTRAINT chk_user_ai_settings_provider CHECK (preferred_provider IN ('gemini', 'openai')),
    CONSTRAINT fk_user_ai_settings_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE ai_requests
    ADD COLUMN credential_source VARCHAR(20) NOT NULL DEFAULT 'PLATFORM' AFTER provider_id,
    ADD CONSTRAINT chk_ai_requests_credential_source CHECK (credential_source IN ('PLATFORM', 'BYOK'));

CREATE TABLE user_ai_provider_credentials (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    encrypted_key VARBINARY(2048) NOT NULL,
    initialization_vector VARBINARY(32) NOT NULL,
    key_version INT NOT NULL DEFAULT 1,
    key_hint VARCHAR(12) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_user_ai_credentials_provider UNIQUE (user_id, provider),
    CONSTRAINT chk_user_ai_credentials_provider CHECK (provider IN ('gemini', 'openai')),
    CONSTRAINT fk_user_ai_credentials_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
