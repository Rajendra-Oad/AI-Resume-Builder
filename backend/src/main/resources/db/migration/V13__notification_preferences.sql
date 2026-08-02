CREATE TABLE user_notification_preferences (
    user_id BIGINT NOT NULL,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    job_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ai_updates_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_user_notification_preferences_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);


CREATE FUNCTION update_user_notification_preferences_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF ROW(
        NEW.user_id,
        NEW.email_enabled,
        NEW.in_app_enabled,
        NEW.job_alerts_enabled,
        NEW.ai_updates_enabled
    ) IS DISTINCT FROM ROW(
        OLD.user_id,
        OLD.email_enabled,
        OLD.in_app_enabled,
        OLD.job_alerts_enabled,
        OLD.ai_updates_enabled
    )
    AND NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
        NEW.updated_at = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$;


CREATE TRIGGER trg_user_notification_preferences_updated_at
BEFORE UPDATE ON user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_notification_preferences_timestamp();
