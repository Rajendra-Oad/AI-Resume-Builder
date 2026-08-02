# PostgreSQL Query Performance Audit

## Executive Summary

This audit covers every persistence source under `backend/src/main/java` after V17.1. It includes Spring Data derived methods, inherited `JpaRepository` CRUD used by services, `JdbcTemplate`, native SQL strings, pagination/count companions, analytics, dashboard, AI, ATS, job matching, subscription, audit, PDF, notification, template, profile, and development-seed access.

| Measure | Result |
|---|---:|
| Persistence source files | 23 |
| Production `JdbcTemplate` execution sites | 76 |
| Development-only seeder execution sites | 20 |
| Declared Spring Data derived-query shapes | 14 |
| Explicit/derived production access paths | 90 |
| Additional Hibernate CRUD SQL | Runtime-generated from inherited repository methods |
| Critical query groups | 8 |
| Potentially high-cost query groups at scale | 5 |
| Queries using JSONB search | 0 |
| New indexes justified beyond V17.1 | 0 |
| Required query changes | 0 |
| Overall static performance score | 88/100 |

The query layer is production-capable for expected small-to-medium account workloads. V17.1 supplies the missing B-tree paths for active/deleted resume pages, notification timelines, global admin timelines, prompt-version lookup, and global analytics ranges. V17.2 correctly added no JSONB indexes.

The score is not based on fabricated latency. It reflects static alignment between predicates, joins, ordering, pagination, and the committed indexes. No production row counts, data distributions, cache state, bloat metrics, `pg_stat_statements`, or measured `EXPLAIN (ANALYZE, BUFFERS)` plans were supplied.

The five scale-sensitive groups are:

1. global dashboard/admin counts that may scan a large fraction of a table;
2. `AnalyticsRepository.userActivity`, which performs four range aggregates and an outer aggregate/sort;
3. ATS input assembly, which joins the section inheritance tables and performs `STRING_AGG`;
4. deep `OFFSET` pagination across resumes, versions, billing, audit, users, and admin actions;
5. unbounded notification, job, ATS-history, and PDF-history lists.

No repository rewrite is required now. Several recommendations are operational measurements or future API-scale safeguards. Seek pagination, new endpoint limits, and deterministic tie-breakers would change observable API behavior or ordering and therefore are not implemented by this audit.

## Repository Review

### `UserRepository`

Queries: `existsByEmail`, `findByEmail`, `findByEmailAndDeletedAtIsNull`, `existsByPhone`, plus inherited id CRUD/save.

- Purpose/frequency: authentication and current-user resolution are high frequency; registration uniqueness checks are moderate.
- Expected plan: unique index scan or index-only scan on `users.email`/`users.phone`; PK scan by id.
- Result size: zero or one row.
- Issue: none. Hibernate may perform an existence projection rather than load the row.
- Recommendation: no change.

### `UserProfileRepository`

Query: `findByUserEmailAndUserDeletedAtIsNull`, plus profile save.

- Expected plan: unique email lookup on users followed by nested-loop unique lookup on `user_profiles(user_id)`.
- Result size: zero or one row, although photo payload can be large.
- Issue: profile retrieval may fetch `photo_data` with the entity even when only text profile fields are needed, depending on Hibernate mapping/load behavior. This is a payload concern, not a query/index defect.
- Recommendation: verify selected columns from Hibernate SQL before considering projection changes; no current rewrite.

### `RefreshTokenRepository`

Queries: exact token hash; active tokens by user; save/revoke/delete through inherited methods.

- Expected plan: unique hash index scan; user-prefix index scan on `(user_id, expires_at)` with residual `revoked=false`.
- Result size: normally few tokens per user.
- Issue: none at expected cardinality.
- Recommendation: no change.

### `PasswordResetTokenRepository`

Query: exact hash lookup plus inherited writes.

- Expected plan: unique token-hash index scan.
- Result size: at most one.
- Recommendation: no change.

### `EmailVerificationTokenRepository`

