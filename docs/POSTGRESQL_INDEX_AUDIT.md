# PostgreSQL Index Audit

## Executive Summary

This audit is based on the committed Flyway migrations `V1` through `V16` and every production access path found under `backend/src/main/java`: Spring Data derived queries, `JpaRepository` calls, `JdbcTemplate` SQL, pagination, joins, aggregates, and development-only seed SQL. It does not infer workload from an architecture document.

Implementation status: the audited SQL has now been added as `backend/src/main/resources/db/migration/V17.1__index_optimization.sql`. It will be applied by Flyway on the next deployment against a database whose schema history is current through V16.

| Measure | Result |
|---|---:|
| Tables | 38 |
| Explicit `CREATE INDEX` indexes | 30 |
| Primary-key indexes created automatically | 38 |
| Unique-constraint indexes created automatically | 18 |
| Total physical indexes after V16 | 86 |
| Exact duplicate indexes | 0 |
| Superseded/redundant indexes safe to remove with the recommended replacements | 4 |
| Query-backed indexes to add | 13 |
| Existing indexes to keep | 82 |
| Physical indexes after the recommendation | 95 |
| JSONB columns | 8 |
| JSONB indexes justified | 0 |
| Optimization score before changes | 72/100 |
| Expected score after changes | 91/100 |

The schema is structurally sound and does not contain exact duplicate indexes. Its principal weakness is that several indexes preserve the old schema's column choices but do not match the implemented PostgreSQL query shapes. In particular:

- `resumes (user_id, status, created_at)` cannot support active resume pagination by `updated_at`, deleted-resume pagination by `deleted_at`, or user/date analytics because `status` is an unconstrained middle column.
- `notifications (user_id, status, created_at)` cannot provide creation-time order when `status` is not constrained and does not help the `read_at IS NULL` path.
- global admin timelines and global date-range analytics cannot use indexes whose leading column is a user or entity identifier.
- `ai_prompt_templates (workflow, locale, status)` filters correctly but still sorts to satisfy `ORDER BY version DESC LIMIT 1`.

There is no evidence for GIN, expression, or covering indexes. The JSONB values are returned or written as whole payloads and never appear in a JSON predicate. `INCLUDE` would duplicate wide or frequently updated values without a demonstrated index-only workload.

One non-index production blocker was discovered while reading the required repository SQL: `AiUsageRepository.spentThisMonth` contained MySQL `DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-01')`. PostgreSQL cannot execute that expression. The implementation pass replaced it with the PostgreSQL UTC-month boundary expression; it is intentionally outside the index migration.

## Table-by-Table Analysis

### `users`

- Existing physical indexes: primary key `(id)`, unique `(email)`, unique `(phone)`.
- Repository usage: login/profile lookups by email; phone existence checks; admin pagination with `deleted_at IS NULL ORDER BY created_at DESC`; account counts and active-user/date-range analytics.
- Analysis: unique email and phone indexes fully support identity lookups. The admin list and global user analytics currently require a sequential scan and sort as the table grows.
- Recommendation: keep all existing indexes; add `users_active_created_idx (created_at DESC) WHERE deleted_at IS NULL`.
- Expected path: index scan for paginated active users; index or bitmap scan for bounded active-user creation ranges. Counts over a large fraction of users may still choose a sequential scan, correctly.

### `user_profiles`

- Existing indexes: primary key `(id)`, unique `(user_id)`.
- Usage: lookup through `user.email` and the profile's user relationship; upsert on `user_id`.
- Analysis: the unique index is the exact join/upsert access path.
- Recommendation: keep; add nothing.

### `refresh_tokens`

- Existing indexes: primary key, unique `(token_hash)`, `(user_id, expires_at)`.
- Usage: token-hash lookup; active tokens by `user_id AND revoked=false`; bulk revocation by user.
- Analysis: token lookup is exact. The user/expiry index provides the useful user prefix, although `expires_at` does not help the revoked predicate.
- Recommendation: keep. A partial revoked index is not justified without token volume/runtime evidence.

### `resumes`

