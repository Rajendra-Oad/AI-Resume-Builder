# Contributing

Use the [Root Contributing Guide](../CONTRIBUTING.md) for repository-wide policy.
This page summarizes the workflow expected for docs and code changes.

## Branches

- Create a short-lived feature branch from `main` unless maintainers announce an
  integration branch.
- Keep each branch focused on one documentation update, feature, or fix.
- Do not commit generated files, local `.env` files, logs, or dependency folders.

## Commits And Pull Requests

- Use Conventional Commit subjects, for example `docs(readme): update documentation index`.
- Keep pull request titles in the same Conventional Commit style.
- Include a concise summary and verification notes.
- Do not merge your own pull request without the required review and checks.

## Documentation Changes

- Update [Documentation Index](README.md) whenever docs are added, renamed, or removed.
- Keep docs-only changes separate from unrelated code changes when possible.
- If implementation differs from a blueprint, update the relevant audit or the
  blueprint so the difference is visible.
