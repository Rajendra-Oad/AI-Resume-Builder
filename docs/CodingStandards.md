# Coding Standards

These standards summarize day-to-day expectations. Architecture-level standards
live in the numbered guides linked from [Documentation Index](README.md).

## Java

- Keep controllers thin; delegate business behavior to services.
- Keep persistence details in repositories or focused data-access helpers.
- Use DTOs for request and response payloads.
- Prefer constructor injection.
- Keep security and ownership checks explicit at service boundaries.
- Add focused tests for service behavior, validation, and security-sensitive flows.

## Frontend

- Use functional React components and hooks.
- Keep API calls in feature-level `api` modules.
- Keep reusable UI primitives in `src/components`.
- Use route guards for authentication and authorization boundaries.
- Preserve loading, empty, error, retry, and success states for user-facing flows.
- Follow the accessibility rules in [UX & Design System](09_UX-Design-System.md).

## Documentation

- Update docs when behavior, setup, or architecture changes.
- Link short reference pages to the canonical numbered guide.
- Do not document secrets, private keys, or machine-specific local paths.
