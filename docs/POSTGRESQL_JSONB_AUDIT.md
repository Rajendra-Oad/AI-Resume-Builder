# PostgreSQL JSONB Audit

## Executive Summary

This audit is based exclusively on the committed Flyway migrations, entity mappings, Spring Data repositories, `JdbcTemplate` SQL, native SQL, services containing repository implementations, and SQL builders under `backend/src/main`. It includes V17.1 and does not rely on architecture documents.

| Measure | Result |
|---|---:|
| JSONB columns | 8 |
| JSONB columns returned/read as whole payloads | 6 |
| JSONB columns with no production repository read | 2 |
| JSONB columns searched, filtered, joined, sorted, or grouped internally | 0 |
| JSON containment/path/existence operators in repository predicates | 0 |
| Existing JSONB-specific indexes | 0 |
| Recommended GIN indexes | 0 |
| Recommended `jsonb_path_ops` indexes | 0 |
| Recommended expression indexes | 0 |
| Recommended partial/composite JSONB indexes | 0 |
| No-index recommendations | 8 |
| JSONB optimization score | 100/100 for the implemented workload |

No `V17.2__jsonb_optimization.sql` migration is required. Creating one would add storage, WAL, vacuum work, and write amplification without serving an implemented query.

“Queried” is separated into two meanings throughout this report:

- **payload read**: PostgreSQL returns or converts the complete JSONB value after locating a row using ordinary indexed columns;
- **JSON search**: a query uses JSON content in `WHERE`, `JOIN`, `ORDER BY`, `GROUP BY`, containment, existence, path, or extraction logic.

Six columns are payload-read, but none is JSON-searched. PostgreSQL cannot use a GIN or expression index merely to return a whole JSONB value from a row already found by a primary, unique, or B-tree index.

Exact production sizes and call rates cannot be derived from source code. The size/frequency classifications below are bounded expectations based on constructors, DTOs, seeded shapes, and lifecycle behavior—not fabricated measurements. Production verification queries are supplied in the final section.

## JSONB Column Review

### `templates.configuration`

**Purpose**

Stores the template definition: key, version, layout, default theme, section ordering, supported/required/sidebar sections, colors, and font names. V14 seeds a bounded object for each catalog template.

**Repository and application usage**

- `TemplateRepository.list` selects `configuration` for every active template ordered by relational `name`.
- `TemplateRepository.get` selects it after locating a template by relational `id` and `is_active`.
- `PdfExportRepository.resume` joins the selected resume to its template by `template_id` and returns the complete configuration.
- `TemplateDefinition` parses the returned JSON string in Java with Jackson and reads keys in application memory.
- V14 writes/replaces the whole object during catalog seeding. No runtime repository updates a JSON path.

**Workload characteristics**

- Expected size: small/bounded catalog object, approximately hundreds to low thousands of bytes based on committed seed shapes.
- Update frequency: very low; migration/catalog lifecycle.
- Read frequency: moderate to high during template browsing and PDF rendering.
- Search frequency: zero.
- Operators used in repository predicates: none.
- Current JSONB indexing: none.

**Recommendation: no index.** Rows are found by primary key, unique name, or active catalog access. A GIN index would not accelerate returning or Java-parsing the complete object. An expression index such as `(configuration->>'key')` has no matching SQL predicate.

### `resume_version_snapshots.content`

**Purpose**

Stores a complete serialized resume-version snapshot, including resume fields and section data.

**Repository and application usage**

- `ResumeVersionRepository.create` inserts the complete payload with `CAST(? AS JSONB)` after creating a version.
- `ResumeVersionRepository.get` joins by `resume_version_id`, selects the whole `content`, and deserializes it in `ResumeVersionService`.
- No query filters or sorts by any snapshot property.
- Snapshots are append-only in the implemented lifecycle; no path update exists.

**Workload characteristics**

- Expected size: potentially medium/large and variable—typically kilobytes and possibly tens of kilobytes for detailed resumes. This must be measured with `pg_column_size`.
- Update frequency: none after insertion.
- Write frequency: tied to resume-version creation and editing snapshots.
- Read frequency: version details and rollback flows.
- Search frequency: zero.
- Operators used: insert cast only; no JSON search operator.
- Current JSONB indexing: none. The row is located by unique `resume_version_id`.

**Recommendation: no index.** This is the strongest case against speculative GIN: indexing every key/value of a variable, append-heavy snapshot would materially increase index size and WAL while the only read is an exact relational join followed by whole-document deserialization.

### `ai_providers.capabilities`

**Purpose**

Reserved provider capability metadata. The committed provider seed inserts only provider key, display name, and active state, leaving capabilities null.

**Repository and application usage**

