# Flyway MySQL-to-PostgreSQL Migration Strategy Report

## 1. Executive summary

The repository contains 16 ordered MySQL Flyway migrations. They are not a safe input for PostgreSQL and must not be edited, renamed, repaired, or replayed against PostgreSQL.

### Recommended strategy: Option C — immutable MySQL history plus a PostgreSQL baseline lineage

Use a new, vendor-isolated PostgreSQL migration location containing one PostgreSQL baseline migration representing the application schema at the cutover boundary, followed only by new PostgreSQL versioned migrations. Preserve the existing MySQL `V1`–`V16` files byte-for-byte in a MySQL-only historical location.

Conceptually:

```text
MySQL lineage (immutable)
db/migration/mysql/V1 ... V16

PostgreSQL lineage (new)
db/migration/postgresql/B16__postgresql_baseline.sql
db/migration/postgresql/V17__first_postgresql_change.sql
...
```

The filenames above describe the recommended future structure; this analysis does **not** create, move, rename, or edit any SQL file.

Why this is safer than the alternatives:

- Reusing `V1`–`V16` for different PostgreSQL SQL creates two meanings and two checksums for the same versions.
- Replaying 16 historical implementation steps is unnecessary when PostgreSQL is a new physical database.
- A baseline describes the required schema state, rather than reproducing obsolete intermediate states such as the phone OTP feature.
- Vendor-isolated locations prevent MySQL SQL from being discovered by a PostgreSQL Flyway run.
- Starting normal PostgreSQL evolution at `V17` preserves the semantic cutover boundary: versions 1–16 are legacy history, baseline 16 is the PostgreSQL starting state, and version 17 is the first shared post-cutover change.
- Data transfer is kept separate from schema versioning, making reconciliation, retries, and rollback safer.

Option A alone is insufficient because a baseline in the current shared location would still expose PostgreSQL to the MySQL migrations. Option B alone is better, but recreating PostgreSQL versions `V1`–`V16` would still produce conflicting version identities and duplicate historical evolution. Option C combines isolation with a new baseline lineage and is therefore the safest strategy.

## 2. Current Flyway configuration observations

- Migration location: `classpath:db/migration`.
- `spring.flyway.baseline-on-migrate=true`.
- `spring.flyway.baseline-version=1`.
- The existing files are ordinary versioned migrations (`V` prefix), not Flyway baseline migrations (`B` prefix).
- The existing migration chain contains schema DDL, constraints, indexes, runtime catalog seeds, and feature lifecycle changes.
- The project currently uses `ddl-auto=none` generally and `ddl-auto=validate` in production, so Flyway is intended to own schema creation.

`baseline-on-migrate` is not a substitute for a baseline migration. It inserts a baseline marker when Flyway encounters a non-empty schema with no history table; it does not create the schema. It should not be used as a shortcut for constructing the PostgreSQL database.

## 3. Migration-by-migration audit

### V1 — Core identity and resume schema

**Purpose:** Establish users, profiles, authentication refresh tokens, resumes, and the initial normalized resume-section hierarchy.

**Depends on:** Nothing before it.

**Objects created:**

- Tables: `users`, `user_profiles`, `refresh_tokens`, `resumes`, `resume_sections`, `educations`, `experiences`, `projects`, `skills`, `certifications`.
- Primary keys on every table.
- Unique constraints: `uk_users_email`, `uk_user_profiles_user`, `uk_refresh_tokens_hash`.
- Check constraints: `chk_users_role`, `chk_users_status`, `chk_resumes_status`.
- Foreign keys:
  - `user_profiles.user_id → users.id`
  - `refresh_tokens.user_id → users.id`
  - `resumes.user_id → users.id`
  - `resume_sections.resume_id → resumes.id`
  - Each subtype table's `id → resume_sections.id`
- Indexes:
  - `idx_resumes_user_status_created`
  - `idx_resume_sections_resume_order`
  - `idx_refresh_tokens_user_expiry`