- Existing indexes: primary key, `(user_id, status, created_at)`, `(template_id)`.
- Usage: owned active list ordered by `updated_at DESC`; owned deleted list constrained by recovery cutoff and ordered by `deleted_at DESC`; owned lookup by id; user/global creation-date analytics; template join; soft deletes.
- Analysis: the current user/status/created index matches no implemented status-filtered query. Three distinct, repeatedly executed shapes require different ordering/range support.
- Recommendation: drop `idx_resumes_user_status_created`; add:
  - `(user_id, updated_at DESC) WHERE deleted_at IS NULL` for the primary resume list;
  - `(user_id, deleted_at DESC) WHERE deleted_at IS NOT NULL` for recovery pagination;
  - `(user_id, created_at) WHERE deleted_at IS NULL` for user/date analytics;
  - `(created_at) WHERE deleted_at IS NULL` for global admin analytics.
  Keep `(template_id)` for the FK/template relationship.

### `resume_sections`

- Existing indexes: primary key, `(resume_id, display_order)`.
- Usage: Hibernate collection loading by resume; ATS joins; ordered section retrieval/reordering.
- Analysis: the composite index supplies the FK prefix and display order.
- Recommendation: keep; add nothing.

### `educations`, `experiences`, `projects`, `skills`, `certifications`

- Existing indexes: each table's primary key `(id)`, which is also its FK to `resume_sections`.
- Usage: joined-subclass lookups and ATS left joins on `id=resume_sections.id`.
- Analysis: each PK is the exact one-to-one join index. A second FK index would duplicate it.
- Recommendation: keep; add nothing.

### `templates`

- Existing indexes: primary key, unique `(name)`.
- Usage: lookup/upsert by name; lookup by id; active catalog ordered by name.
- Analysis: the unique name index can provide name order while filtering `is_active`; the catalog is also intrinsically small.
- Recommendation: keep; no partial active index and no configuration GIN index.

### `resume_versions`

- Existing indexes: primary key, unique `(resume_id, version_number)`, `(resume_id, created_at)`, `(template_id)`.
- Usage: next/max version, newest version by `version_number`, paginated version list ordered by version number, lookup by id, template FK.
- Analysis: the unique composite is the principal runtime index and supports reverse scanning by version. `(resume_id, created_at)` is not used by current readers, but it is retained pending runtime index statistics because it is not an exact duplicate and may support operational chronology. Template index protects the FK path.
- Recommendation: keep all for now; validate `idx_resume_versions_resume_created` with `pg_stat_user_indexes` before any later removal.

### `resume_version_snapshots`

- Existing indexes: primary key, unique `(resume_version_id)`.
- Usage: exact join by version; snapshot insert.
- Analysis: exact coverage. JSONB content is only stored and returned.
- Recommendation: keep; no JSONB index.

### `ai_providers`

- Existing indexes: primary key, unique `(provider_key)`.
- Usage: provider lookup/upsert by key and FK joins.
- Analysis: exact support. Capabilities JSONB is not searched.
- Recommendation: keep; no JSONB index.

### `ai_requests`

- Existing indexes: primary key, `(user_id, created_at)`, `(resume_id, created_at)`, `(status, created_at)`.
- Usage: inserts; per-user date analytics; global date analytics. No production reader filters by resume or status.
- Analysis: user analytics is supported. Global analytics cannot use the user-leading index. Resume/status indexes are code-unreferenced but are retained conservatively for FK/operational paths until runtime statistics are available.
- Recommendation: add `(created_at)`; keep existing indexes pending `pg_stat_user_indexes` evidence.

### `ai_generated_contents`

- Existing indexes: primary key, unique `(ai_request_id)`.
- Usage: one generated-content insert per request; relationship lookup.
- Analysis: exact one-to-one support. Metadata JSONB is never searched.
- Recommendation: keep; no JSONB index.

### `ai_request_attempts`

- Existing indexes: primary key, unique `(ai_request_id, attempt_number)`.
- Usage: insert attempts and relationship access.
- Analysis: unique composite supplies the FK prefix and attempt identity.
- Recommendation: keep.

### `ai_usage_ledger`

- Existing indexes: primary key, `(user_id, created_at)`.
- Usage: monthly spend and user date-range token/cost sums.
- Analysis: correct equality-then-range order. Heap access remains necessary for sums.
- Recommendation: keep. Do not add `INCLUDE` because token/cost values are insert-heavy and there is no measured index-only benefit.

