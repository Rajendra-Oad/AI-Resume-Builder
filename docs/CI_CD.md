# Production CI/CD

GitHub Actions is the release control plane. Render owns backend/application secrets and PostgreSQL credentials; Vercel owns frontend deployment configuration. GitHub stores only credentials needed to trigger and verify deployments.

## Workflows

| Workflow                | Trigger                                       | Purpose                                                                                                 |
| ----------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `CI`                    | Push/PR to `main` or `develop`                | Backend verify/package, frontend lint/test/coverage/build, PostgreSQL 17 integration and Playwright E2E |
| `Security`              | Push/PR, weekly, manual                       | Gitleaks, npm audit, OWASP Dependency-Check, dependency review and CodeQL                               |
| `Production deployment` | Successful `CI` on `main`, or manual dispatch | Rechecks security, deploys exact SHA to Render/Vercel, then verifies production                         |
| `Release`               | Semantic tag such as `v1.2.3`                 | Verifies both applications and publishes JAR/frontend artifacts with generated release notes            |
| `Commit conventions`    | Pull request                                  | Enforces conventional commit/PR naming                                                                  |

Automatic production deployment is serialized through the `production` concurrency group. A failed quality or security job prevents both deployment jobs. Backend and frontend deploy in parallel only after the gate succeeds; production verification waits for both.

Manual deployment is intended for a previously reviewed commit or rollback. It reruns backend, frontend and PostgreSQL integration gates before using production secrets.

## Required GitHub environment and secrets

Create a GitHub environment named `production`. Enable required reviewers if the release policy needs approval, and add:

| Secret               | Purpose                                                            |
| -------------------- | ------------------------------------------------------------------ |
| `RENDER_API_KEY`     | Bearer token permitted to deploy the backend service               |
| `RENDER_SERVICE_ID`  | Render backend service ID (`srv-...`)                              |
| `VERCEL_TOKEN`       | Vercel deployment token                                            |
| `VERCEL_ORG_ID`      | Vercel team/user ID                                                |
| `VERCEL_PROJECT_ID`  | Linked frontend project ID                                         |
| `BACKEND_HEALTH_URL` | Public Render readiness URL ending in `/actuator/health/readiness` |
| `FRONTEND_URL`       | Canonical Vercel production HTTPS URL                              |

Repository/organization secret `NVD_API_KEY` is recommended for reliable OWASP Dependency-Check database updates.

Database credentials, `JWT_SECRET`, encryption keys, SMTP passwords and AI provider keys belong in Render. They are not required in GitHub because Render injects them at runtime. Vite secrets must never be created: every `VITE_*` value is public browser configuration.

## Deployment sequence

1. Merge a reviewed PR into `main`.
2. `CI` verifies backend, frontend, browser workflows and PostgreSQL migrations.
3. `Production deployment` receives the exact successful SHA.
4. The release security gate reruns secret and dependency checks.
5. Render API deploys that commit and is polled until its deployment is `live`.
6. Vercel CLI pulls production settings, builds and deploys prebuilt output.
7. Verification checks backend readiness, frontend availability and the Vercel `/api` proxy.

Render and Vercel Git auto-deploy should be disabled when GitHub Actions is authoritative; otherwise two independent systems can race or redeploy a rolled-back revision.

## Rollback

### Application-compatible rollback

1. Identify the last green commit and its Render deploy/Vercel deployment IDs.
2. Run `Production deployment` manually with the 40-character commit SHA. The workflow reruns all quality gates.
3. Alternatively, use Render's rollback endpoint with the approved deploy ID and Vercel's promotion/redeploy command under incident authorization.
4. Verify health and critical flows, then record the incident and active revision.

Render rollback API:

```bash
curl --request POST \
  --header "Authorization: Bearer $RENDER_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{"deployId":"dep-previous"}' \
  "https://api.render.com/v1/services/$RENDER_SERVICE_ID/rollback"
```

### Migration/data incident

Do not edit or undo applied Flyway files. Stop writes and choose an approved forward-fix migration or restore the pre-release PostgreSQL recovery point. Match the application revision to the restored Flyway history and complete reconciliation before reopening traffic.

## Branch and release strategy

- `main`: protected, production source; merge only through reviewed PRs.
- `develop`: protected integration branch.
- `feature/*`: branch from and merge into `develop` unless the team uses short-lived mainline branches.
- `release/*`: stabilization only; merge to `main` and back to `develop`.
- `hotfix/*`: branch from `main`; merge to `main` and back to `develop`.

Configure GitHub rulesets for `main` and `develop`; workflow files cannot enforce repository settings themselves. Require pull requests, resolved conversations, non-stale approvals, linear history if desired, and these checks:

- backend;
- frontend;
- database-integration;
- frontend-e2e;
- Security jobs;
- commit conventions.

Restrict force pushes and deletion. Limit production environment deployment to `main` and semantic tags, with required reviewers where appropriate.

Release tags follow SemVer: `vMAJOR.MINOR.PATCH` with optional prerelease suffix, for example `v1.4.0` or `v2.0.0-rc.1`. Create a tag only from a fully green, reviewed commit.

## Pull-request requirements

Use conventional subjects such as `feat:`, `fix:`, `docs:`, `ci:` and `chore:`. Complete the PR validation and rollback sections. Dependabot opens weekly Maven, npm and GitHub Actions updates; dependency updates pass the same gates as product changes.

## Failure behavior

- A CI, migration, lint, test, build or security failure stops deployment.
- Render is polled for up to ten minutes and fails on terminal failure states.
- Production verification retries transient network/startup failures but does not hide persistent failures.
- `cancel-in-progress: false` prevents one production deployment from interrupting another.
- The previously live Render/Vercel deployment remains available when a new build fails before promotion; operational rollback remains explicit when failure occurs after promotion.