**Identity columns:** Five `AUTO_INCREMENT` columns: `users.id`, `user_profiles.id`, `refresh_tokens.id`, `resumes.id`, `resume_sections.id`. Subtype IDs are shared primary/foreign keys and are intentionally not identities.

**MySQL-specific elements:**

- `AUTO_INCREMENT`
- `DATETIME(6)`
- `ENGINE=InnoDB`
- `DEFAULT CHARSET=utf8mb4`
- `COLLATE=utf8mb4_unicode_ci`
- MySQL collation semantics affect email uniqueness and text comparisons.

**JSON / generated columns / seed data:** None.

**Classification:** Complete rewrite for the PostgreSQL baseline because identity behavior, timestamp types, collation/case semantics, and pervasive table options must be designed deliberately.

### V2 — Database architecture extensions

**Purpose:** Add templates, versioned resume snapshots, AI request/usage structures, job matching, ATS reports, notifications, subscriptions, payments, metrics, audit records, and initial runtime catalog seeds.

**Depends on:**

- `V1.users`
- `V1.resumes`

**Objects modified:**

- `resumes`: adds `target_job_title`, `template_id`, and FK `fk_resumes_template`.

**Tables created (20):**

- `templates`
- `resume_versions`
- `resume_version_snapshots`
- `ai_providers`
- `ai_requests`
- `ai_generated_contents`
- `ai_request_attempts`
- `ai_usage_ledger`
- `job_descriptions`
- `ats_reports`
- `ats_keyword_matches`
- `ats_missing_skills`
- `ats_recommendations`
- `job_matches`
- `notifications`
- `subscriptions`
- `payment_transactions`
- `usage_metrics`
- `audit_logs`
- `admin_action_logs`

**Foreign-key groups:**

- Resume/version graph: resume versions reference resumes/templates; snapshots reference versions.
- AI graph: requests reference users/resumes/providers; generated content and attempts reference requests; ledger references users/providers/requests.
- ATS/job graph: descriptions reference users; reports and matches reference resumes/descriptions; keyword, missing-skill, and recommendation rows reference reports.
- Notification/subscription graph: notifications and subscriptions reference users; payments reference subscriptions.
- Audit graph: audit logs reference users; admin logs reference admin and target users.

**Unique constraints:**

- Template name and provider key.
- Resume version number per resume.
- One snapshot and one generated-content row per parent.
- AI request attempt number per request.
- Resume/job match pair.
- Current subscription user through a generated column.
- Payment provider/reference pair.
- Usage metric rollup tuple.

**Check constraints:** Resume version source, AI request status, ATS score ranges and categories, match score, notification status, subscription plan/status, payment status.

**Indexes:** 19 ordinary indexes plus one MySQL `FULLTEXT` index. They are declared inline inside `CREATE TABLE`, which PostgreSQL does not support in the same form.

**Identity columns:** All surrogate `BIGINT id` columns use `AUTO_INCREMENT` (20 identity columns in this migration).

**JSON columns:**

- `templates.configuration`
- `resume_version_snapshots.content`
- `ai_providers.capabilities`
- `ai_generated_contents.metadata`
- `job_descriptions.extracted_skills`
- `audit_logs.before_state`
- `audit_logs.after_state`
- `admin_action_logs.details`

**Generated column:**

- `subscriptions.current_user_id` is a stored generated column implementing “one current subscription per user” through a nullable unique key.

**Seed data:**

- `classic` system template.
- `gemini` and `openai` AI providers.
- Seeds use `ON DUPLICATE KEY UPDATE`.

**MySQL-specific elements:**

- `AUTO_INCREMENT`, `DATETIME(6)`, `MEDIUMTEXT`
- `JSON` behavior and validation semantics
- Inline `INDEX`
- `FULLTEXT INDEX`
- `ON DUPLICATE KEY UPDATE` and `VALUES(column)`
- Generated-column expression and its use as a conditional-uniqueness workaround
- InnoDB, charset, and collation clauses