### `job_descriptions`

- Existing indexes: primary key, `(user_id, created_at)`.
- Usage: owned non-deleted list ordered by creation; owned id lookup; ATS lookup by primary key.
- Analysis: user/created supports list order and the PK supports detail/ATS access. `deleted_at` is a residual filter.
- Recommendation: keep. A partial replacement should wait for table size and deletion-rate evidence.

### `ats_reports`

- Existing indexes: primary key, `(resume_id, created_at)`, `(job_description_id, created_at)`.
- Usage: per-resume history ordered by creation; detail by id; per-user analytics joined through resume; global creation-date analytics.
- Analysis: resume history and user analytics are supported. The global range is not.
- Recommendation: add `(created_at)`; retain both FK-leading composites.

### `ats_keyword_matches`

- Existing indexes: primary key, `(ats_report_id)`.
- Usage: report-child lookup with `ORDER BY importance_weight DESC, keyword`.
- Analysis: index restricts to one report, followed by a small in-memory sort. Child cardinality per report is expected to be low.
- Recommendation: keep. Extending the index for ordering is not justified without evidence of unusually large reports.

### `ats_missing_skills`

- Existing indexes: primary key, `(ats_report_id)`.
- Usage: report-child lookup ordered by skill name.
- Analysis: report filtering is indexed; small child result is sorted.
- Recommendation: keep; no composite extension.

### `ats_recommendations`

- Existing indexes: primary key, `(ats_report_id)`.
- Usage: report-child lookup ordered by id.
- Analysis: report restriction is indexed; returned child sets are small.
- Recommendation: keep.

### `job_matches`

- Existing indexes: primary key, unique `(resume_id, job_description_id)`, `(resume_id, match_score)`.
- Usage: only conflict-target insert/update by resume and job is present in production code; no reader currently consumes `match_score` ordering.
- Analysis: the unique index exactly supports the upsert. The score index is code-unreferenced, but removing it is deferred because job-match listing is a natural operational path and runtime statistics are unavailable.
- Recommendation: keep for now; classify `idx_job_matches_resume_score` as a runtime-statistics removal candidate, not a V17.1 drop.

### `notifications`

- Existing indexes: primary key, `(user_id, status, created_at)`.
- Usage: all notifications by user ordered by creation; unread notifications with `read_at IS NULL` ordered by creation; mark one by PK/owner; mark all unread for a user.
- Analysis: unconstrained `status` prevents the existing composite from supplying creation order. It also does not support `read_at IS NULL`.
- Recommendation: replace it with `(user_id, created_at DESC)` and partial `(user_id, created_at DESC) WHERE read_at IS NULL`.

### `subscriptions`

- Existing indexes: primary key, unique `(current_user_id)`, `(user_id, starts_at)`.
- Usage: current subscription, subscription history ordered by start, count, cancellation.
- Analysis: user/start supports history and user restriction. The generated-column unique constraint enforces one current subscription, while the repository predicates on `user_id/is_current`; the user-leading history index still narrows that lookup.
- Recommendation: keep. Do not add another current-subscription index without plan/cardinality evidence.

### `payment_transactions`

- Existing indexes: primary key, unique `(provider, provider_reference)`, `(subscription_id, occurred_at)`.
- Usage: provider idempotency and user payment history through subscriptions ordered by occurrence.
- Analysis: both access paths are supported. Multiple subscriptions may require a final merge/sort, but the per-subscription range is indexed.
- Recommendation: keep.

### `usage_metrics`

- Existing indexes: primary key, unique `(metric_date, metric_name, dimension_key)`, `(metric_name, metric_date)`.
- Usage: conflict-target rollup and date-range listing ordered by date/name/dimension. No query filters by metric name first.
- Analysis: the unique index exactly supports both upsert and the complete list order. The second index is redundant for implemented queries.
- Recommendation: drop `idx_usage_metrics_name_date`; keep the unique index.

### `audit_logs`

- Existing indexes: primary key, `(entity_type, entity_id, created_at)`, `(user_id, created_at)`.
- Usage: personal history by user ordered by creation; global admin history ordered by creation; counts.
- Analysis: personal history is supported. Global admin history cannot use either leading column and will sort all rows.
- Recommendation: add `(created_at DESC)`. Keep entity index because audit investigations commonly depend on it and it is not duplicated, although no current endpoint exposes that query.

