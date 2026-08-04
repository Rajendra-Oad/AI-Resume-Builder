-- ai_jobs.id was created as CHAR(36) in V5, but the JPA entity AiJob maps the
-- primary key as VARCHAR(36). PostgreSQL stores CHAR(n) as bpchar (blank-padded
-- fixed length), which fails Hibernate schema validation under the prod profile
-- (spring.jpa.hibernate.ddl-auto=validate). Reconcile the column to VARCHAR(36).
ALTER TABLE ai_jobs
    ALTER COLUMN id TYPE VARCHAR(36);