**Classification:** Complete rewrite. This migration contains the largest concentration of structural and semantic PostgreSQL decisions: `json` versus `jsonb`, full-text search design, partial unique indexes, identity strategy, upsert conflict targets, and collation behavior.

### V3 — Authentication security tokens

**Purpose:** Add login-security state and email/password recovery token tables.

**Depends on:** `V1.users`.

**Objects modified:** `users` gains `failed_login_attempts`, `locked_until`, `verified_at`, and `last_login_at`.

**Objects created:**

- Tables: `password_reset_tokens`, `email_verification_tokens`.
- Unique token-hash keys.
- User foreign keys.
- User/expiry indexes.

**Identity columns:** Two `AUTO_INCREMENT` IDs.

**MySQL-specific elements:** `AUTO_INCREMENT`, `DATETIME(6)`, `UNIQUE KEY`, and inline `INDEX`.

**Classification:** Syntax-focused rewrite. The logical model is portable, but DDL syntax and timestamp/identity types must change.

### V4 — AI prompt management

**Purpose:** Create versioned prompt templates and seed the initial resume-summary prompt.

**Depends on:** No object from an earlier migration, although Flyway executes it after V3.

**Objects created:** `ai_prompt_templates`, one composite unique constraint, and lookup index.

**Identity columns:** One `AUTO_INCREMENT` ID.

**Runtime seed data:** One published `resume-summary` prompt. This is application runtime data, not test data.

**MySQL-specific elements:** `AUTO_INCREMENT`, `DATETIME(6)`, `UNIQUE KEY`, inline `INDEX`, and `ON DUPLICATE KEY UPDATE ... VALUES(...)`.

**Classification:** Syntax-focused rewrite, with a deliberate PostgreSQL `ON CONFLICT` seed policy required.

### V5 — AI background jobs

**Purpose:** Add asynchronous AI job persistence.

**Depends on:** `V1.users`.

**Objects created:** `ai_jobs`, user FK, and user/created index.

**Identity columns:** None; the primary key is an application-provided `CHAR(36)` UUID representation.

**MySQL-specific elements:** `MEDIUMTEXT`, `DATETIME(6)`, and inline `INDEX`.

**Classification:** Syntax-focused rewrite. The PostgreSQL design should separately decide whether to retain `char(36)` compatibility or use native `uuid`; that decision affects application mappings and data transfer.

### V6 — AI prompt lifecycle

**Purpose:** Add category, author, review, and publication lifecycle fields to prompt templates.

**Depends on:** `V4.ai_prompt_templates`.

**Objects modified:** `ai_prompt_templates`.

**MySQL-specific elements:** `DATETIME(6)`. No FK is created for `author_id`.

**Classification:** Minor syntax/type changes.

### V7 — User AI provider credentials

**Purpose:** Add per-user AI settings, credential-source tracking, and encrypted BYOK credentials.

**Depends on:**

- `V1.users`
- `V2.ai_requests`

**Objects modified:** `ai_requests` gains `credential_source` and a check constraint.

**Objects created:**

- `user_ai_settings`
- `user_ai_provider_credentials`
- User foreign keys, provider/mode/source checks, and a unique `(user_id, provider)` constraint.

**Identity columns:** One `AUTO_INCREMENT` credential ID.

**MySQL-specific elements:** `AFTER provider_id`, `VARBINARY`, `AUTO_INCREMENT`, `DATETIME(6)`, InnoDB/charset/collation clauses.

**Classification:** Syntax/type rewrite. Binary data maps naturally to PostgreSQL `bytea`, but compatibility must be validated with the encryption converter.

### V8 — PDF export history

**Purpose:** Record generated PDF metadata and ownership.

**Depends on:** `V1.users` and `V1.resumes`.