Queries: exact hash; unused tokens for a user.

- Expected plan: unique hash scan; user/expiry index scan with residual `used_at IS NULL`.
- Result size: small per account.
- Recommendation: no change; a partial index is not justified without token-volume evidence.

### `ResumeRepository`

Queries: active owned page, owned active detail, deleted recovery page, deleted detail, inherited PK CRUD/save.

- Active page: user email join, `deleted_at IS NULL`, order `updated_at DESC`, `LIMIT/OFFSET`; V17.1 `idx_resumes_user_active_updated` matches.
- Deleted page: user email join, `deleted_at > cutoff`, order `deleted_at DESC`; V17.1 `idx_resumes_user_deleted_at` matches.
- Detail: PK lookup is expected to drive, followed by ownership/deletion checks.
- Page counts: Spring Data emits companion counts; the partial user-leading indexes support filtering but counts still visit every matching index entry.
- Issues: deep OFFSET cost; timestamp-only ordering is not deterministic for ties. `updated_at` is nullable in DDL, and PostgreSQL `DESC` defaults to `NULLS FIRST`.
- Recommendation: no behavior change now. If stable cursor pagination is later approved, use `(timestamp, id)` ordering and seek predicates.

### `ResumeSectionRepository`

Queries: inherited `save`, `saveAll`, `delete`, id operations; Hibernate loads the resume collection.

- Expected plan: PK operations and `idx_resume_sections_resume_order` for collection loading.
- Joined inheritance: Hibernate may join the five subtype tables by their PK/FK id; nested loops are expected for a small section collection.
- Recommendation: inspect actual Hibernate SQL for N+1 behavior in production tracing; indexes are adequate.

### `ResumeVersionRepository`

Seven execution sites: parent-row lock, version insert with `MAX+1`, newest inserted version id, snapshot insert, paginated list, list count, and version/snapshot detail.

- `SELECT ... FOR UPDATE` uses resume PK and intentionally serializes writers.
- `MAX(version_number)+1` and newest-version lookup use unique `(resume_id, version_number)`, including backward scan.
- List/count join users→resume→versions using unique email, resume PK, and resume/version index.
- Detail uses version PK and unique snapshot relationship.
- Issues: OFFSET depth and timestamp-independent but version-number-stable ordering. The post-insert “newest version” lookup is safe because the parent lock serializes writers.
- Recommendation: no change.

### `TemplateRepository`

Three execution sites: active list ordered by name, active detail by id, and owned-resume template update.

- Catalog is bounded and small; sequential scan plus sort or name-index scan are both reasonable.
- Detail/update paths use PKs and unique user email.
- Whole JSON configuration is returned; V17.2 correctly recommends no JSON index.
- Recommendation: no change.

### `AiPromptRepository`

Seven sites: max/next version, insert draft, two transition forms, unpublish, latest published instruction, and locale lookup.

- V17.1 `(workflow, locale, status, version DESC)` permits filtered latest-version lookup without sort and can help workflow/locale max-version access.
- Unique `(workflow, version, locale)` supports version-specific operations.
- Transitions are narrow updates; row counts per workflow are expected small.
- Recommendation: no change. Verify latest published lookup uses an index scan with early LIMIT termination.

### `AiJobRepository`

Five sites: insert, owned id lookup, and three guarded state transitions.

- PK `(id)` drives every read/update; user/status are residual guards on one row.
- Result size: one.
- `idx_ai_jobs_user_created` remains unused by current persistent-history queries, as documented in V17.1.
- Recommendation: no query change.

### `AiUsageRepository`

Six sites: provider lookup, request insert, generated-content insert, attempt insert, ledger insert, and monthly spend.

- Provider key is unique; writes use PK/FK targets.
- Monthly spend filters by `user_id` and UTC month timestamp; `(user_id, created_at)` provides equality then range.
- Aggregate requires heap values for `cost_estimate`; index-only behavior is not assumed.
- The former MySQL date expression has been corrected to PostgreSQL UTC month truncation.
- Recommendation: no change; measure ledger growth and monthly range selectivity.

