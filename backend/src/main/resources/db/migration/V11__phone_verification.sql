ALTER TABLE users
    ADD COLUMN phone VARCHAR(20) NULL AFTER email,
    ADD COLUMN phone_verified_at DATETIME(6) NULL AFTER verified_at,
    ADD CONSTRAINT uk_users_phone UNIQUE (phone);

CREATE TABLE phone_otp_challenges (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    code_hash VARCHAR(100) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    expires_at DATETIME(6) NOT NULL,
    verified_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_phone_otp_user FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_phone_otp_user_created (user_id, created_at),
    INDEX idx_phone_otp_phone_created (phone, created_at)
);