**Objects created:** `pdf_exports`, user/resume FKs, and two history indexes.

**Identity columns:** One `AUTO_INCREMENT` ID.

**MySQL-specific elements:** `AUTO_INCREMENT`, `DATETIME(6)`, inline indexes, InnoDB/charset/collation.

**Classification:** Syntax-focused rewrite.

### V9 — Resume content and presentation

**Purpose:** Add contact, content, and rendering preferences directly to resumes.

**Depends on:** `V1.resumes`.

**Objects modified:** `resumes`.

**Columns added:** Contact email, phone, location, GitHub/LinkedIn URLs, six content/language fields, font family/size, line and section spacing, and margin.

**Constraints:** Five rendering-range/enumeration checks.

**MySQL-specific elements:** `MEDIUMTEXT`; otherwise most types and checks are portable.

**Classification:** Minor syntax/type changes.

### V10 — User onboarding preferences

**Purpose:** Add persona, career goal, onboarding completion, and mark existing accounts complete.

**Depends on:** `V1.users`.

**Objects modified:** `users`.

**Runtime data update:** Sets `onboarding_completed=TRUE` for all existing users. This is a production backfill, not static seed data.

**MySQL-specific elements:** Column placement through `AFTER`.

**Classification:** Minor syntax changes. The baseline should encode the final default/schema state; the historical backfill belongs to MySQL history and should not be blindly replayed during PostgreSQL data migration.

### V11 — Phone verification

**Purpose:** Add verified phone login and OTP challenges.

**Depends on:**

- `V1.users`
- `V3.users.verified_at`, because `phone_verified_at` is positioned `AFTER verified_at`

**Objects modified:** `users` gains phone, verification timestamp, and unique phone constraint.

**Objects created:** `phone_otp_challenges`, user FK, and two indexes.

**Identity columns:** One `AUTO_INCREMENT` ID.

**MySQL-specific elements:** `AFTER`, `DATETIME(6)`, `AUTO_INCREMENT`, inline indexes.

**Current-state warning:** The application has since removed the phone-verification workflow. Phone remains contact information, but OTP entities/endpoints and `phone_verified_at` are no longer part of the active application model. A PostgreSQL baseline should describe the active cutover schema, not automatically reproduce retired runtime objects.

**Classification:** Complete redesign decision for the baseline. Do not translate mechanically.

### V12 — Profile photos

**Purpose:** Store profile photo bytes and metadata.

**Depends on:** `V1.user_profiles`.

**Objects modified:** `user_profiles`.

**MySQL-specific elements:** `MEDIUMBLOB`.

**Classification:** Minor type change (`bytea` is the likely PostgreSQL equivalent, subject to application validation).

### V13 — Notification preferences

**Purpose:** Store one notification-preference row per user.

**Depends on:** `V1.users`.

**Objects created:** `user_notification_preferences` with a shared PK/FK to `users`.

**MySQL-specific elements:**

- `DATETIME(6)`
- `DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`
- InnoDB/charset/collation

**Classification:** Complete behavioral decision. PostgreSQL has no direct `ON UPDATE CURRENT_TIMESTAMP` column clause; timestamp maintenance must be application-managed or trigger-managed.

### V14 — Resume template engine catalog

**Purpose:** Convert the classic template configuration to structured JSON and seed ten additional system templates.

**Depends on:**

- `V2.templates`
- Semantically, the `classic` row seeded by V2

**Objects modified:** Existing `classic` template row.

**Runtime seed/catalog data:** `modern`, `professional`, `creative`, `minimal`, `executive`, `academic`, `student`, `developer`, and `designer`, plus `corporate`; also updates `classic`.

**JSON:** Extensive nested objects and arrays defining layout, section order, supported/required/sidebar sections, themes, colors, and fonts.

**MySQL-specific elements:**

- `JSON_OBJECT`
- `JSON_ARRAY`
- `ON DUPLICATE KEY UPDATE`
- `VALUES(column)` in the update clause