### `AiUserSettingsRepository`

Six sites: exact settings lookup/upsert, exact credential lookup/upsert/delete, settings reset.

- PK or unique `(user_id, provider)` drives all operations.
- Result size: zero/one.
- Recommendation: no change.

### `AtsRepository`

Eleven execution sites: analysis input, report insert, match upsert, child inserts, report list/detail, and three child lists.

- Analysis input locates one resume/user/job then left-joins sections and five PK-linked subtype tables. `STRING_AGG` groups by resume/job.
- Report history uses `(resume_id, created_at)` in order.
- Detail starts by report PK; child queries use `ats_report_id` indexes and sort small child sets.
- Match upsert uses unique `(resume_id, job_description_id)`.
- Potential issue: ATS assembly cost grows with sections and text size, not total system rows. It remains a critical query because it performs multiple joins and aggregation synchronously.
- Recommendation: capture an actual plan with a maximum-size resume. No rewrite/index is statically justified.

### `JobRepository`

Four sites: owned non-deleted list, owned detail, insert-returning, soft delete.

- List uses user email then `(user_id, created_at)` with residual deletion filter.
- Detail/update use job PK plus ownership.
- Issue: list is unbounded; memory/response cost grows per user.
- Recommendation: API pagination is the eventual scale fix, but it changes behavior and is not applied here.

### `NotificationRepository`

Six sites: all/unread list, read update, post-update detail, read-all update, preference read, preference upsert.

- V17.1 user/created and unread partial indexes match both timeline modes.
- Single read uses notification PK and ownership.
- Read-all can use the unread partial index, then update matching heap rows.
- Preferences use unique user email and preference PK.
- Issue: notification list is unbounded. Indexing removes sort cost but not transfer/materialization cost.
- Recommendation: no current rewrite; introduce pagination only through an approved API change.

### `SubscriptionRepository`

Seven sites: current subscription, free creation, history/count, payment history/count, cancellation.

- User/start index supports subscription restriction/history.
- Generated-current unique constraint enforces one current row; current query may use the user-leading history index and filter `is_current`.
- Payment path joins a user's usually small subscription set to `(subscription_id, occurred_at)`, possibly followed by a final sort across subscriptions.
- OFFSET pages have the standard deep-page cost.
- Recommendation: no change. Validate payment history only if users accumulate many subscription records.

### `PdfExportRepository`

Three sites: owned resume document with template, export insert, and per-resume history.

- Document query uses user email, resume PK, and template PK; expected nested loops.
- History uses `(resume_id, created_at)` and verifies user through the stored `user_id`.
- Issue: history is unbounded; metadata payload is narrow but grows indefinitely.
- Recommendation: no behavior change; future pagination requires endpoint evolution.

### `AuditRepository`

Five sites: append, personal list/count, global list/count.

- Personal list uses `(user_id, created_at)`; global list uses V17.1 created index.
- Counts traverse all matching entries; global count may choose sequential/parallel scan.
- JSON states are heap payloads and correctly unindexed.
- OFFSET and non-unique created timestamps affect deep/stable pagination.
- Recommendation: no rewrite now; production retention and pagination depth are the key operational controls.

### `AdminRepository`

Eight sites: active users/count, guarded role/status update, token revocation, action insert, user detail, global action list/count.

- V17.1 active-user/created and admin-action/created indexes remove list sorts.
- User detail/update uses PK; admin attribution uses unique email.
- Token revocation uses the refresh-token user prefix.
- Broad counts may scan many entries.
- Recommendation: no query change.

### `AnalyticsRepository`

Three SQL execution sites but many aggregate subqueries:

- user totals: seven scalar aggregates over resumes, ATS, PDF, AI requests, and AI ledger;
- user activity: four `UNION ALL` branches grouped by date, then outer aggregate/order;
- admin totals: seven global scalar counts.

