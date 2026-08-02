ALTER TABLE users
    ADD COLUMN phone VARCHAR(20) NULL,
    ADD CONSTRAINT uk_users_phone
        UNIQUE (phone);