### `admin_action_logs`

- Existing indexes: primary key, `(admin_user_id, created_at)`.
- Usage: global admin-action history ordered by creation and count.
- Analysis: the admin-leading index cannot supply global chronology.
- Recommendation: add `(created_at DESC)`. Retain admin-leading index pending runtime evidence and for actor-specific investigation.

### `password_reset_tokens`

- Existing indexes: primary key, unique `(token_hash)`, `(user_id, expires_at)`.
- Usage: exact hash lookup.
- Analysis: unique hash is exact. User/expiry is currently code-unreferenced but supports FK/token lifecycle operations.
- Recommendation: keep pending runtime statistics.

### `email_verification_tokens`

- Existing indexes: primary key, unique `(token_hash)`, `(user_id, expires_at)`.
- Usage: exact hash lookup and unused tokens by user.
- Analysis: hash and user-prefix access are supported; `used_at` is residual.
- Recommendation: keep. A partial unused-token index is not warranted without volume evidence.

### `ai_prompt_templates`

- Existing indexes: primary key, unique `(workflow, version, locale)`, `(workflow, locale, status)`.
- Usage: max version by workflow/locale; lifecycle transitions by workflow/version/status; unpublish by workflow/locale/status; published lookup ordered by version descending with limit one.
- Analysis: the lookup index filters but sorts; the unique index cannot efficiently use `locale` when `version` is unconstrained. One four-column index supports the main lookup and max-version access.
- Recommendation: replace `idx_ai_prompt_templates_lookup` with `(workflow, locale, status, version DESC)`.

### `ai_jobs`

- Existing indexes: primary key `(id)`, `(user_id, created_at)`.
- Usage: owned lookup and state transitions always start with `id`; no persistent history-list query exists.
- Analysis: PK drives all current reads/updates. User/created is code-unreferenced but retained until runtime statistics verify non-use and product retention requirements are settled.
- Recommendation: no V17.1 change; runtime-statistics removal candidate.

### `user_ai_settings`

- Existing index: primary key `(user_id)`.
- Usage: exact lookup/upsert/update by user.
- Analysis: exact support; PK is also FK index.
- Recommendation: keep.

### `user_ai_provider_credentials`

- Existing indexes: primary key, unique `(user_id, provider)`.
- Usage: exact lookup, upsert, and delete by user/provider.
- Analysis: exact support and user FK prefix.
- Recommendation: keep.

### `pdf_exports`

- Existing indexes: primary key, `(user_id, created_at)`, `(resume_id, created_at)`.
- Usage: per-resume history ordered by creation, user date analytics, global date analytics.
- Analysis: per-resume and per-user paths are supported. Global date ranges are not.
- Recommendation: add `(created_at)`; keep both existing composites.

### `user_notification_preferences`

- Existing index: primary key `(user_id)`.
- Usage: exact user join and upsert conflict target.
- Analysis: exact support and FK coverage.
- Recommendation: keep.

## Repository Analysis

