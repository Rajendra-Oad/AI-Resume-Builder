# Database Reference

MySQL is the transactional data store for users, resumes, authentication state,
AI usage, ATS reports, jobs, notifications, templates, subscriptions, audit logs,
and export history.

## Canonical Guides

- [Database Architecture](03_Database_Architecture.md) defines the conceptual
  schema, relationships, keys, indexes, lifecycle rules, and scalability plan.
- [Database Migration README](../database/README.md) explains where migrations
  live and how they are applied.
- Backend Flyway migrations live in `backend/src/main/resources/db/migration`.

## Operating Rules

- Flyway owns schema changes. Do not edit an applied migration; add a new versioned
  migration instead.
- Keep database credentials in ignored local or deployment environment files.
- Preserve historical records needed for audit, exports, and resume versioning.
- Treat AI providers as external systems; provider responses do not own the
  transactional data model.