**Classification:** Complete rewrite because the JSON expressions and idempotent catalog-upsert semantics must be represented safely in PostgreSQL.

### V15 — Remove legacy classic template

**Purpose:** Soft-disable the legacy `classic` template.

**Depends on:**

- Directly: `V2.templates`
- Semantically: `V14`, because it follows the catalog expansion

**Objects modified:** `templates` data only.

**Runtime data update:** Sets `classic.is_active=FALSE`.

**MySQL-specific elements:** None material.

**Classification:** Portable SQL.

### V16 — Resume candidate name

**Purpose:** Add a candidate full-name field to resumes.

**Depends on:**

- `V1.resumes`
- `V2.resumes.target_job_title`, because the column is positioned after it

**Objects modified:** `resumes`.

**MySQL-specific elements:** `AFTER target_job_title`.

**Classification:** Minor syntax change.

## 4. Dependency graph

### Flyway execution-order graph

Flyway version ordering makes every migration operationally dependent on the successful completion of every lower version:

```text
V1
 ↓
V2
 ↓
V3
 ↓
V4
 ↓
V5
 ↓
V6
 ↓
V7
 ↓
V8
 ↓
V9
 ↓
V10
 ↓
V11
 ↓
V12
 ↓
V13
 ↓
V14
 ↓
V15
 ↓
V16
```

### Direct object/semantic dependency graph

```text
V1 users ───────────┬─→ V2
                    ├─→ V3
                    ├─→ V5
                    ├─→ V7
                    ├─→ V8
                    ├─→ V10
                    ├─→ V11
                    └─→ V13

V1 resumes ─────────┬─→ V2
                    ├─→ V8
                    ├─→ V9
                    └─→ V16

V1 user_profiles ─────→ V12

V2 ai_requests ───────→ V7
V2 templates/classic ─→ V14 ─→ V15
V4 prompt_templates ──→ V6
V3 verified_at ───────→ V11 (column-order dependency)
V2 target_job_title ──→ V16 (column-order dependency)
```

Direct dependencies by version:

| Migration | Direct dependencies |
|---|---|
| V1 | None |
| V2 | V1 |
| V3 | V1 |
| V4 | None at object level |
| V5 | V1 |
| V6 | V4 |
| V7 | V1, V2 |
| V8 | V1 |
| V9 | V1 |
| V10 | V1 |
| V11 | V1, V3 |
| V12 | V1 |
| V13 | V1 |
| V14 | V2 |
| V15 | V2; semantically V14 |
| V16 | V1, V2 |

## 5. Classification matrix

| Version | Portable | Minor/syntax rewrite | Complete rewrite/design | Runtime seed/backfill | JSON | Indexes | Identity |
|---|---:|---:|---:|---:|---:|---:|---:|
| V1 | No | No | Yes | No | No | Yes | Yes |
| V2 | No | No | Yes | Yes | Yes | Yes | Yes |
| V3 | No | Yes | No | No | No | Yes | Yes |
| V4 | No | Yes | No | Yes | No | Yes | Yes |
| V5 | No | Yes | No | No | No | Yes | No |
| V6 | No | Yes | No | No | No | No | No |
| V7 | No | Yes | No | No | No | No | Yes |
| V8 | No | Yes | No | No | No | Yes | Yes |
| V9 | No | Yes | No | No | No | No | No |
| V10 | No | Yes | No | Backfill | No | No | No |
| V11 | No | No | Yes | No | No | Yes | Yes |
| V12 | No | Yes | No | No | No | No | No |
| V13 | No | No | Yes | No | No | No | No |
| V14 | No | No | Yes | Yes | Yes | No | No |
| V15 | Yes | No | No | Data update | No | No | No |
| V16 | No | Yes | No | No | No | No | No |

### Runtime seed/data migrations