| Repository/access component | Principal queries | Current support | Recommended improvement |
|---|---|---|---|
| `UserRepository` | email/phone existence and lookup | Unique indexes exact | None |
| `UserProfileRepository` | profile through user email | User email unique + profile user unique | None |
| `RefreshTokenRepository` | hash; active tokens by user | Hash exact; user prefix usable | None |
| `PasswordResetTokenRepository` | hash lookup | Exact unique index | None |
| `EmailVerificationTokenRepository` | hash; unused by user | Hash exact; user prefix usable | None |
| `ResumeRepository` | active/deleted owned pagination | Existing composite does not match predicates/order | Replace with active-updated, deleted-deleted-at, and analytics indexes |
| `ResumeSectionRepository`/Hibernate | PK CRUD and collection loading | PK + resume/order exact | None |
| `ResumeVersionRepository` | max/latest/list by version | Unique resume/version exact | None |
| `TemplateRepository` | active name-ordered catalog, id lookup | Name unique/PK adequate | None |
| `AiPromptRepository` | workflow/locale/status latest version | Filter indexed; sort remains | Add version to lookup index |
| `AiJobRepository` | PK-owned lookup and state transitions | PK exact | None |
| `AiUsageRepository` | provider key; user/month spend | Provider unique and user/date exact | Index unchanged; fix non-PostgreSQL date expression separately |
| `AiUserSettingsRepository` | settings/credential exact keys | PK/unique exact | None |
| `AtsRepository` | ATS input; report history/detail/children | PK/FK indexes generally exact | Add global report date index for admin analytics only |
| `JobRepository` | owned active jobs ordered by creation | User/created supports | None |
| `NotificationRepository` | all/unread ordered timeline | Existing status middle column blocks ordering | Replace with user/created and unread partial indexes |
| `SubscriptionRepository` | current/history/payments | Existing user/time composites usable | None |
| `PdfExportRepository` | owned resume and history | PK + resume/created exact | Add global created index for analytics |
| `AuditRepository` | personal/global paginated chronology | Personal supported; global unsupported | Add global created index |
| `AdminRepository` | active users and global actions | Email/PK exact; timelines unsupported | Add active user/created and global action/created indexes |
| `AnalyticsRepository` | user and global date aggregates | User paths mostly supported; global paths unsupported | Add global date indexes and resume user/date index |
| `UsageMetricService` | rollup upsert; date-ordered range | Unique rollup index exact | Remove unused name/date index |
| `Notification preferences` | exact user join/upsert | PK exact | None |
| `DevDataSeeder` | idempotent development-only probes | Several probes may scan | No production indexes justified by dev-only code |

No `NamedParameterJdbcTemplate`, `SimpleJdbcInsert`, Criteria API, JPA `Specification`, named query, or custom `@Query` access path exists in the production source tree.

## JSONB Analysis

| Table.column | Runtime use | GIN? | Expression index? | Decision |
|---|---|---:|---:|---|
| `ai_providers.capabilities` | mapped/stored; no JSON predicate | No | No | Payload only |
| `ai_generated_contents.metadata` | mapped/stored; no JSON predicate | No | No | Payload only |
| `job_descriptions.extracted_skills` | concatenated as text during ATS input, never searched with JSON operators | No | No | A GIN index cannot help string concatenation |
| `audit_logs.before_state` | inserted and returned whole | No | No | Audit payload only |
| `audit_logs.after_state` | inserted and returned whole | No | No | Audit payload only |
| `admin_action_logs.details` | constructed and returned whole | No | No | Audit payload only |
| `templates.configuration` | returned/rendered whole | No | No | Catalog payload only |
| `resume_version_snapshots.content` | exact version join then returned whole | No | No | Snapshot payload only |

No repository uses `@>`, `?`, `?|`, `?&`, `jsonb_path_*`, `->`, or `->>` in a filter. Adding GIN or expression indexes would add write amplification and storage without serving a query.

## Composite Index Review

- Equality columns correctly precede range/order columns in the effective composites: token user/expiry, section resume/order, ATS report resume/created, subscriptions user/start, payments subscription/occurred, audit user/created, PDF user-or-resume/created, and AI usage user/created.
- `idx_resumes_user_status_created` is suboptimal because `status` is not constrained by current list or analytics queries. It prevents use of `created_at` ordering/ranges after `user_id`.
- `idx_notifications_user_status_created` has the same middle-column problem and targets the wrong unread signal (`read_at`, not status).
- `idx_ai_prompt_templates_lookup` has correct filter columns but lacks the requested version order.
- The unique `resume_versions(resume_id, version_number)` supports both `MAX(version_number)` and reverse scans for newest versions; another version-order index is unnecessary.
- The unique `usage_metrics(metric_date, metric_name, dimension_key)` exactly matches range/list order and conflict detection.
- PostgreSQL B-tree indexes can scan backward, so explicit `DESC` is not mandatory for single-direction columns. It is included in timeline index definitions to document intended access and remains compatible with reverse scans.

## Foreign-Key Index Review

PostgreSQL does not automatically index referencing columns. The following review distinguishes an indexed FK from a query-justified FK index.