- `AiUsageRepository.providerId` selects only `id` by relational `provider_key`.
- No production repository selects, filters, updates, or extracts `capabilities`.
- The JPA entity maps it as a `String` with `columnDefinition="jsonb"`, but no `JpaRepository<AiProvider, …>` runtime access path was found.

**Workload characteristics**

- Expected size: currently null for committed seeds; future bounded metadata is possible but not implemented.
- Read/search frequency: zero in repository code.
- Update frequency: none in current runtime.
- Operators used: none.
- Current JSONB indexing: none.

**Recommendation: no index.** Indexing a currently unread, generally null field has no query benefit. Re-audit only after a capability predicate is implemented.

### `ai_generated_contents.metadata`

**Purpose**

Reserved metadata accompanying AI-generated text.

**Repository and application usage**

- `AiUsageRepository.addGeneratedContent` inserts `ai_request_id`, text content, applied flag, and creation time; it does not populate metadata.
- No repository selects or searches metadata.
- The JPA entity maps the value as a JSONB-backed string, but no production Spring Data repository query for this entity was found.

**Workload characteristics**

- Expected size: currently null for the implemented writer.
- Read/search frequency: zero.
- Update frequency: zero.
- Operators used: none.
- Current JSONB indexing: none.

**Recommendation: no index.** There is neither stored non-null production data from the current writer nor a reader/search predicate.

### `job_descriptions.extracted_skills`

**Purpose**

Stores extracted job skills, represented by the development seed as a JSON array of strings.

**Repository and application usage**

- The normal `JobRepository.create` path does not populate `extracted_skills`.
- `DevDataSeeder` inserts a small JSON array using `CAST(... AS JSONB)`.
- `AtsRepository.input` includes `j.extracted_skills` inside `CONCAT_WS` to build scoring text after the job row has already been selected by `j.id` and ownership rules.
- There is no containment, element existence, path extraction, or skill-filter predicate.

**Workload characteristics**

- Expected size: null in the normal writer; small array in development data.
- Update frequency: none in current production repository code.
- Read frequency: ATS analysis when seeded/non-null data exists.
- Search frequency: zero. Text conversion is not JSON search.
- Operators used: none; implicit conversion/concatenation only.
- Current JSONB indexing: none.

**Recommendation: no index.** A GIN index cannot accelerate conversion of the already selected row's JSON array into text. `jsonb_path_ops` would only help future containment predicates such as `extracted_skills @> ...`, which do not exist.

### `audit_logs.before_state`

**Purpose**

Stores the pre-change state for an audit event as a serialized object.

**Repository and application usage**

- `AuditService.recordChange` serializes a Java map.
- `AuditRepository.append` casts and inserts the entire value.
- Personal and admin history queries select the entire value after filtering/ordering by relational user/time columns.
- The frontend details modal parses and formats the JSON after it has crossed the API boundary.
- No SQL predicate examines state content.

**Workload characteristics**

- Expected size: variable; generally small/moderate event state, but source code imposes no database size bound.
- Write frequency: append-only, proportional to audited actions.
- Read frequency: audit history/detail responses.
- Search frequency: zero.
- Operators used: write cast only.
- Current JSONB indexing: none.

**Recommendation: no index.** Audit logs are write-sensitive and append-heavy. A GIN index would amplify every audit write while providing no read benefit. Existing B-tree timeline/entity indexes locate rows.

### `audit_logs.after_state`

**Purpose**

Stores the post-change state for an audit event. The development seed uses `jsonb_build_object`; runtime audit recording inserts a serialized map.

**Repository and application usage**

- Written and retrieved alongside `before_state`.
- Returned whole for audit details.
- Never searched, extracted, sorted, joined, or grouped in SQL.

**Workload characteristics**

- Expected size: variable small/moderate event state; measure in production.
- Write frequency: append-only, typically at least as frequent as `before_state` because create events may have only after-state.
- Read frequency: history/detail.
- Search frequency: zero.
- Operators used: insertion cast/build function only.
- Current JSONB indexing: none.

**Recommendation: no index.** Same write-amplification and no-query rationale as `before_state`. Index the relational audit dimensions, not the opaque state payload.

### `admin_action_logs.details`

**Purpose**

Stores a compact object describing an administrative action, currently constructed with `jsonb_build_object(field, value)`.

**Repository and application usage**

- `AdminRepository.update` inserts a one-property details object.
- `AdminRepository.actions` returns the entire details value in a globally chronological page.
- No SQL query filters by field name or value.

**Workload characteristics**

- Expected size: small—currently one key/value pair.
- Write frequency: low/moderate, tied to admin role/status actions.
- Read frequency: admin action history.
- Search frequency: zero.
- Operators used: `jsonb_build_object` for construction, not search.
- Current JSONB indexing: none.