V17.1 supplies user/date and global/date indexes. These remain the most likely CPU/I/O-heavy reads because aggregates must process every row in the requested range. Details appear in the analytics section below.

Recommendation: retain current behavior. Measure with representative maximum date ranges before consolidating subqueries or adopting pre-aggregation.

### `UsageMetricService`

Two sites: atomic daily rollup upsert and date-range ordered listing.

- Unique `(metric_date, metric_name, dimension_key)` is both conflict target and ordered range index.
- Result size is number of metrics × dimensions × dates, expected bounded.
- Recommendation: no change.

### `DevDataSeeder`

Twenty SQL sites execute only under the `dev` profile and explicit property. They include idempotent `NOT EXISTS` probes, seeded lookups, and inserts.

- Several probes (source URL, title, seed audit action) are not perfectly indexed.
- Production indexes must not be added for development-only startup behavior.
- Recommendation: no production change.

### Access mechanisms not present

No production use was found for `NamedParameterJdbcTemplate`, `SimpleJdbcInsert`, JPA Criteria API, `Specification`, `EntityManager.createQuery/createNativeQuery`, named queries, or JSON search operators. No custom `@Query` adds an unseen access path.

## Query-by-Query Analysis

The following table catalogs all significant read/query shapes. Insert/update/delete sites are covered afterward as DML groups.