| Foreign key | Indexed? | Needed by current queries? | Decision |
|---|---:|---:|---|
| `user_profiles.user_id -> users.id` | Yes, unique | Yes | Keep |
| `refresh_tokens.user_id -> users.id` | Yes | Yes | Keep |
| `resumes.user_id -> users.id` | Yes | Yes | Replace current composite with better user-leading indexes |
| `resumes.template_id -> templates.id` | Yes | Join/relationship | Keep |
| `resume_sections.resume_id -> resumes.id` | Yes | Yes | Keep |
| five subtype `id -> resume_sections.id` FKs | Yes, PK | Yes | Keep; no duplicate index |
| `resume_versions.resume_id -> resumes.id` | Yes, unique prefix | Yes | Keep |
| `resume_versions.template_id -> templates.id` | Yes | Relationship/constraint operations | Keep |
| `resume_version_snapshots.resume_version_id -> resume_versions.id` | Yes, unique | Yes | Keep |
| `ai_requests.user_id -> users.id` | Yes | Yes | Keep |
| `ai_requests.resume_id -> resumes.id` | Yes | No current reader | Keep pending runtime stats |
| `ai_requests.provider_id -> ai_providers.id` | No | No provider-filtered reader | Do not invent an index |
| `ai_generated_contents.ai_request_id -> ai_requests.id` | Yes, unique | Relationship | Keep |
| `ai_request_attempts.ai_request_id -> ai_requests.id` | Yes, unique prefix | Relationship | Keep |
| `ai_usage_ledger.user_id -> users.id` | Yes | Yes | Keep |
| `ai_usage_ledger.provider_id -> ai_providers.id` | No | No current filter/join driving from provider | No index |
| `ai_usage_ledger.ai_request_id -> ai_requests.id` | No | No current reader | No index |
| `job_descriptions.user_id -> users.id` | Yes | Yes | Keep |
| `ats_reports.resume_id -> resumes.id` | Yes | Yes | Keep |
| `ats_reports.job_description_id -> job_descriptions.id` | Yes | FK and seed probes | Keep |
| three ATS child `ats_report_id` FKs | Yes | Yes | Keep |
| `job_matches.resume_id -> resumes.id` | Yes, unique prefix | Upsert | Keep |
| `job_matches.job_description_id -> job_descriptions.id` | No standalone prefix | No query drives by job | Do not add |
| `notifications.user_id -> users.id` | Yes | Yes | Replace with better user-leading indexes |
| `subscriptions.user_id -> users.id` | Yes | Yes | Keep |
| `payment_transactions.subscription_id -> subscriptions.id` | Yes | Yes | Keep |
| `audit_logs.user_id -> users.id` | Yes | Yes | Keep |
| `admin_action_logs.admin_user_id -> users.id` | Yes | No current actor filter | Keep pending stats |
| `admin_action_logs.target_user_id -> users.id` | No | No target lookup | Do not add |
| `password_reset_tokens.user_id -> users.id` | Yes | Lifecycle only | Keep |
| `email_verification_tokens.user_id -> users.id` | Yes | Yes | Keep |
| `ai_jobs.user_id -> users.id` | Yes | No current list | Keep pending stats |
| `user_ai_settings.user_id -> users.id` | Yes, PK | Yes | Keep |
| `user_ai_provider_credentials.user_id -> users.id` | Yes, unique prefix | Yes | Keep |
| `pdf_exports.user_id -> users.id` | Yes | Yes | Keep |
| `pdf_exports.resume_id -> resumes.id` | Yes | Yes | Keep |
| `user_notification_preferences.user_id -> users.id` | Yes, PK | Yes | Keep |

Missing standalone FK indexes were not recommended where no repository query uses that FK as a leading predicate or join driver. Parent-row delete performance alone is insufficient evidence here because the application uses soft deletion and exposes no hard-delete workflow for those parents.

## Covering Index Review

No `INCLUDE` index is recommended.

- Timeline/detail APIs return many or wide columns, including JSONB and text, so an index-only covering index would be large and expensive.
- Aggregate queries need values such as cost and token counts. Including them could theoretically allow index-only scans, but `ai_usage_ledger` is append-heavy and visibility-map coverage has not been measured.
- Pagination queries select whole entities or broad DTOs. Covering them would approach table duplication.
- PostgreSQL index-only scans still require favorable visibility-map state. No production `EXPLAIN (ANALYZE, BUFFERS)` or heap-fetch measurements were supplied.

