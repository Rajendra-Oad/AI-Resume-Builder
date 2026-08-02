# PostgreSQL Maintenance & Statistics Audit

## Executive Summary

This V17.4 audit reviews the committed PostgreSQL schema, V17.1 indexes, Spring transaction boundaries, repository write patterns, production datasource configuration, and deployment files. It does not have access to a production PostgreSQL instance, so tuple counts, dead tuples, bloat, planner statistics, WAL volume, transaction age, locks, replication, backup status, and actual server settings are **not observable**. No claim below treats an unmeasured production value as fact.

The application uses an external PostgreSQL service reached through `DB_URL`; the production Compose file does not provision or configure PostgreSQL. The repository does not override autovacuum, statistics targets, vacuum cost settings, freeze ages, or per-table storage parameters. That is a safe application default: PostgreSQL's enabled defaults should remain in control unless measurements justify a change. It is not evidence that the external server is correctly configured.

| Area | Static assessment |
|---|---|
| Schema maintenance characteristics | Healthy; conventional OLTP tables, indexed ownership paths, mostly short transactions |
| Autovacuum | No harmful override found; actual server state and effectiveness require inspection |
| Planner statistics | No custom targets justified by repository queries; freshness requires runtime inspection |
| Manual `VACUUM` / `ANALYZE` | Not routinely justified from source evidence |
| `VACUUM FULL` / `REINDEX` | Not justified without measured bloat or corruption |
| Connection/transaction controls | Spring transactions are generally scoped to service operations; pool and database timeouts are not committed |
| Monitoring | Material gap: no database-specific monitoring configuration is committed |
| Backup/PITR | Material gap: ownership appears external, but no PostgreSQL backup, WAL archive, retention, or restore-test evidence is committed |
| Maintenance migration required | No |
| Static operational readiness score | **72/100** |

The score reflects sound application-side database usage but incomplete operational evidence. It is not a score for an unseen production server. No maintenance migration or application change is required. Production readiness depends on verifying autovacuum, statistics, transaction health, monitoring, and recovery outside this repository.

## Table Maintenance Review

Frequency labels are relative predictions from implemented code: `high` means common interactive or event-path use, not a measured rate. “Default” means no per-table override is justified; it does not assert that autovacuum has run successfully.