| Query shape | Repository | Filtering | Sort/group/page | Supporting index | Expected plan and observation |
|---|---|---|---|---|---|
| User by email / exists | `UserRepository` | `email=?` | none | unique email | Unique index scan/index-only existence |
| User by active email | `UserRepository` | `email=? AND deleted_at IS NULL` | none | unique email | Unique scan, residual deletion check |
| User phone exists | `UserRepository` | `phone=?` | none | unique phone | Unique index-only existence likely |
| Profile by user email | `UserProfileRepository` | user email, active user | none | user email + unique profile user | Nested loop, at most one profile |
| Token by hash | three token repositories | `token_hash=?` | none | respective unique hash | Unique index scan |
| Active/unused tokens by user | refresh/email verification | user id plus boolean/null | none | user-leading expiry indexes | Index/bitmap scan, residual predicate |
| Active resumes page | `ResumeRepository` | user email, deleted null | `updated_at DESC`, limit/offset + count | V17.1 active user/update | Nested loop + ordered index scan; count scans matching entries |
| Deleted resumes page | `ResumeRepository` | user email, deleted cutoff | `deleted_at DESC`, limit/offset + count | V17.1 user/deleted | Nested loop + range index scan |
| Owned resume detail | `ResumeRepository` | id, email, deletion state | none | resume PK + user email | PK-driven lookup/nested loop |
| Section collection | Hibernate | resume id | typically collection order/application order | resume/order | Index scan + subtype PK nested loops |
| Resume row lock | `ResumeVersionRepository` | resume id | `FOR UPDATE` | resume PK | PK index scan, row lock |
| Next version | `ResumeVersionRepository` | resume id | `MAX(version_number)` | unique resume/version | backward/index aggregate path |
| Latest version id | `ResumeVersionRepository` | resume id | version desc limit 1 | unique resume/version | backward index scan, early stop |
| Version page/count | `ResumeVersionRepository` | user email, resume id | version desc limit/offset | unique resume/version | nested loops + ordered index; count over range |
| Version detail | `ResumeVersionRepository` | email, resume id, version id | none | PKs + snapshot unique | PK nested loops |
| Active templates | `TemplateRepository` | active | name order | unique name | small seq scan+sort or ordered index scan |
| Template detail | `TemplateRepository` | id, active | none | PK | PK index scan |
| Prompt next version | `AiPromptRepository` | workflow, locale | max version | V17.1 prompt lookup / unique | index scan/aggregate; table expected small |
| Latest published prompt | `AiPromptRepository` | workflow, locale, status | version desc limit 1 | V17.1 published lookup | ordered index scan, early stop |
| Prompt locale/version | `AiPromptRepository` | workflow, version | none | unique workflow/version/locale prefix | index scan |
| AI job owned detail | `AiJobRepository` | id, user | none | PK | PK scan, residual user guard |
| Provider by key | `AiUsageRepository` | provider key | none | unique provider key | unique index scan |
| Monthly AI spend | `AiUsageRepository` | user, timestamp range | sum | user/created | range index or bitmap+heap aggregate |
| AI settings | `AiUserSettingsRepository` | user id | none | PK | PK scan |
| AI credential | `AiUserSettingsRepository` | user, provider | none | unique composite | unique scan |
| ATS input | `AtsRepository` | job id, user email, resume id, soft-delete/ownership | group/string aggregate | PKs + resume sections | nested loops/left joins then group aggregate |
| ATS history | `AtsRepository` | resume id + owner | created desc | resume/created | nested loops + ordered index scan |
| ATS detail | `AtsRepository` | report id + owner | none | report PK | PK-driven nested loops |
| ATS keywords | `AtsRepository` | report id | importance desc, keyword | report FK index | index scan then small sort |
| Missing skills | `AtsRepository` | report id | skill name | report FK index | index scan then small sort |
| Recommendations | `AtsRepository` | report id | id | report FK + PK | index scan then small sort/order |
| Job list | `JobRepository` | user email, deleted null | created desc | user/created | nested loop + ordered index, unbounded |
| Job detail | `JobRepository` | id, owner, deleted null | none | job PK | PK scan + ownership join |
| Notification list | `NotificationRepository` | user email | created desc | V17.1 user/created | ordered index scan, unbounded |
| Unread notifications | `NotificationRepository` | user email, read null | created desc | V17.1 unread partial | partial ordered index scan, unbounded |
| Notification detail | `NotificationRepository` | id, owner | none | notification PK | PK scan + user join |
| Preferences | notification repository | user email | none | user email + preference PK | nested loop |
| Current subscription | `SubscriptionRepository` | user email, current true | none | user/start plus unique generated-current | nested loop/index scan + residual current |
| Subscription history/count | `SubscriptionRepository` | user email | starts desc, limit/offset | user/start | ordered index scan; count range |
| Payment history/count | `SubscriptionRepository` | user email through subscriptions | occurred desc, limit/offset | subscriptions user/start + payments subscription/occurred | nested loops, possible final sort across subscriptions |
| PDF resume document | `PdfExportRepository` | resume id, owner, active resume | none | user email, resume/template PK | nested loops with optional template |
| PDF history | `PdfExportRepository` | resume id + user email | created desc | resume/created | ordered index scan + owner verification, unbounded |
| Personal audit page/count | `AuditRepository` | user email | created desc limit/offset | user/created | nested loop + ordered index; count range |
| Global audit page/count | `AuditRepository` | none | created desc limit/offset | V17.1 global created | ordered index scan; global count seq/parallel likely |
| Admin users/count | `AdminRepository` | deleted null | created desc limit/offset | V17.1 active created | partial ordered scan; broad count may seq scan |
| Admin actions/count | `AdminRepository` | none | created desc limit/offset | V17.1 global created | ordered scan; count seq/parallel likely |
| User totals | `AnalyticsRepository` | one user + date range | 7 aggregates | user/date indexes | unique user row + scalar range scans/aggregates |
| User activity | `AnalyticsRepository` | one user + date range | 4 branch groups + outer group/order | user/date indexes | append of four aggregate branches; hash/group aggregates + sort |
| Admin totals | `AnalyticsRepository` | global deletion/status/date | 7 scalar counts | V17.1 global/date partial indexes | mix of seq/parallel counts and range index/bitmap scans |
| Usage metrics range | `UsageMetricService` | date range | date/name/dimension order | unique rollup | ordered range index scan |

### DML query groups