Revisit `INCLUDE` only if production plans show a stable, high-frequency query dominated by heap fetches after the base index corrections.

## Duplicate Index Review

### Exact duplicates

None. No explicit index duplicates a primary-key or unique-constraint index column-for-column.

### Safe replacements/removals in V17.1

| Index | Reason |
|---|---|
| `idx_resumes_user_status_created` | No runtime query constrains status; superseded by indexes matching active, deleted, and analytics paths |
| `idx_notifications_user_status_created` | Status is unconstrained; superseded by all-history and unread-history indexes |
| `idx_ai_prompt_templates_lookup` | Superseded by the same filter prefix plus version ordering |
| `idx_usage_metrics_name_date` | No metric-name-leading query; unique rollup index exactly supports implemented range/order |

### Code-unreferenced but not safe to remove without runtime evidence

- `idx_ai_requests_resume_created`
- `idx_ai_requests_status_created`
- `idx_ats_reports_job_created`
- `idx_job_matches_resume_score`
- `idx_admin_action_logs_admin_created`
- `idx_resume_versions_resume_created`
- `idx_ai_jobs_user_created`

These are not exact duplicates. Before dropping them, inspect at least one representative production statistics window using `pg_stat_user_indexes`, reset timestamps, table size, and maintenance/FK workflows. Static source analysis can call them code-unreferenced, not truly unused.

## Recommended Migration

The audit proves a migration is justified. It is implemented as `V17.1__index_optimization.sql`. This SQL is intentionally limited to query-backed `CREATE INDEX` and superseded `DROP INDEX` statements; it does not alter tables, constraints, or business logic.

```sql
DROP INDEX idx_resumes_user_status_created;
DROP INDEX idx_notifications_user_status_created;
DROP INDEX idx_ai_prompt_templates_lookup;
DROP INDEX idx_usage_metrics_name_date;

CREATE INDEX idx_users_active_created
    ON users (created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_resumes_user_active_updated
    ON resumes (user_id, updated_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_resumes_user_deleted_at
    ON resumes (user_id, deleted_at DESC)
    WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_resumes_user_active_created
    ON resumes (user_id, created_at)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_resumes_active_created
    ON resumes (created_at)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_notifications_user_created
    ON notifications (user_id, created_at DESC);

CREATE INDEX idx_notifications_user_unread_created
    ON notifications (user_id, created_at DESC)
    WHERE read_at IS NULL;

CREATE INDEX idx_ai_prompt_templates_published_lookup
    ON ai_prompt_templates (workflow, locale, status, version DESC);

CREATE INDEX idx_admin_action_logs_created
    ON admin_action_logs (created_at DESC);

CREATE INDEX idx_audit_logs_created
    ON audit_logs (created_at DESC);

CREATE INDEX idx_ai_requests_created
    ON ai_requests (created_at);

CREATE INDEX idx_pdf_exports_created
    ON pdf_exports (created_at);

CREATE INDEX idx_ats_reports_created
    ON ats_reports (created_at);
```

The migration adds 13 indexes and removes four, resulting in `86 - 4 + 13 = 95` physical indexes.

For a large production database, ordinary `CREATE INDEX` takes stronger locks than `CREATE INDEX CONCURRENTLY`. Flyway transactional execution and concurrent index creation require a deployment-specific strategy; do not mechanically add `CONCURRENTLY` to this transaction without confirming the configured Flyway transaction model. For a new or small database, the shown transactional migration is Flyway-compatible.

After deployment, let autovacuum refresh statistics or run targeted `ANALYZE` during the rollout for:

```sql
ANALYZE users;
ANALYZE resumes;
ANALYZE notifications;
ANALYZE ai_prompt_templates;
ANALYZE admin_action_logs;
ANALYZE audit_logs;
ANALYZE ai_requests;
ANALYZE pdf_exports;
ANALYZE ats_reports;
```

`ANALYZE` is operational guidance, not part of the index-only Flyway migration.

## EXPLAIN ANALYZE Recommendations

The following are expected planner shapes, not fabricated observed plans. PostgreSQL may correctly prefer sequential scans on small tables or low-selectivity ranges. Validate on production-like cardinalities with `EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS)` and representative bind values.