| Table | Read/write characteristics | Update/delete and bloat observations | Recommendation |
|---|---|---|---|
| `users` | High reads for authentication/ownership; low inserts; occasional account/profile updates | Soft deletion and updates create dead tuples, but row width is modest | Default autovacuum; monitor dead tuples and last analyze as population grows |
| `user_profiles` | Moderate point reads/updates; profile-photo writes can be large | Replacing/removing `photo_data` can leave large dead TOAST values | Default autovacuum; monitor table plus TOAST size after photo churn |
| `refresh_tokens` | High insert/read/update around sessions | Rotation/revocation produces dead tuples; expired rows have no cleanup job visible | Default autovacuum; define and monitor an expiry-retention cleanup process operationally |
| `resumes` | High owner reads; moderate inserts/updates | Autosave/editing and soft delete/restore can generate sustained dead tuples | Prime autovacuum watch table; keep defaults initially and inspect churn/runtime vacuum history |
| `resume_sections` | High reads and moderate replacement/reordering | Updates and version restoration may replace section collections | Default autovacuum; monitor dead tuples during bulk restore/edit workloads |
| `educations` | Child-table reads/writes with resume sections | Restore/edit operations can delete/reinsert child rows | Default; analyze after unusually large imports/restores only |
| `experiences` | Child-table reads/writes with resume sections | Same inheritance/restore churn as sections | Default; monitor with the parent section workload |
| `projects` | Child-table reads/writes with resume sections | Same inheritance/restore churn as sections | Default |
| `skills` | Child-table reads/writes with resume sections | Reordering/content edits create ordinary dead tuples | Default |
| `certifications` | Child-table reads/writes with resume sections | Generally low volume | Default |
| `templates` | Read-heavy catalog; rare administrative/seed updates | Low bloat risk | Default; manual maintenance unnecessary |
| `resume_versions` | Append-heavy, frequently read by resume | Immutable history limits update bloat; retained history grows table/index size | Default; monitor growth and retention expectations |
| `resume_version_snapshots` | Append-heavy JSONB snapshots, point-read by version | Large immutable values increase heap/TOAST, WAL, backup size—not dead-tuple churn | Default; monitor heap/TOAST growth and backup duration |
| `ai_providers` | Small read-mostly catalog | Rare seed/configuration updates | Default |
| `ai_requests` | Append-heavy AI request log; analytics ranges | Status/lifecycle updates create dead tuples; potentially high growth | Priority monitoring for dead tuples, autovacuum cadence, table/index growth |
| `ai_generated_contents` | Append-heavy content and metadata | Large text/JSONB can use TOAST; little evidence of updates | Default; monitor storage growth |
| `ai_request_attempts` | Append-heavy retry history | Low update/delete churn, potentially unbounded growth | Default; monitor retention and table growth |
| `ai_usage_ledger` | Append-only usage events; time-range aggregation | Low bloat, potentially high cardinality | Default; ensure analyze remains current as it grows |
| `job_descriptions` | Moderate owner reads/inserts; soft-delete updates | Soft deletion creates dead tuples; content may be large | Default; monitor dead tuples and retained deleted rows |
| `ats_reports` | Append-heavy reports; history/analytics reads | Low update churn, unbounded history growth | Default; monitor growth and analyze freshness |
| `ats_keyword_matches` | Batch inserts and reads per report | Append-heavy child table; deletion not implemented | Default |
| `ats_missing_skills` | Batch inserts and reads per report | Append-heavy child table | Default |
| `ats_recommendations` | Batch inserts and reads per report | Append-heavy child table | Default |
| `job_matches` | Upserted per resume/job pair; read for matching | Repeated score refreshes create dead tuples and index churn | Monitor update rate/dead tuples; defaults until measured |
| `notifications` | Event inserts, frequent reads, read/read-all updates | `read_at` and status updates cause heap and partial-index churn | Priority autovacuum watch table; monitor dead tuples and unread-index growth |
| `subscriptions` | Low/moderate reads; plan changes update current rows and insert history | Current-state transitions create limited churn | Default |
| `payment_transactions` | Append-heavy payment history | Immutable financial history has low bloat but requires durable backup | Default; monitor growth and backup/recovery coverage |
| `usage_metrics` | Frequent counter upserts; analytics range reads | Hot rows are repeatedly updated and can accumulate dead tuples | Priority autovacuum watch table; observe HOT updates, dead tuples, and vacuum cadence |
| `audit_logs` | Append-only event log; user/admin history and analytics reads | Low dead-tuple churn but unbounded growth, indexes, WAL, and backup cost | Default; monitor size and establish policy-driven retention outside this audit |
| `admin_action_logs` | Append-only administrative history | Low bloat, unbounded growth | Default; monitor size and recovery coverage |
| `password_reset_tokens` | Low/moderate insert/read/update | Token consumption updates; expired rows have no cleanup job visible | Default; operational expiry cleanup should be defined |
| `email_verification_tokens` | Low/moderate insert/read/update | Token use updates; expired/used rows may accumulate | Default; operational expiry cleanup should be defined |
| `ai_prompt_templates` | Small read-mostly versioned catalog | Publishing/lifecycle updates are infrequent | Default; no special maintenance |
| `ai_jobs` | Insert plus several status transitions per job | Update-heavy relative to row lifetime; result/error text can be large | Monitor dead tuples and completed-job retention if volume becomes material |
| `user_ai_settings` | Point reads and occasional preference updates | Low churn | Default |
| `user_ai_provider_credentials` | Point reads and credential replacement | Updates can create dead encrypted payload versions in heap/WAL/backups | Default autovacuum; protect backups/WAL and monitor relation size |
| `pdf_exports` | Append per export; paginated history reads | Append-only metadata, potentially unbounded | Default; monitor growth and retention expectations |
| `user_notification_preferences` | Point reads/upserts | Low-cardinality per-user updates; low bloat risk | Default |

### Manual maintenance conclusions

- Routine manual `VACUUM` is not supported by repository evidence. Autovacuum should perform normal cleanup.
- Manual `ANALYZE` is justified after bulk loading, major migrations/index deployment, or when runtime plans show stale estimates—not on an arbitrary schedule imposed by this repository.
- `VACUUM FULL` is not justified. It takes an `ACCESS EXCLUSIVE` lock and should only follow measured, severe, non-reusable bloat with an approved maintenance window.
- `REINDEX` is not justified. Use it only for measured index bloat that materially affects operations, corruption, or a documented PostgreSQL-version-specific need.

## Index Maintenance Review

The V17.1 audit already removed four redundant/misaligned indexes and added thirteen query-supported indexes. The current index set has expected write cost on `resumes`, `notifications`, AI/ATS histories, audit histories, and PDF exports, but source inspection cannot quantify that cost.

### Potential bloat