- PK/unique-target inserts: AI jobs, AI requests/content/attempts/ledger, ATS reports/children, PDF exports, audit events, versions/snapshots. Expected behavior is heap insert plus maintenance of declared indexes and FK checks.
- Conflict upserts: templates, prompts, job matches, settings, credentials, preferences, usage metrics. Each conflict target has a matching unique/PK index; speculative retries do not scan the table.
- Guarded state updates: AI jobs by PK/status, prompts by workflow/version/status, notifications by PK/user, users by PK/deletion state, subscriptions by user/current. Expected index/PK scans with residual guards.
- Soft deletes/restores: resume/job paths start from PK plus ownership. They do not require deletion-state indexes for the single-row update.
- Bulk updates: revoke user refresh tokens and mark all notifications read. User-leading indexes restrict affected rows; heap writes and index maintenance scale with actual matches.

No production `LIKE`, `ILIKE`, `DISTINCT`, `RIGHT JOIN`, `FULL JOIN`, or `HAVING` query was found. `IN` is used only for small constant status guards. `UNION ALL` appears in user activity analytics. `EXISTS/NOT EXISTS` is primarily development seeding and free-subscription idempotency.

## Pagination Review

### Current implementation

Offset pagination is used for:

- active and deleted resumes through Spring Data `Page`;
- resume versions;
- subscription history;
- payment history;
- personal/global audit history;
- admin users and admin actions.

Page size is bounded to 100 in the service/controller implementations inspected. Each page generally has a separate count query. V17.1 indexes support the filters and ordering of these pages.

### Issues

- PostgreSQL must walk and discard `OFFSET` rows. Deep page cost grows roughly with the offset even when an ordered index is used.
- Timestamp-only ordering (`created_at`, `updated_at`, `deleted_at`, `starts_at`, `occurred_at`) is not deterministic when rows share a timestamp. Page boundaries can duplicate or omit tied rows during concurrent writes.
- `updated_at DESC` places nulls first unless `NULLS LAST` is explicit; Hibernate-generated ordering does not add it automatically.
- Count queries may dominate page latency on very large histories because they process all matches.

### Recommendations

- No immediate change: existing API contracts expose page numbers, and seek pagination would change behavior.
- Measure p95/p99 page depths and count-query time separately.
- If approved later, use cursor predicates with stable `(sort_timestamp, id)` order and matching composite indexes. This is a coordinated API/repository migration, not a V17.3 patch.
- Consider `Slice` instead of `Page` only if clients can forgo total counts; that also changes response semantics.

## Sorting Review

- V17.1 directly supports active/deleted resume, notification, audit, admin, prompt, and global timeline ordering.
- Existing indexes support job, ATS, PDF, subscription, payment-per-subscription, section, usage metric, and version ordering.
- Small ATS child sets sort in memory after FK restriction; extra composites are not justified.
- Payment history may require a final sort when one user has multiple subscriptions. Expected subscription cardinality is small; no new index fixes cross-parent global ordering without schema/query changes.
- Template name ordering is cheap because the catalog is bounded.
- Null-order concern is limited mainly to nullable `resumes.updated_at`; current application writers populate it, but legacy/manual data should be checked.
- Stable tie-breaker concern applies to every timestamp-only page/list. It is correctness under ties rather than raw scan performance.

## Join Review

### Ownership joins

Most protected queries join domain rows to `users` by user FK and filter unique `users.email`. Expected strategy is a nested loop:

1. unique index scan on email obtains one user;
2. user-leading domain index retrieves owned rows.

This is efficient and prevents broad joins.

### Resume/version/template joins

- Resume→template uses template PK.
- Resume→sections uses `(resume_id, display_order)`.
- Section subtypes join by their PK/FK id.
- Version→snapshot uses unique version FK.

Nested loops are appropriate because parent selection is narrow. Hash joins may appear for broad analytics ranges and are not inherently problematic.

### ATS joins

The ATS input joins one resume, one job, the resume's sections, and five mutually exclusive subtype tables. PK/FK indexes support every join. PostgreSQL may choose nested loops with left joins and a group aggregate. A hash aggregate is possible if work memory and row estimates favor it.

