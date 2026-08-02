ALTER TABLE user_profiles
    ADD COLUMN photo_data BYTEA NULL,
    ADD COLUMN photo_content_type VARCHAR(100) NULL,
    ADD COLUMN photo_file_name VARCHAR(255) NULL;