**Recommendation: no index.** V17.1's relational `created_at` index supports the implemented history query. GIN or expression indexing of details would not participate.

## Repository Analysis

### `TemplateRepository` and `PdfExportRepository`

These repositories read `templates.configuration` as a complete value. Row selection uses relational columns:

- `templates.id`
- `templates.is_active`
- `templates.name`
- `resumes.template_id`

JSON parsing occurs in Java. Expected PostgreSQL path: primary/unique/B-tree lookup or a small catalog scan, followed by heap retrieval of `configuration`. JSONB indexes cannot produce an index-only benefit for the whole value and are not covering indexes.

### `ResumeVersionRepository`

The repository writes a complete JSON snapshot and retrieves it through the unique `resume_version_snapshots(resume_version_id)` relationship. Expected path: nested-loop or direct unique index scan followed by one heap row. A GIN index would be unused and expensive because snapshots are append-heavy and potentially the largest JSONB values in the schema.

### `AtsRepository`

`extracted_skills` is concatenated into scoring text after locating a single job by primary key. No JSONB operator appears. Expected path: primary-key lookup/nested joins and aggregation over resume sections. JSON indexing cannot accelerate scalar-to-text conversion on the selected row.

### `AuditRepository`

`before_state` and `after_state` are opaque payloads. History filters and ordering use `user_id`, entity identifiers, and `created_at`; those B-tree indexes were evaluated in V17.1. Expected path: B-tree timeline scan plus heap fetches for selected payloads. GIN indexes would not reduce those heap fetches.

### `AdminRepository`

`details` is built during insert and returned whole during chronological pagination. The V17.1 `created_at` B-tree supports row location/order. No JSON predicate exists.

### `AiUsageRepository` and AI entity mappings

The implemented writer leaves `ai_generated_contents.metadata` null. Provider lookup ignores `ai_providers.capabilities`. Entity declarations alone are not query evidence; neither column has a runtime repository access path that would use an index.

### `DevDataSeeder`

The development-only seeder constructs JSONB using `CAST` and `jsonb_build_object`. Construction functions are writes, not searchable predicates. Development idempotency probes use relational columns. No production JSON index is justified by seeding.

### Access mechanisms checked

- `JdbcTemplate`: checked completely.
- Spring Data derived repository methods: checked; none derives a JSON property query.
- Native SQL/string SQL: checked.
- JPA entity mappings: checked.
- `@Query`: no JSONB query found.
- Criteria API and JPA `Specification`: no production access path found.
- `NamedParameterJdbcTemplate`, `SimpleJdbcInsert`, and `EntityManager` query builders: no relevant production path found.

### Operator verification

No repository search uses any of the following:

- `->` or `->>`
- `#>` or `#>>`
- `@>` or `<@`
- `?`, `?|`, or `?&`
- `jsonb_path_query*` or `@@`/`@?`
- `jsonb_extract_path*`
- an expression based on a JSON key in `WHERE`, `JOIN`, `ORDER BY`, or `GROUP BY`

The only JSON-specific database operations are value construction (`jsonb_build_object`, `jsonb_build_array`) and parameter conversion (`CAST(? AS JSONB)`). Neither is indexable search evidence.

## Recommended Migration

No migration is required.

Do **not** create `V17.2__jsonb_optimization.sql`. An empty Flyway migration would advance schema history without changing the schema, and speculative indexes would conflict with the audit's evidence standard.

The following index types were considered and rejected for the current workload:

| Candidate | Decision | Reason |
|---|---|---|
| Default GIN (`jsonb_ops`) | Reject for all 8 | No containment, key-existence, or path search |
| GIN `jsonb_path_ops` | Reject for all 8 | No `@>` or jsonpath predicate; narrower operator support would still be unused |
| B-tree expression (`column->>'key'`) | Reject for all 8 | No equality/range/order predicate on an extracted key |
| Partial JSONB index | Reject for all 8 | No query predicate matching a partial condition |
| Composite relational + JSON expression | Reject for all 8 | No query combines a relational dimension with extracted JSON content |
| Hash index on extracted JSON scalar | Reject for all 8 | No extracted-scalar equality query; B-tree would be preferred if such a query later existed |

If a future repository introduces a JSON predicate, audit that exact predicate and cardinality before choosing an operator class. Do not pre-create an index for hypothetical functionality.

## Performance Expectations

### Expected result of adding no indexes

- No additional storage or cache pressure.
- No added WAL during inserts/updates.
- No additional autovacuum/index-vacuum work.
- Audit and snapshot writes remain unaffected by JSON index maintenance.
- Template and snapshot retrieval continue using selective relational indexes followed by necessary heap access for the complete JSON payload.

### Expected scan types