- V2: template and AI-provider catalog seeds.
- V4: initial AI prompt seed.
- V10: existing-user onboarding backfill.
- V14: template catalog configuration and seeds.
- V15: classic-template deactivation.

### JSON migrations

- V2 defines eight JSON-bearing tables/columns.
- V14 constructs and writes nested JSON catalog documents.

### Index-bearing migrations

- V1, V2, V3, V4, V5, V8, and V11.
- Unique constraints in other migrations also create supporting unique indexes in both database engines.

### Identity-bearing migrations

- V1, V2, V3, V4, V7, V8, and V11.

## 6. Flyway checksum behavior

Flyway calculates a checksum from each resolved migration's content and stores it in `flyway_schema_history` when the migration succeeds. On later validation or migration runs, Flyway resolves the migration again and compares its current checksum with the stored checksum.

Consequences:

- Editing whitespace, comments, or SQL in an applied versioned migration can change its checksum.
- A mismatch produces validation failure because the file no longer represents what the database executed.
- `flyway repair` updates history metadata to match local files; it does not rerun changed SQL or make the physical database match the edited script.
- Two files with the same version but different vendor SQL cannot safely share one history identity.
- Migration filename, type, version, description, success state, and checksum together form auditable deployment history.

Editing existing migrations is dangerous because development databases recreated from edited files would have one schema, while production databases retaining the original execution would have another schema under the same version number. Flyway would no longer be able to prove that environments are equivalent. This is silent schema drift disguised as successful version history.

The safe correction model is append-only: add a new forward migration that changes the current schema. For a database-engine replacement, create a new baseline lineage rather than mutating the old engine's history.

## 7. How production teams normally change database engines

A database-engine migration is normally treated as a controlled platform cutover, not as an in-place Flyway dialect edit:

1. Freeze and inventory the source schema, migrations, runtime SQL, and data semantics.
2. Define the target PostgreSQL schema from the current application contract.
3. Create a target baseline and validate it repeatedly on empty PostgreSQL databases.
4. Build a separate, restartable data-copy pipeline.
5. Reconcile counts, keys, nullability, checksums/hashes, sequences, and critical business aggregates.
6. Run application compatibility and performance tests against PostgreSQL.
7. Rehearse cutover and rollback using production-like data.
8. Stop or capture source writes during the final synchronization window.
9. Switch application traffic only after schema/data acceptance gates pass.
10. Keep MySQL intact and read-only until the rollback window expires.

Flyway should own the PostgreSQL schema state. It should not be used as a bulk cross-engine data-transfer tool.

## 8. Step-by-step execution plan

### Phase 1 — Freeze and evidence

1. Tag the last MySQL production release and record the exact checksums in its `flyway_schema_history`.
2. Back up the MySQL migration files and production history table.
3. Record schema metadata: tables, columns, defaults, indexes, FKs, checks, collations, generated expressions, and row counts.
4. Confirm which retired objects are intentionally excluded from the PostgreSQL target, especially phone OTP structures.
5. Freeze schema changes or require every new schema change to be represented in both the cutover design and the active production lineage.

### Phase 2 — Define the cutover contract

1. Derive the target schema from the current application/entity/repository contract, not merely from historical V1–V16 text.
2. Decide PostgreSQL identity strategy (`generated ... as identity` is generally preferable to legacy `serial`).
3. Decide `json` versus `jsonb` per column and define required JSON indexes.
4. Define case-sensitivity rules for email, names, keys, and unique constraints; consider `citext` or expression indexes only after application semantics are agreed.
5. Replace MySQL full-text behavior with an explicitly tested PostgreSQL text-search design.
6. Replace generated-column conditional uniqueness with the clearest PostgreSQL design, normally a partial unique index if semantics permit.
7. Decide timestamp ownership and timezone policy (`timestamp` versus `timestamptz`).
8. Decide whether timestamps such as notification preference `updated_at` are application-managed or trigger-managed.
9. Map binary, large text, and UUID storage with the Java mappings.
10. Separate static catalog seeds from mutable operational data.