### Subscription/payment joins

Unique email narrows to one user, user/start narrows subscriptions, and subscription/occurred narrows payments. Nested loops are expected. A final sort may remain across multiple subscriptions.

### Analytics joins

User analytics starts from one unique user and runs date-range subplans. Admin analytics is intentionally global and may use bitmap scans, hash aggregation, or parallel sequential scans based on range selectivity. For broad ranges, a sequential/parallel plan is correct even though indexes exist.

### Missing join-index conclusions

No additional FK index is justified beyond V17.1. Unindexed FK columns such as `ai_usage_ledger.provider_id` or `admin_action_logs.target_user_id` are not current join drivers. Adding indexes merely because a column is an FK would violate the evidence requirement.

## Dashboard & Analytics Queries

### User totals

The query resolves one user by unique email, then executes seven scalar aggregate subplans:

- active resumes created in range;
- ATS report count and average score;
- PDF export count;
- AI request count;
- AI ledger token sum;
- AI ledger cost sum.

The ATS count and average repeat the same join/range traversal; AI token and cost sums repeat the same ledger range traversal. Consolidation could reduce scans, but no measured plan proves this is currently material. Changing the SQL increases complexity and is not required for PostgreSQL correctness.

Expected plans: user unique scan; index/bitmap range scans; nested-loop ATS→resume; aggregate nodes. Index-only scans may appear for `COUNT(*)` when visibility-map coverage is high, but heap fetches are expected for score/token/cost values.

### User activity

Four `UNION ALL` branches independently aggregate resume, AI request, PDF, and ATS events by `DATE(created_at)`, followed by an outer `SUM/GROUP BY/ORDER BY`.

- V17.1 indexes restrict each user/date range.
- Branches can use group or hash aggregate.
- Outer sort/group operates on a small number of daily points, not raw events.
- The `DATE()` grouping expression does not justify an expression index because the selective predicate is on raw timestamp and rows must still be counted.

### Admin totals

Seven scalar counts include total users, active users, new users, resumes, AI requests, PDF exports, and ATS reports.

- Selective date ranges can use V17.1 date indexes/bitmap scans.
- Total and active-user counts may choose sequential or parallel sequential scans because they touch a large fraction of active users.
- Exact global counts cannot be made constant-time by ordinary indexes.
- Replacing exact counts with cached/approximate values would change product semantics and is not recommended here.

### Usage metrics

Daily counters are maintained with an atomic `ON CONFLICT` increment and retrieved through an exactly ordered unique index. This is the project's pre-aggregation mechanism and is efficient. It does not currently replace the exact analytics tables for all dashboard measures.

## EXPLAIN ANALYZE Recommendations

These are predicted shapes. Do not report them as observed until run with production-like data and bind values. Use `EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS, VERBOSE)` in a safe environment.

| Major query | Likely scan | Likely join/aggregate | Why / what to verify |
|---|---|---|---|
| Active resume page | partial ordered index scan | nested loop from unique user | Confirm no Sort and low discarded OFFSET rows |
| Deleted resume page | partial range index scan | nested loop | Confirm cutoff is an index condition |
| User/admin timelines | ordered created index scan | none/nested user lookup | Confirm LIMIT stops early and no Sort |
| Published prompt | ordered composite index scan | none | Confirm one-row early termination |
| User monthly AI spend | user/date index or bitmap heap | aggregate | Confirm range selectivity and heap fetch count |
| ATS input | PK/index scans | nested left joins + group aggregate | Test maximum section count; watch row-estimate errors and work memory |
| ATS/PDF/job histories | parent-leading ordered index scans | nested owner join | Confirm unbounded result volume, not scan choice, is the limiting factor |
| Payment history | subscription/payment index scans | nested loops + possible Sort | Verify number of subscriptions and sort memory |
| User totals | multiple range/bitmap scans | scalar aggregates, ATS nested joins | Compare repeated ATS/ledger buffer reads |
| User activity | four index/bitmap scans | branch aggregates, Append, outer hash/group + Sort | Confirm date ranges remain selective |
| Admin totals narrow range | index/bitmap scans | scalar aggregates | Verify date indexes are chosen |
| Admin totals broad range | sequential or parallel sequential scans | aggregate/Gather | Broad scans are expected and often optimal |
| Usage metrics range | unique rollup range scan | none | Confirm order is index-provided |
| Hibernate resume with sections | PK/user indexes | nested loops; possible multiple statements | Trace for N+1 and duplicated entity rows |