| Workload | Expected scan/join behavior | JSONB index role |
|---|---|---|
| Template by id | Primary-key index scan + heap fetch | None |
| Active template catalog | Small sequential or name-index scan + heap fetch | None |
| PDF template join | Nested loop/PK lookup on template | None |
| Resume snapshot detail | Unique index scan on `resume_version_id` + heap fetch | None |
| ATS analysis input | PK/nested joins, then text concatenation/group aggregate | None |
| Personal audit timeline | User/created B-tree index scan + heap fetch | None |
| Global audit/admin timeline | V17.1 created-at index scan + heap fetch | None |

Heap fetches are required because consumers request the JSON payload itself. A JSONB search index does not store the complete value in a form that removes that requirement.

### Trade-offs avoided

- Default GIN can become large because it indexes keys and values.
- `jsonb_path_ops` is smaller but only useful for supported path/containment searches that do not exist here.
- Large snapshot/audit JSON documents would multiply write and WAL cost.
- GIN pending-list behavior and vacuum maintenance would add operational complexity.
- Expression indexes would encode application key names into schema contracts without a corresponding repository query.

### Production measurements recommended

Source code cannot establish actual size, null fraction, TOAST use, or call frequency. These read-only measurements can validate the current conclusion:

```sql
SELECT
    'templates.configuration' AS column_name,
    count(*) AS rows,
    count(configuration) AS non_null_rows,
    avg(pg_column_size(configuration)) FILTER (WHERE configuration IS NOT NULL) AS avg_bytes,
    max(pg_column_size(configuration)) FILTER (WHERE configuration IS NOT NULL) AS max_bytes
FROM templates
UNION ALL
SELECT 'resume_version_snapshots.content', count(*), count(content),
       avg(pg_column_size(content)) FILTER (WHERE content IS NOT NULL),
       max(pg_column_size(content)) FILTER (WHERE content IS NOT NULL)
FROM resume_version_snapshots
UNION ALL
SELECT 'ai_providers.capabilities', count(*), count(capabilities),
       avg(pg_column_size(capabilities)) FILTER (WHERE capabilities IS NOT NULL),
       max(pg_column_size(capabilities)) FILTER (WHERE capabilities IS NOT NULL)
FROM ai_providers
UNION ALL
SELECT 'ai_generated_contents.metadata', count(*), count(metadata),
       avg(pg_column_size(metadata)) FILTER (WHERE metadata IS NOT NULL),
       max(pg_column_size(metadata)) FILTER (WHERE metadata IS NOT NULL)
FROM ai_generated_contents
UNION ALL
SELECT 'job_descriptions.extracted_skills', count(*), count(extracted_skills),
       avg(pg_column_size(extracted_skills)) FILTER (WHERE extracted_skills IS NOT NULL),
       max(pg_column_size(extracted_skills)) FILTER (WHERE extracted_skills IS NOT NULL)
FROM job_descriptions
UNION ALL
SELECT 'audit_logs.before_state', count(*), count(before_state),
       avg(pg_column_size(before_state)) FILTER (WHERE before_state IS NOT NULL),
       max(pg_column_size(before_state)) FILTER (WHERE before_state IS NOT NULL)
FROM audit_logs
UNION ALL
SELECT 'audit_logs.after_state', count(*), count(after_state),
       avg(pg_column_size(after_state)) FILTER (WHERE after_state IS NOT NULL),
       max(pg_column_size(after_state)) FILTER (WHERE after_state IS NOT NULL)
FROM audit_logs
UNION ALL
SELECT 'admin_action_logs.details', count(*), count(details),
       avg(pg_column_size(details)) FILTER (WHERE details IS NOT NULL),
       max(pg_column_size(details)) FILTER (WHERE details IS NOT NULL)
FROM admin_action_logs;
```

Use `pg_stat_statements`—if already enabled—to verify that no external/reporting SQL searches these columns. This audit cannot see ad hoc SQL executed outside the repository.

## Final Summary

Overall JSONB health is **production-ready for the implemented workload**.

- All eight JSONB columns have legitimate document/payload roles.
- Six are read as complete payloads after relational row selection.
- Two are currently unused/null-facing extension fields.
- Zero are searched internally by PostgreSQL.
- Zero JSONB indexes are justified.
- No schema change, repository rewrite, or V17.2 migration should be introduced.

Remaining risks are operational rather than indexing defects:

- Exact payload sizes and TOAST behavior require production measurements.
- Append-heavy snapshots and audit states may drive table/TOAST growth; retention and storage monitoring are separate from indexing.
- External analytics or ad hoc SQL may have query shapes not present in the repository.
- Any future JSON containment, existence, or extracted-key filter must trigger a new evidence-based audit using its actual predicate and `EXPLAIN (ANALYZE, BUFFERS)`.

Production readiness score: **100/100 for JSONB index alignment**, with no V17.2 migration required.