- Highest update-driven risk: notification indexes when records become read, `job_matches` indexes during score upserts, AI-request/job lifecycle indexes during status changes, refresh-token indexes during revocation, and resume indexes during frequent editing.
- Highest growth-driven risk: indexes on append-only `audit_logs`, `admin_action_logs`, `ai_usage_ledger`, `ai_requests`, ATS history, resume versions, and PDF exports.
- Large JSONB/TEXT/BYTEA values are generally not in indexes, so they affect heap/TOAST and WAL more than B-tree size.

### REINDEX recommendations

No preventive `REINDEX` job is justified. First measure `pg_relation_size`, index scan usage, page density/bloat with an approved diagnostic method, and operational impact. Normal B-tree page splits or low utilization alone do not prove that blocking `REINDEX` is appropriate; use `REINDEX ... CONCURRENTLY` only after verifying server/version support and an actual need.

### Unused indexes

Static code cannot identify unused indexes. Several FK/history indexes intentionally remain pending runtime statistics. Review `pg_stat_user_indexes` over a representative business cycle and account for server restarts/stat resets, rare administrative queries, constraint enforcement, and FK delete/update checks before dropping anything. Do not drop an index from a single zero-scan snapshot.

## Statistics Review

No committed query demonstrates a need for a per-column statistics target above PostgreSQL's default. Most predicates use primary/unique keys, ownership IDs, status flags, timestamps, and small catalog fields. Increasing targets without observed cardinality-estimation errors would increase analyze time and catalog size without evidence of benefit.

Potentially correlated predicates—such as user plus deletion state, user plus notification read state, prompt workflow/locale/status, and date/status combinations—are already supported by composite or partial indexes. Extended statistics are not currently justified because no measured plan shows a material estimation error.

Runtime verification should inspect:

```sql
SELECT schemaname, relname, n_live_tup, n_dead_tup,
       last_analyze, last_autoanalyze, analyze_count, autoanalyze_count
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

Run manual `ANALYZE` after a bulk import or migration that changes a material portion of a table, or when estimated-versus-actual rows prove stale statistics. V17.1 index creation itself does not justify permanently changing statistics targets.

## Operational Risks

### Long-running and idle transactions

Spring service methods use explicit read-only/write transaction boundaries, and most queries are bounded or point operations. The main lock-bearing path is resume version creation, which uses `SELECT ... FOR UPDATE` on one resume to serialize version numbers. AI/PDF work may include external/rendering computation within service-level transactions; runtime transaction duration should be observed even though no source evidence proves a current incident.

No datasource pool sizing, `statement_timeout`, `lock_timeout`, `idle_in_transaction_session_timeout`, or transaction-age policy is committed. These may be managed on the external server or environment, but that is unverified. Inspect `pg_stat_activity` and do not invent values from application source.

### Lock contention

- Concurrent snapshots of the same resume can wait on the intentional row lock.
- Notification “read all,” subscription transitions, and job-match upserts may contend per user/key under bursts.
- Flyway DDL and future index work can acquire table locks; schedule and observe production deployments.
- `VACUUM FULL`, non-concurrent `REINDEX`, and broad manual locking are not routine remedies.

### Dead tuples and wraparound

The primary dead-tuple candidates are `resumes`, `resume_sections`, `notifications`, `usage_metrics`, `job_matches`, refresh/token tables, and AI lifecycle tables. Actual risk must be read from `pg_stat_user_tables`. Transaction-ID wraparound protection must be verified through database age and autovacuum health; the repository contains no evidence that autovacuum is disabled.

Temporary tables are not used by application SQL. PostgreSQL may still create temporary files for sorts/aggregates; monitor `temp_bytes` and `temp_files` rather than assuming in-memory execution.

## Monitoring Recommendations

No database-specific monitoring or alert definitions are committed. The application health check proves only HTTP availability; it is not a PostgreSQL maintenance check.

| Signal | Source | Health interpretation / alert basis |
|---|---|---|
| Autovacuum/analyze recency and counts | `pg_stat_user_tables` | Alert on sustained table growth/churn without corresponding maintenance; derive thresholds from workload cadence |
| Dead/live tuple ratio and dead tuple trend | `pg_stat_user_tables` | Investigate sustained growth, especially on identified update-heavy tables |
| Vacuum progress | `pg_stat_progress_vacuum` | Detect unusually long or blocked maintenance |
| Transaction age | `age(datfrozenxid)`, table `relfrozenxid` ages | Alert well before the server's configured freeze/wraparound limits; use actual settings |
| Slow/expensive SQL | `pg_stat_statements` if approved/enabled | Rank by total/mean execution time, calls, rows, shared/temp blocks and WAL |
| Active/idle-in-transaction sessions | `pg_stat_activity` | Investigate sessions exceeding the service's measured normal duration |
| Lock waits/blocking chains | `pg_locks` plus `pg_stat_activity` | Alert on sustained blockers or user-visible latency, not transient row locks |
| Connections | `pg_stat_activity` versus `max_connections` and pool totals | Alert from measured saturation/headroom |
| Database/table/index/TOAST size | `pg_database_size`, `pg_total_relation_size` | Trend growth and forecast disk/backup windows |
| Disk/WAL utilization | Infrastructure and `pg_stat_wal` | Alert with enough headroom for workload and recovery requirements |
| Checkpoints/background writer | version-appropriate PostgreSQL statistics views | Detect excessive checkpoint/WAL pressure from actual rates |
| Replication lag | `pg_stat_replication` / managed-service metrics | Applicable only if replicas exist; none are declared in this repo |
| Backup age and restore verification | Backup platform | Alert on missed jobs and stale restore tests |

Alert thresholds must be derived from server capacity, configured limits, retention objectives, and baseline workload. This audit intentionally does not fabricate numeric thresholds.

## Backup & Recovery Review

The deployment connects to an existing host PostgreSQL service. No committed automation demonstrates base backups, logical dumps, managed snapshots, WAL archiving, PITR, retention, encryption, off-host copies, or restore tests. This is an evidence gap, not proof that backups do not exist.

Production ownership must document and verify:

1. recovery point objective (RPO) and recovery time objective (RTO);
2. automated, encrypted backups with access separated from application credentials;
3. WAL retention/archiving sufficient for the stated PITR window, if PITR is required;
4. monitoring for backup and archive failures;
5. regular restore tests into an isolated PostgreSQL environment;
6. reconciliation of restored Flyway history with application version;
7. recovery of external secrets/encryption keys separately from database backups;
8. capacity for backup storage, WAL spikes, and restoration scratch space.

`pg_dump` is useful for logical portability but is not by itself evidence of PITR readiness. A base-backup/snapshot strategy must be consistent with the hosting platform and PostgreSQL recovery model. Do not modify already-applied Flyway migrations as a rollback mechanism.

## Recommended Maintenance Actions

No maintenance migration, repository change, entity change, or application behavior change is justified.

The following operational verification is justified before declaring the external database production-ready:

1. Capture `SHOW`/`pg_settings` evidence for `autovacuum`, analyze/vacuum thresholds and scale factors, freeze ages, timeouts, connection limits, WAL/checkpoint behavior, and statistics collection. Assess values against actual instance resources and workload.
2. Capture `pg_stat_user_tables`, `pg_stat_user_indexes`, relation/TOAST sizes, database/frozen-XID age, `pg_stat_activity`, locks, WAL, and temporary-file trends over a representative period.
3. Confirm autovacuum is completing on the identified churn-heavy tables. Tune only a table proven to fall behind.
4. Enable or validate approved slow-query observability, preferably `pg_stat_statements`, subject to the hosting platform and extension policy.
5. Document the connection-pool total across all application instances and verify headroom against the server connection limit.
6. Document backup ownership, RPO/RTO, retention, encryption, PITR capability, and alerting; perform and record an isolated restore test.
7. Run `ANALYZE` after bulk loads or major data changes only when statistics freshness requires it.

Do **not** schedule blanket `VACUUM FULL`, routine `REINDEX`, global statistics-target increases, or autovacuum disabling. None is supported by current evidence.

## Final Summary

The schema has healthy default maintenance characteristics: short application transactions, conventional keys/indexes, append-heavy histories, and no committed PostgreSQL setting that disables automatic maintenance. The most important long-term watch areas are update-heavy notifications/metrics/job matches, frequently edited resumes/sections, token retention, and growth-heavy AI/audit/version/PDF histories.

The principal remaining risks are operational visibility and recovery evidence. Actual autovacuum effectiveness, dead tuples, bloat, statistics freshness, transaction age, connections, locks, WAL, disk headroom, backups, and PITR cannot be established from this repository because PostgreSQL is externally managed.

Static operational readiness score: **72/100**. The application side is ready for production maintenance defaults, but the database operation cannot be rated fully production-ready until runtime metrics and a tested recovery process are demonstrated.

**No V17.4 maintenance migration or application change is required.** The justified next work is operational measurement and backup/restore verification, not speculative database tuning.
