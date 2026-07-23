ALTER TABLE users
    ADD COLUMN persona VARCHAR(30) NULL AFTER status,
    ADD COLUMN career_goal VARCHAR(40) NULL AFTER persona,
    ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE AFTER career_goal;

-- Accounts that existed before onboarding launched keep uninterrupted access.
UPDATE users SET onboarding_completed = TRUE;

