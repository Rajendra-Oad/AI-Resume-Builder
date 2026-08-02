ALTER TABLE users
    ADD COLUMN persona VARCHAR(30) NULL,
    ADD COLUMN career_goal VARCHAR(40) NULL,
    ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Accounts that existed before onboarding launched keep uninterrupted access.
UPDATE users
SET onboarding_completed = TRUE;