### Phase 3 — Establish vendor isolation

1. Preserve V1–V16 byte-for-byte in a MySQL-only migration location.
2. Configure MySQL deployments to resolve only that historical location while they remain active.
3. Configure PostgreSQL deployments to resolve only the new PostgreSQL location.
4. Add automated checks that reject duplicate versions and prevent PostgreSQL from discovering MySQL migrations.
5. Do not use `repair` to reconcile cross-vendor checksums.

### Phase 4 — Build the PostgreSQL baseline (future implementation phase)

1. Create one baseline migration at the V16 cutover boundary.
2. Include the final active schema, constraints, indexes, and immutable catalog rows required to start the application.
3. Exclude obsolete intermediate structures only after documenting and approving each exclusion.
4. Keep bulk production data outside the baseline.
5. Start subsequent PostgreSQL schema evolution at V17.
6. Validate the baseline on a brand-new empty PostgreSQL database.

No baseline SQL is generated by this report.

### Phase 5 — Data migration pipeline

1. Extract MySQL data consistently from a snapshot or controlled replication point.
2. Transform types and values explicitly, including booleans, zero dates, timestamp timezone assumptions, JSON validity, binary values, and text encodings.
3. Load tables in FK-safe order or use a controlled constraint strategy.
4. Preserve IDs where required for relationships.
5. Reset every PostgreSQL identity sequence above the imported maximum ID.
6. Load mutable catalog data according to an explicit source-of-truth policy.
7. Reconcile table counts, orphan checks, uniqueness, key ranges, and critical domain totals.
8. Make the process restartable and idempotent without relying on Flyway migration repair.

### Phase 6 — Validation and rehearsal

1. Run Flyway `info` and `validate` against a clean PostgreSQL build.
2. Verify Hibernate schema validation without allowing Hibernate to mutate schema.
3. Run repository/native-query tests against PostgreSQL.
4. Exercise JSON, full-text search, generated/partial uniqueness, binary credentials, and timestamp behavior.
5. Run migration and reconciliation on a production-sized sanitized copy.
6. Measure load time, index creation time, locking, query plans, and rollback duration.
7. Perform at least one full cutover rehearsal.

### Phase 7 — Production cutover

1. Announce and enter the approved maintenance or write-freeze window.
2. Stop application writes to MySQL.
3. Take the final recoverable MySQL backup and record the source position/time.
4. Apply the PostgreSQL baseline to an empty target.
5. Run final data extraction/transformation/load.
6. Reset identities and run all reconciliation gates.
7. Start a canary application instance against PostgreSQL with Flyway validation enabled.
8. Execute smoke tests and critical read/write journeys.
9. Switch traffic gradually.
10. Keep MySQL read-only and available for rollback.

## 9. Rollback strategy

The primary rollback is an application/database endpoint rollback, not reverse SQL:

1. Before cutover, take and verify a restorable MySQL backup.
2. Stop MySQL writes before the final copy so rollback does not require merging two diverged write streams.
3. Keep MySQL infrastructure unchanged and read-only during PostgreSQL validation.
4. Define objective rollback triggers: reconciliation failure, authentication failure, elevated error rate, unacceptable latency, or data-integrity exceptions.
5. If a trigger fires before PostgreSQL becomes authoritative, stop PostgreSQL writes, point the application back to MySQL, and restore normal MySQL writes.
6. If PostgreSQL accepts production writes, capture those writes before rollback. A simple endpoint reversal may lose PostgreSQL-only changes; either maintain CDC/dual capture or make the rollback window short and operationally write-frozen.
7. Preserve the failed PostgreSQL database for forensic analysis; do not “repair” its Flyway history.

Flyway Community versioned migrations are forward migrations. Rollback must use backups, traffic control, and explicitly designed compensating migrations—not edits to applied files.

## 10. Principal risks