| Important query | Expected path after V17.1 | Why / potential optimization |
|---|---|---|
| Active resume page by user, `ORDER BY updated_at DESC LIMIT/OFFSET` | Nested loop from unique user email to index scan on `idx_resumes_user_active_updated` | Equality on user plus matching partial predicate and order eliminates sort |
| Deleted resume recovery page | Nested loop + index scan on `idx_resumes_user_deleted_at` | User equality, `deleted_at` range, and order align |
| Admin active-user page | Index scan on `idx_users_active_created` | Partial predicate and order align; count may separately use seq/bitmap scan |
| User analytics: active resumes in date range | Index/bitmap scan on `idx_resumes_user_active_created` | Equality then date range; partial predicate removes deleted rows |
| Global resume analytics | Index/bitmap scan on `idx_resumes_active_created` | Direct created-at range with partial predicate |
| Notification history | Nested loop from user email + index scan on `idx_notifications_user_created` | User equality and created order align |
| Unread notifications / read-all | Index scan or bitmap scan on `idx_notifications_user_unread_created` | Partial index contains only unread rows |
| Published prompt latest version | Index scan on `idx_ai_prompt_templates_published_lookup`, stop after first row | All filters plus requested version order; no sort |
| Personal audit history | Nested loop + index scan on existing `idx_audit_logs_user_created` | User equality and created order already align |
| Global audit history | Index scan on `idx_audit_logs_created` | Direct global order with LIMIT/OFFSET |
| Global admin-action history | Index scan on `idx_admin_action_logs_created` | Direct global order with LIMIT/OFFSET |
| Global AI/PDF/ATS date totals | Index-only scan is possible but index/bitmap scan is more conservative | Narrow date indexes avoid full-table scans; visibility determines heap fetches |
| User activity grouped by `DATE(created_at)` | Index/bitmap range scan followed by hash aggregate and final sort | Base range is indexed; expression grouping still requires aggregation. No expression index is justified because range predicates use raw timestamp |
| ATS input document assembly | Nested loops/left joins via PK and `resume_sections(resume_id, display_order)`, then aggregate | All joins are key-based; hash aggregate/group aggregate choice depends on section count |
| Payment history across a user's subscriptions | Nested loop from user to subscriptions to payment index, possibly final sort | Existing FK/time indexes narrow rows; global chronological merge may still sort |
| Usage metrics date listing | Range index scan on unique rollup index | Unique index order exactly matches filter/order |

Recommended validation sequence:

1. Capture current plans and buffers before V17.1 with representative small, medium, and large accounts.
2. Apply the migration and refresh statistics.
3. Repeat exactly the same binds.
4. Confirm sorts disappeared where expected, buffer reads decreased, and write overhead remains acceptable.
5. Query `pg_stat_user_indexes` after a representative workload window before considering any code-unreferenced index removal.

Do not force planner settings such as `enable_seqscan=off` when evaluating production behavior; that only proves an index can be used, not that it should be used.

## Final Summary

Production index readiness is **72/100 before** and an estimated **91/100 after** the conservative V17.1 changes. The estimate reflects query/index alignment, not measured latency.

Remaining risks:

- Offset pagination remains progressively expensive at deep pages even with ordered indexes. No seek-pagination change is proposed because that would change API behavior.
- Global count/aggregate queries may legitimately scan many rows; indexes help selective date windows but cannot make broad totals free.
- Static source inspection cannot prove an index is unused. Runtime `pg_stat_user_indexes` data is required before removing the seven code-unreferenced candidates.
- Table cardinalities, data distribution, cache state, bloat, autovacuum health, and visibility-map coverage were unavailable, so actual scan types must be confirmed with production-like `EXPLAIN (ANALYZE, BUFFERS)`.
- The corrected `AiUsageRepository.spentThisMonth` UTC boundary should be exercised against the deployment database as part of integration verification.

Recommended next step: review the V17.1 block, capture baseline plans on production-like data, deploy the index migration with the locking strategy appropriate to database size, refresh statistics, and compare plans/buffers. Do not add JSONB, expression, partial, or covering indexes beyond those in this report without new repository queries or measured plan evidence.