Recommended representative binds:

- first page and deepest real page;
- user with median and maximum resume/history counts;
- 7-day, 30-day, 1-year, and full-retention analytics ranges;
- resume with maximum sections and text volume;
- user with maximum subscriptions/payments;
- audit/notification users at p50, p95, and maximum history size.

Do not set `enable_seqscan=off` for final conclusions. A sequential scan on a small table or broad range is not a defect.

## Recommended Changes

### Implementation status

The conditional bounded-list recommendation was approved and implemented after this audit:

- notifications accept `page`/`size`, cap page size at 100, return pagination metadata, and order by `(created_at DESC, id DESC)`;
- saved jobs accept `page`/`size`, cap page size at 100, return pagination metadata, and order by `(created_at DESC, id DESC)`;
- ATS report history accepts `page`/`size`, caps page size at 100, returns pagination metadata, and orders by `(created_at DESC, id DESC)`;
- PDF export history accepts `page`/`size`, caps page size at 100, returns pagination metadata, and orders by `(created_at DESC, id DESC)`.

No migration or additional index was introduced. Aggregate consolidation, materialized summaries, and seek pagination remain measurement-dependent and were not implemented.

### Required now

None. No additional index, repository rewrite, entity change, or schema migration is justified by static query evidence after V17.1 and V17.2.

### Operational verification

1. Enable or inspect `pg_stat_statements` according to the deployment's extension policy.
2. Rank by total execution time, mean time, rows, shared blocks read, and temporary blocks.
3. Capture the major plans listed above with representative binds.
4. Monitor sort spills, temporary files, dead tuples, index hit rates, and autovacuum cadence.
5. Compare estimated rows to actual rows; large errors indicate statistics problems before they indicate missing indexes.
6. Run `ANALYZE` after V17.1 deployment or allow autovacuum to refresh affected-table statistics.

### Conditional future improvements requiring approval

- Add server pagination to notification, job, ATS-history, and PDF-history endpoints if production row counts justify it.
- Adopt seek pagination with `(timestamp, id)` only if deep offsets are observed and clients can accept cursor semantics.
- Add `id` tie-breakers to timestamp sorts if stable pagination under concurrent writes becomes a requirement.
- Consolidate repeated ATS/ledger aggregate scans only if measured buffers/CPU show user totals is material.
- Consider pre-aggregation/materialized summaries only if exact broad admin analytics becomes a proven bottleneck; this would be an architectural change.

No SQL migration is generated for V17.3.

## Final Summary

Overall PostgreSQL query health is **good and production-ready for the current implemented workload**, with a static score of **88/100**.

Strengths:

- identity and ownership lookups use unique/PK indexes;
- V17.1 aligns the important filter/order combinations;
- FK joins used by repositories are supported;
- conflict upserts have exact unique targets;
- JSONB payloads are not burdened with unused indexes;
- query parameterization prevents literal-plan fragmentation and injection;
- page sizes are bounded where pagination exists.

Remaining risks:

- exact global analytics counts scale with retained rows;
- unbounded history/list endpoints scale in memory and network cost;
- OFFSET pages degrade at depth;
- timestamp-only sorting is not stable for ties;
- Hibernate-generated SQL and N+1 behavior require runtime tracing, not source inference;
- actual planner choices depend on statistics, cardinality, cache state, bloat, and bind selectivity.

No query optimization code changes are required at this time. The next correct step is production-like plan and workload measurement—not speculative query rewriting or additional indexing.