| Risk | Severity | Mitigation |
|---|---|---|
| Same V1–V16 versions acquire different vendor checksums | Critical | Immutable MySQL lineage plus PostgreSQL baseline lineage |
| MySQL migration accidentally runs on PostgreSQL | Critical | Vendor-specific locations and automated discovery checks |
| Data loss during cutover/rollback | Critical | Write freeze or CDC, verified backup, reconciliation gates |
| Case/collation behavior changes unique keys | High | Explicit PostgreSQL collation/case design and duplicate pre-scan |
| Identity sequences collide after preserved-ID load | High | Reset and verify every sequence |
| JSON semantics or invalid source JSON differ | High | Validate/transform JSON and choose `jsonb` deliberately |
| Full-text results/performance change | High | PostgreSQL-specific search design and query-plan tests |
| Generated current-subscription uniqueness changes | High | Partial unique index/design validation |
| `ON UPDATE CURRENT_TIMESTAMP` behavior disappears | Medium | Explicit application or trigger ownership |
| Retired phone-verification schema is recreated | Medium | Baseline from active contract with approved exclusion list |
| Mutable seed/catalog rows are overwritten | Medium | Define seed ownership and use explicit conflict policy |
| MySQL zero dates/timezone assumptions fail | High | Source profiling and timestamp normalization |
| Binary credential data changes | High | Round-trip encryption/decryption tests |
| Flyway baseline settings mark an incomplete schema as valid | Critical | Build schema with a baseline migration; tightly control or disable automatic baselining |

## 11. Estimated effort

Assuming one experienced database engineer with application support:

| Workstream | Estimate |
|---|---:|
| Schema inventory and target decisions | 2–4 engineer-days |
| PostgreSQL baseline implementation and review | 4–7 engineer-days |
| Data transformation/load tooling | 4–8 engineer-days |
| Repository/runtime SQL compatibility | 3–7 engineer-days |
| Automated reconciliation and tests | 3–5 engineer-days |
| Performance tuning and production rehearsal | 3–6 engineer-days |
| Cutover runbook and rollback rehearsal | 2–3 engineer-days |
| Total | Approximately 21–40 engineer-days |

The range increases with production data volume, downtime constraints, full-text requirements, invalid legacy data, and the need for near-zero-downtime CDC.

## 12. Things that must never be done

- Never edit an applied V1–V16 migration.
- Never generate PostgreSQL SQL under the same V1–V16 version identities.
- Never run `flyway repair` merely to hide a checksum mismatch.
- Never delete or manually rewrite production `flyway_schema_history`.
- Never point PostgreSQL Flyway at the MySQL migration location.
- Never rely on `baseline-on-migrate` to create or verify the PostgreSQL schema.
- Never use Hibernate automatic DDL as a substitute for the reviewed baseline.
- Never put bulk production data into the schema baseline.
- Never assume MySQL `JSON`, collation, full-text search, generated columns, timestamps, booleans, or upserts have identical PostgreSQL behavior.
- Never cut over without resetting and validating identity sequences.
- Never cut over without row-count and integrity reconciliation.
- Never roll back after PostgreSQL writes without accounting for those new writes.
- Never remove the MySQL source or backups before the rollback window closes.
- Never execute the current MySQL migration chain against PostgreSQL as an experiment in any shared environment.

## 13. Acceptance gates before SQL conversion begins

- The immutable status and stored checksums of MySQL V1–V16 are recorded.
- Option C and the V16 baseline boundary are approved.
- Vendor-specific migration locations and deployment selection are designed.
- The active target schema, including retired phone-verification objects, is approved.
- Identity, timestamp, JSON, collation, full-text, conditional uniqueness, binary, and UUID policies are decided.
- Runtime seed ownership is documented.
- Data migration and reconciliation tooling has an owner and test plan.
- Cutover downtime/CDC strategy and rollback window are approved.
- No SQL conversion begins until these decisions are complete.
