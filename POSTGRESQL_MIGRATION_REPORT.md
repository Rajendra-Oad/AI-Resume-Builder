# MySQL to PostgreSQL Migration Report

**Project:** AI Resume Builder  
**Audit date:** 2026-07-30  
**Scope:** Entire repository, including hidden files, backend, frontend, database, Docker, CI, scripts, documentation, configuration, tests, SQL migrations, entities, repositories, services, controllers, and utilities.  
**Method:** Read-only static analysis. No application code or configuration was changed.

## Executive summary

The project is strongly coupled to MySQL 8 at four layers:

1. **Runtime/bootstrap:** MySQL JDBC driver, Hibernate dialect, Flyway MySQL module, JDBC URL validation, and environment examples.
2. **Schema history:** all 16 Flyway migrations are one shared MySQL-oriented history. V1/V2 contain most DDL incompatibilities; later migrations contain additional MySQL `ALTER`, JSON, binary, timestamp, and upsert syntax.
3. **Runtime SQL:** multiple `JdbcTemplate` repositories and the development seeder use MySQL functions, update-join syntax, upserts, JSON construction, and generated-key retrieval.
4. **Operations:** CI creates MySQL 8.4, production Compose assumes a host MySQL service, and deployment/runbook documentation uses MySQL ports and CLI commands.

Migration difficulty is **high** if existing production data and Flyway history must be preserved, and **medium-high** for a clean PostgreSQL deployment. JPA CRUD and most ordinary `SELECT` statements are portable. Controllers and the frontend have no direct database dependency.

The highest-risk items are:

- Designing a PostgreSQL Flyway baseline without corrupting or duplicating the existing MySQL migration history.
- Migrating production data while preserving IDs, foreign keys, identity sequence positions, JSON, binary fields, timestamps, and uniqueness semantics.
- Rewriting MySQL update-joins and upserts correctly.
- Replacing `LAST_INSERT_ID()` with atomic key retrieval.
- Preserving MySQL collation behavior (`utf8mb4_unicode_ci`) because PostgreSQL uniqueness and comparisons may become case-sensitive.
- Replacing the MySQL `FULLTEXT` index with an intentional PostgreSQL search design.

## Audit boundaries and negative findings

- No `application.yml` or `application.yaml` exists.
- No root `docker-compose.yml`; Compose files are under `docker/`.
- No `schema.sql` or `data.sql` exists.
- No Render configuration (`render.yaml`, `render.yml`, or equivalent) exists.
- No stored procedures, views, triggers, `DELIMITER`, MySQL `ENUM`, backtick-quoted identifiers, `UNSIGNED`, `TINYINT`, `IFNULL`, `INSERT IGNORE`, or `REPLACE INTO` were found.
- No Spring Data `@Query(nativeQuery = true)` or `EntityManager.createNativeQuery` was found. Native SQL is executed through `JdbcTemplate`.
- No MySQL dependency was found in controllers or frontend code.
- `docker/docker-compose.dev.yml`, both Dockerfiles, `docker/.env.example`, frontend environment files, and shell/PowerShell scripts contain no executable MySQL setup. The production Compose file has MySQL-specific comments and inherits `backend/.env`.
- The working tree already contained unrelated deleted/modified/untracked files before this report. They were not touched.

## Severity and difficulty scale

| Rating | Meaning |
|---|---|
| Low | Text/config replacement or syntax with a direct PostgreSQL equivalent. |
| Medium | Local SQL/entity rewrite plus focused tests. |
| High | Cross-cutting schema/runtime behavior or data-compatibility work. |
| Critical | Can cause migration failure, incorrect data, broken identity generation, or production outage. |

## Complete MySQL usage inventory

### 1. Build and application configuration

| File and lines | Current code | Purpose | PostgreSQL effect / risk | Difficulty | Required change | Can remain unchanged |
|---|---|---|---|---|---|---|
| `backend/pom.xml:74-76` | `<artifactId>flyway-mysql</artifactId>` | Adds Flyway MySQL database support. | Cannot provide PostgreSQL database support. Migration startup will fail without the PostgreSQL Flyway module supported by the selected Flyway/Spring Boot version. | Low | Replace with the appropriate Flyway PostgreSQL module, normally `org.flywaydb:flyway-database-postgresql` under Boot dependency management. | Core `flyway-core`, Spring Boot Flyway integration, Maven structure. |
| `backend/pom.xml:87-91` | `com.mysql:mysql-connector-j` | Runtime JDBC driver. | Does not connect to PostgreSQL. | Low | Replace with `org.postgresql:postgresql` at runtime. | Spring JDBC/JPA dependencies and connection-pool configuration. |
| `backend/src/main/resources/application.properties:10` | `spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect` | Forces Hibernate SQL/type behavior to MySQL. | Produces the wrong SQL/type mappings. | Low | Remove to allow Hibernate auto-detection, or use the current `PostgreSQLDialect`. | `ddl-auto=none` and Flyway ownership of the schema. |
| `backend/src/main/resources/application.properties:15-18` | `${DB_URL}`, `${DB_USERNAME:root}`, `${DB_PASSWORD}`, `com.mysql.cj.jdbc.Driver` | Main datasource configuration. | Driver is invalid; default username `root` is MySQL-specific operational practice. | Low | Set PostgreSQL URL and driver (`org.postgresql.Driver`); change/remove the `root` default. | Environment-variable names may remain if desired. |
| `backend/src/main/resources/application-prod.properties:1-4` | `${DB_URL}`, `${DB_USERNAME}`, `${DB_PASSWORD}`, `com.mysql.cj.jdbc.Driver` | Production datasource. | Driver prevents PostgreSQL startup. | Low | Change the driver or omit it for auto-detection. | Secret injection variable names. |
| `backend/.env.example:1-3` | `jdbc:mysql://localhost:3306/ai_resume_builder`, `root`, and a literal example password | Local datasource example. | Wrong scheme/port/user. The committed password-like value is also a security hygiene risk independent of migration. | Low | Use `jdbc:postgresql://localhost:5432/ai_resume_builder`, a least-privilege role, and a non-secret placeholder. | Variable names. |
| `backend/src/main/java/com/airesumebuilder/config/EnvironmentConfigurationValidator.java:33-38,115` | MySQL wording and `dbUrl.startsWith("jdbc:mysql://")` | Validates production environment. | Explicitly rejects every PostgreSQL URL. | Low | Validate `jdbc:postgresql://`; update user-facing descriptions. Consider parsing a JDBC URL rather than a prefix-only check. | Required-variable and production-validation framework. |
| `backend/src/test/java/com/airesumebuilder/config/EnvironmentConfigurationValidatorTest.java:62-63` | MySQL URL test fixture | Verifies a valid production environment. | Will fail after validator migration and would not exercise PostgreSQL. | Low | Replace fixture and add a rejection test for non-PostgreSQL URLs. | Test structure. |
| `backend/src/test/java/com/airesumebuilder/feature/admin/controller/AdminSecurityTest.java:34-35` | `DB_URL=jdbc:mysql://localhost:3306/test` | Spring test property fixture. | Becomes inconsistent and may fail validator/bootstrap behavior. | Low | Use PostgreSQL URL. | Remaining security test. |

### 2. CI and integration tests

| File and lines | Current code | Purpose | PostgreSQL effect / risk | Difficulty | Required change | Can remain unchanged |
|---|---|---|---|---|---|---|
| `.github/workflows/ci.yml:60-70` | `mysql:8.4`, `MYSQL_*`, port `3306`, `mysqladmin ping` | Starts the CI integration database. | Tests continue validating MySQL, not PostgreSQL. | Medium | Use a pinned PostgreSQL image, `POSTGRES_DB/USER/PASSWORD`, port 5432, and `pg_isready`. | Service-container pattern and Maven job structure. |
| `.github/workflows/ci.yml:78-80` | `IT_DB_URL=jdbc:mysql://...:3306/...?...` | Supplies integration datasource. | MySQL URL options are invalid for PostgreSQL. | Low | Use `jdbc:postgresql://127.0.0.1:5432/ai_resume_builder_test`; select needed PostgreSQL SSL options explicitly. | `IT_DB_*` naming. |
| `.github/workflows/ci.yml:88` | `Execute and validate Flyway migrations against MySQL` | CI step label and intent. | Misleading after migration. | Low | Rename to PostgreSQL. | Maven invocation. |
| `backend/src/test/java/com/airesumebuilder/database/FlywayMigrationIT.java:15-31` | `appliesAndValidatesEveryMigrationAgainstMySql`; generic Flyway/JDBC metadata assertions | Validates migrations and representative schema/seed data. | Method name is stale; existing SQL cannot run on PostgreSQL. Metadata casing/schema behavior should be rechecked. | Medium | Rename; run against PostgreSQL; add assertions for JSONB, identity/sequence, indexes, constraints, and seeds. | Environment-driven datasource and Flyway API structure. |
| `backend/src/test/java/com/airesumebuilder/database/AdminWorkflowIT.java:40,88` | `DATE_ADD(NOW(6), INTERVAL 1 DAY)`, `NOW(6)` | Creates integration fixtures. | `DATE_ADD` and MySQL interval syntax fail. | Low | Use `CURRENT_TIMESTAMP + INTERVAL '1 day'` and `CURRENT_TIMESTAMP`. | JDBC test flow and boolean `FALSE`. |

### 3. Deployment and environment

| File and lines | Current code | Purpose | PostgreSQL effect / risk | Difficulty | Required change | Can remain unchanged |
|---|---|---|---|---|---|---|
| `docker/docker-compose.yml:12-13` | Comment preserving `jdbc:mysql://localhost:3306` to host MySQL | Explains host networking. | Operational guidance becomes wrong. | Low | Change to PostgreSQL URL/5432 and host-service wording; validate whether host networking remains desired. | Backend/Nginx service topology can remain. |
| `docker/README.md:8` | “MySQL remains the existing EC2 host service.” | Deployment summary. | Wrong operational dependency. | Low | Update to PostgreSQL. | Overall Docker layout. |
| `docs/Deployment.md:4-5,44,48,60,81,98,127-141,210,266,281` | Host MySQL, `3306`, `systemctl ... mysql`, JDBC MySQL URL, `mysql -u ...` queries | Production runbook, verification, rollback, and security instructions. | Commands, port/firewall guidance, health checks, and SQL client usage are wrong. | Medium | Replace with PostgreSQL service naming appropriate to the OS, `5432`, `psql`, PostgreSQL URL, backup/restore commands, and role/database checks. | EC2/Vercel/Nginx/container deployment concepts. |
| `backend/README.md:21-23` | Local MySQL credentials and setup | Developer onboarding. | Wrong prerequisite/setup. | Low | Document PostgreSQL role/database creation and URL. | `.env` workflow and secret warning. |
| `docs/DevelopmentGuide.md:8` | Install MySQL 8 | Developer prerequisite. | Wrong prerequisite. | Low | Install a pinned supported PostgreSQL version. | Java/Node/npm/Git prerequisites. |

### 4. Runtime SQL in configuration and repositories

These are executable MySQL dependencies. Ordinary queries in the same files can remain unless noted.

| File and lines | Current code | Purpose | PostgreSQL effect / risk | Difficulty | Required change | Can remain unchanged |
|---|---|---|---|---|---|---|
| `config/DevDataSeeder.java:87-89,101-103,114-116,176-178` | `INSERT ... ON DUPLICATE KEY UPDATE ... VALUES(column)` | Idempotent development seeds and job-match refresh. | Syntax fails. PostgreSQL conflict targets must correspond to actual unique constraints. | Medium | Convert to `INSERT ... ON CONFLICT (key_columns) DO UPDATE SET ... = EXCLUDED...`; verify conflict keys for `user_profiles`, `templates`, prompt templates, and job matches. | Inserted values and seeder transaction/profile behavior. |
| `config/DevDataSeeder.java:137-143` | `JSON_ARRAY(...)`; seed text also says “MySQL” | Seeds job skills JSON and descriptive content. | Function fails; textual “MySQL” is sample domain content, not a database coupling, but may be undesirable after migration. | Low | Bind valid JSON/JSONB or use `jsonb_build_array`; optionally change sample skill text. | `INSERT ... SELECT ... WHERE NOT EXISTS`, `LIMIT 1`. |
| `config/DevDataSeeder.java:176-178` | `DATE_ADD(?, INTERVAL 7 DAY)` | Computes match expiry. | Syntax fails. | Low | Use `? + INTERVAL '7 days'` with type-safe binding, or compute the `Instant` in Java. | Decimal and boolean values. |
| `config/DevDataSeeder.java:202-204` | insert followed by `SELECT LAST_INSERT_ID()` | Creates AI request then ledger row. | Function does not exist. Separate pooled JDBC operations are not a robust generated-key contract. | High | Use `INSERT ... RETURNING id`, `KeyHolder`, or `SimpleJdbcInsert`; keep both writes transactionally atomic. | Ledger insert once ID is obtained. |
| `config/DevDataSeeder.java:209-210` | `JSON_OBJECT('seed', TRUE)` | Seeds JSON audit state. | Function fails. | Low | Bind serialized JSON and cast to `jsonb`, or use `jsonb_build_object`. | `WHERE NOT EXISTS`. |
| `feature/ai/repository/AiUserSettingsRepository.java:30-31,48-49` | two `ON DUPLICATE KEY UPDATE ... VALUES(...)` | Upserts AI settings and encrypted credentials. | Syntax fails. Incorrect conflict targets could allow duplicates or overwrite the wrong row. | Medium | Use `ON CONFLICT (user_id)` and `ON CONFLICT (user_id, provider)` with `EXCLUDED`. Confirm matching unique constraints. | Select/delete/update methods and byte-array binding. |
| `feature/notification/service/NotificationService.java:3` | upsert with `ON DUPLICATE KEY`; `UPDATE notifications n JOIN users u ...` | Saves preferences and marks owned notifications read. | Both constructs fail in PostgreSQL. | Medium | Preferences: `ON CONFLICT (user_id) DO UPDATE`. Updates: `UPDATE notifications n SET ... FROM users u WHERE ...`. Replace `NOW(6)` with `CURRENT_TIMESTAMP`. | Reads, `COALESCE`, booleans, row mapping. |
| `feature/template/service/TemplateService.java:16` | `UPDATE resumes r JOIN users u ... SET ... NOW(6)` | Applies a template only to an owned resume. | MySQL update-join and `NOW(6)` fail. | Medium | Rewrite as `UPDATE resumes r SET ... FROM users u WHERE u.id=r.user_id ...`; use `CURRENT_TIMESTAMP`. | Read methods. |
| `feature/job/service/JobService.java:4` | `NOW(6)`, `SELECT LAST_INSERT_ID()`, `UPDATE job_descriptions d JOIN users u ...` | Creates jobs, retrieves ID, soft-deletes owned job. | All three MySQL constructs fail. Key retrieval is critical. | High | Use bound Java timestamps or `CURRENT_TIMESTAMP`; atomic `RETURNING id`/KeyHolder; `UPDATE ... FROM users`. | List/get selects and booleans. |
| `feature/subscription/repository/SubscriptionRepository.java:32-35,91-94` | `NOW(6)` and `UPDATE subscriptions s JOIN users u ...` | Creates default subscription and cancels current subscription. | Function/update-join fail. | Medium | Use `CURRENT_TIMESTAMP`; rewrite with `UPDATE ... FROM`. | Pagination queries and `TRUE/FALSE`. |
| `feature/admin/repository/AdminRepository.java:37,43-46` | `NOW(6)`, `JSON_OBJECT(?,?)` | Updates user state and logs admin action details. | Functions fail. Dynamic JSON keys need safe typed construction. | Medium | Bind serialized JSON/JSONB or use `jsonb_build_object`; use `CURRENT_TIMESTAMP`. Preserve the existing column allow-list for dynamic SQL. | Standard pagination/selects. |
| `feature/ai/repository/AiUsageRepository.java:63` | `DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-01')` | Calculates current-month AI spend. | Functions fail; timezone boundary semantics can change. | Medium | Prefer a Java-computed UTC month-start parameter, or `date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC')`. Define whether timestamp columns are UTC instants. | `COALESCE(SUM(...),0)` and other inserts/selects. |
| `feature/resume/version/repository/ResumeVersionRepository.java:25,38` | `NOW(6)`, `CAST(? AS JSON)` | Creates version and JSON snapshot. | `NOW(6)` fails; PostgreSQL should generally use `jsonb`, and JDBC string binding may require `?::jsonb`/`CAST(? AS jsonb)` or PGobject. | Medium | Use `CURRENT_TIMESTAMP`; choose JSONB and bind/cast explicitly. | `MAX`, `COALESCE`, standard pagination and `LIMIT`. |
| `feature/audit/repository/AuditRepository.java:3` | `CAST(? AS JSON)`, `NOW(6)` | Stores structured before/after state. | JSON target/type binding and time function need changes. | Medium | Use `jsonb` plus explicit binding/cast; use `CURRENT_TIMESTAMP`. | `LIMIT ? OFFSET ?`, counts, joins, `COALESCE`. |
| `feature/ats/repository/AtsRepository.java:22-25` | `CONCAT_WS` and `GROUP_CONCAT(... SEPARATOR ' ')` | Builds flattened resume/job text for ATS scoring. | `GROUP_CONCAT` syntax fails. Join multiplicity can already duplicate content; PostgreSQL rewrite is a chance to test correctness. | High | Use `string_agg(concat_ws(...), ' ')`; consider lateral/subquery aggregation to prevent Cartesian duplication; define ordering for deterministic output. | `concat_ws` exists in PostgreSQL; ordinary report reads. |
| `feature/ats/repository/AtsRepository.java:37-38` | `NOW(6)` and `LAST_INSERT_ID()` | Creates ATS report and child rows. | Fails and risks losing the parent ID contract. | High | Insert with `RETURNING id`/KeyHolder in the transaction; use `CURRENT_TIMESTAMP`. | Child insert logic after correct ID retrieval. |
| `feature/pdf/repository/PdfExportRepository.java:30` | `NOW(6)` | Records an export. | PostgreSQL `now()` takes no precision argument. | Low | Use bound `Instant` or `CURRENT_TIMESTAMP`. | Remaining repository SQL. |

### 5. Entity mappings

Hibernate schema generation is disabled, so Flyway is authoritative; nevertheless `columnDefinition` affects validation and future portability.

| File and lines | Current code | Purpose | PostgreSQL effect / risk | Difficulty | Required change | Can remain unchanged |
|---|---|---|---|---|---|---|
| `feature/job/entity/JobDescription.java:15` | `columnDefinition = "MEDIUMTEXT"` | Large job-description text. | `MEDIUMTEXT` does not exist. | Low | Use `TEXT` or remove the definition and rely on `@Lob`/schema. | Java `String`, length semantics. |
| `feature/ai/entity/AiJob.java:15`; `AiGeneratedContent.java:12`; `feature/resume/entity/Resume.java:40-42` | `columnDefinition = "MEDIUMTEXT"` | Large AI and resume content. | Type does not exist. | Low | Map to PostgreSQL `TEXT`; remove vendor definitions where possible. | Java fields and service behavior. |
| `feature/auth/entity/UserProfile.java:29` | `columnDefinition = "MEDIUMBLOB"` | Profile image bytes. | Type does not exist. | Low-Medium | Use `bytea`; verify Hibernate byte-array mapping and max upload size. | `byte[]` field. |
| `JobDescription.java:16`; `Template.java:19`; `ResumeVersionSnapshot.java:15`; `AuditLog.java:4`; `AiProvider.java:14`; `AiGeneratedContent.java:13`; `AdminActionLog.java:4` | `columnDefinition = "json"` | JSON documents stored as strings. | PostgreSQL has `json` and `jsonb`, but string binding and Hibernate validation differ. `jsonb` is generally preferable for indexing/comparison. | Medium | Choose `jsonb` consistently; ideally use Hibernate JSON mapping (`@JdbcTypeCode(SqlTypes.JSON)`) or explicit converters rather than raw vendor definitions. | JSON serialization contracts if document shape is unchanged. |
| All `GenerationType.IDENTITY` entities listed below | `@GeneratedValue(strategy = GenerationType.IDENTITY)` | Database-generated numeric IDs. | PostgreSQL supports identity columns, so JPA can remain. Existing IDs must be loaded with `OVERRIDING SYSTEM VALUE`/sequence handling and sequences reset after import. Identity prevents some Hibernate insert batching. | Medium | DDL should use `GENERATED ... AS IDENTITY`; reset each sequence to `max(id)` after data import. | Entity annotations can remain. |

`GenerationType.IDENTITY` occurs in: `User`, `UserProfile`, `RefreshToken`, `PasswordResetToken`, `EmailVerificationToken`, `PhoneOtpChallenge`, `Resume`, `ResumeSection`, `ResumeVersion`, `ResumeVersionSnapshot`, `Template`, `JobDescription`, `JobMatch`, `Subscription`, `PaymentTransaction`, `AiProvider`, `AiRequest`, `AiRequestAttempt`, `AiGeneratedContent`, `AiUsageLedger`, `AtsReport`, `AtsKeywordMatch`, `AtsMissingSkill`, `AtsRecommendation`, `Notification`, `UsageMetric`, `AuditLog`, and `AdminActionLog`.

`TEXT` and `CHAR(3)` column definitions are supported by PostgreSQL and may remain, although removing unnecessary `columnDefinition` values improves portability.

### 6. Flyway migration inventory

The current versioned files must not simply be edited after they have run in any shared environment: Flyway checksums would change. Choose a new PostgreSQL baseline or vendor-specific locations. A clean PostgreSQL database cannot replay the existing files as written.

| Migration and lines | Current MySQL code / purpose | PostgreSQL effect | Difficulty and risk | Required change | Portable parts |
|---|---|---|---|---|---|
| `V1__core_identity_and_resume_schema.sql:2-113` | Five `AUTO_INCREMENT`; ten `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`; `DATETIME(6)`; constraints and indexes. | Identity, table options, and datetime types fail. Collation removal can change case/Unicode uniqueness behavior. | High / foundational schema and identity semantics. | Use identity columns, `timestamp(6) with time zone` or a documented timestamp choice, remove engine/charset clauses, choose database/column collation strategy, preserve named PK/FK/check/index definitions. | `VARCHAR`, `BIGINT`, `INT`, `CHECK`, FK, standard `CREATE INDEX`. |
| `V2__database_architecture_extensions.sql:1-288` | 20 identity tables; 20 engine/charset clauses; 26 datetimes; MySQL inline `INDEX`/`UNIQUE KEY`; JSON; `MEDIUMTEXT`; `FULLTEXT`; generated `current_user_id`; many FKs/checks. Lines 290-296 contain two MySQL upsert seeds. | This is the largest rewrite. Inline indexes, types, full-text, generated-column syntax/semantics, and upserts fail. PostgreSQL unique indexes treat multiple NULLs similarly by default, but generated-column expression and partial uniqueness should be redesigned explicitly. | Critical / most schema objects and performance rules live here. | Split indexes into `CREATE [UNIQUE] INDEX`; use identity, `text`, `jsonb`, timestamps; replace full-text with a GIN index on a weighted `tsvector` expression/generated column or remove until queried; implement “one current subscription” preferably as a partial unique index `ON subscriptions(user_id) WHERE is_current`; translate seed upserts to `ON CONFLICT`. | Most columns, numeric types, FK/check intent, ordinary B-tree index column order. |
| `V3__authentication_security_tokens.sql:1-3` | `DATETIME(6)`, two `AUTO_INCREMENT`, inline `UNIQUE KEY` and `INDEX`. | Types/index declarations fail. | Medium. | Identity/timestamps; table constraints plus separate indexes. | Token lengths, FKs, uniqueness intent. |
| `V4__ai_prompt_management.sql:1-2` | Identity, datetime, inline unique/index, and `ON DUPLICATE KEY ... VALUES()`. | Fails. | Medium; prompt version uniqueness must match conflict target. | Identity/timestamp, separate indexes, `ON CONFLICT (workflow,version,locale) ... EXCLUDED`. | Data and constraint intent. |
| `V5__ai_background_jobs.sql:1` | `MEDIUMTEXT`, `DATETIME(6)`, inline index. | Fails. | Low-Medium. | `TEXT`, selected timestamp type, separate index. | `CHAR(36)`, PK/FK and statuses. Consider native `uuid` separately. |
| `V6__ai_prompt_lifecycle.sql:1` | Adds two `DATETIME(6)` columns. | Type fails. | Low. | Use selected PostgreSQL timestamp type. | `ALTER TABLE ADD COLUMN` structure. |
| `V7__user_ai_provider_credentials.sql:1-31` | Engine/charset, datetimes, `AFTER provider_id`, identity, `VARBINARY`, inline unique/index. | `AFTER`, binary type, options, and indexes fail. | Medium; encrypted bytes must remain exact. | Ignore physical column ordering; use `bytea`; identity/timestamp; separate unique/index definitions; validate byte-for-byte migration. | Keys, provider strings, FKs. |
| `V8__pdf_export_history.sql:1-14` | Identity, datetime default, engine/charset, inline indexes. | Fails. | Low-Medium. | Standard PostgreSQL equivalents. | Columns/FKs/index intent. |
| `V9__resume_content_and_presentation.sql:1-22` | Three `MEDIUMTEXT`; JSON columns. | `MEDIUMTEXT` fails; JSON choice/binding must be intentional. | Medium. | `TEXT`; preferably `jsonb`; validate existing JSON before load. | Other `ADD COLUMN` statements. |
| `V10__user_onboarding_preferences.sql:1-8` | `ADD COLUMN ... AFTER ...`; boolean default. | `AFTER` fails. Boolean is native and compatible. | Low. | Remove `AFTER`; column order has no application semantic value. | Boolean, varchar, update statement. |
| `V11__phone_verification.sql:1-19` | `AFTER`, datetimes, identity, inline indexes. | These constructs fail. | Medium. | Remove ordering directives; identity/timestamp; separate indexes. | Phone/token columns and FK intent. |
| `V12__profile_photos.sql:1-4` | `MEDIUMBLOB`. | Type fails. | Medium because binary fidelity matters. | Use `bytea`; validate hashes/lengths after migration. | Metadata columns. |
| `V13__notification_preferences.sql:1-10` | `DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)` plus engine/charset. | PostgreSQL has no column-level `ON UPDATE`. | Medium. | Prefer application-managed `updated_at` already supplied by repository, or add a trigger only if database-managed behavior is required; use timestamp default and remove options. | Native booleans, PK/FK. |
| `V14__resume_template_engine_catalog.sql:1-25` | `JSON_OBJECT`, `JSON_ARRAY`, and `ON DUPLICATE KEY UPDATE ... VALUES()`. | Functions/upsert fail. | High due to large nested JSON seed documents. | Prefer valid JSON literals cast to `jsonb` or `jsonb_build_object/array`; translate to `ON CONFLICT (name) ... EXCLUDED`; regression-test exact documents. | Template text and logical configuration. |
| `V15__remove_legacy_classic_template.sql:1-3` | Standard update with `FALSE`. | Compatible. | Low. | No SQL change expected. | Entire migration. |
| `V16__add_resume_candidate_name.sql:1-2` | `ADD COLUMN ... AFTER target_job_title`. | `AFTER` fails. | Low. | Remove `AFTER`. | Column name/type/nullability. |

### 7. Documentation-only MySQL references

These do not affect runtime, but leaving them unchanged will produce incorrect architecture, onboarding, and operational guidance.

| File and lines | Current purpose/content | PostgreSQL impact | Difficulty | Required change | Can remain |
|---|---|---|---|---|---|
| `ARCHITECTURE.md:15,36,122` | Declares MySQL connector/Flyway module, primary DB, auto-increment IDs and `DATETIME(6)`. | Architecture record becomes false. | Low | Replace with PostgreSQL driver/module, identity/timestamp/JSON/search strategy. | Layer/module descriptions. |
| `CONTRIBUTING.md:29` | Example commit: “require MySQL migration verification.” | Stale example. | Low | Rename to PostgreSQL. | Commit convention guidance. |
| `docs/README.md:20` | Database architecture described as MySQL. | Stale index. | Low | Rename description. | Link structure. |
| `docs/Database.md:3`; `docs/Architecture.md:4,13` | MySQL persistence summaries. | Stale system description. | Low | Replace and document PostgreSQL semantics. | Domain design. |
| `docs/03_Database_Architecture.md:3,142,268,270,281-283,298,302,442,470` | MySQL blueprint, FK-index and FULLTEXT recommendations, scaling, encryption/backups. | Several recommendations are engine-specific; PostgreSQL indexing, FTS, vacuum/analyze, replication, partitioning, and backup tooling differ. | Medium | Re-author engine-specific sections, especially FTS, FK indexes, case handling, partitioning, backups, and scaling. | Domain relationships and general integrity principles. |
| `docs/01_Project_Foundation_Setup.md:22,225,262,297` | MySQL ownership, editor plugin, dev profile, connector. | Stale setup/tooling. | Low | Use PostgreSQL equivalents. | Project foundation concepts. |
| `docs/02_Backend_Architecture.md:145,325,327`; `docs/05_REST_API_Architecture.md:5`; `docs/06_Authentication_Security.md:5`; `docs/07_AI_Architecture.md:6,113` | Stack diagrams and scale descriptions. | Stale technology labels; replica/scale terminology needs PostgreSQL review. | Low | Replace references and review engine-specific claims. | Application architecture. |
| `docs/01-07_Implementation_Gap_Audit.md:23,38,43,57,102,107,176,248` | Historical/current MySQL implementation and CI audit. | Historical statements may intentionally be retained, but current-state claims become stale. | Low | Mark as historical or update current-state assertions deliberately. | Audit history if clearly dated. |
| `docs/PROJECT_DOCUMENTATION.md:9,63,76,94,173,270,283,419,426,441,471,519` | Comprehensive setup, diagrams, data flow and stack documentation. | Repeats MySQL assumptions throughout. | Medium | Replace diagrams, prerequisites, setup, deployment, dependencies, and narrative. | Feature/application explanations. |
| `AI_RESUME_BUILDER_COMPLETE_LEARNING_GUIDE.md:29,83,96,114,193,290,303,439,446,461,491,539,623,636,653,668,670` and further duplicate/reference sections in this generated guide | Long-form learning guide describing MySQL. | Broad stale documentation. The file contains a NUL byte around offset 93,831, causing ordinary text search to stop early; there may be additional occurrences after that point. | Medium | Sanitize the file encoding/NUL byte first, then replace/review all database-specific material. Do not blindly replace “MySQL” where it is historical or comparative. | General learning content. |
| `docker/README.md`, `backend/README.md`, `docs/Deployment.md`, and `docs/DevelopmentGuide.md` | Covered in deployment section above. | Operationally significant stale docs. | Low-Medium | Update with code/config migration. | Non-database guidance. |

## SQL compatibility findings by category

### `AUTO_INCREMENT` and generated keys

- **Found:** 31 occurrences in Flyway migrations (V1: 5, V2: 20, V3: 2, V4: 1, V7: 1, V8: 1, V11: 1).
- **Effect:** PostgreSQL does not accept `AUTO_INCREMENT`.
- **Target:** `BIGINT GENERATED BY DEFAULT AS IDENTITY` is preferable when importing preserved IDs; `GENERATED ALWAYS` requires override syntax during import.
- **Runtime generated keys:** `LAST_INSERT_ID()` occurs in `DevDataSeeder.java:203`, `JobService.java:4`, and `AtsRepository.java:38`. Replace atomically.
- **Risk:** after importing explicit IDs, every identity sequence must be advanced to at least `MAX(id)`, or new inserts will collide.

### Engine, charset, and collation

- **Found:** `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` throughout V1, V2, V7, V8, and V13.
- **Effect:** PostgreSQL rejects these clauses.
- **Semantic risk:** MySQL's configured Unicode collation is generally case-insensitive; default PostgreSQL text equality and unique constraints are case-sensitive. Email, provider keys, template names, and other natural keys may accept data PostgreSQL treats differently.
- **Required decision:** use normalized lowercase values, expression indexes on `lower(column)`, `citext`, or an ICU nondeterministic collation where appropriate. Do not apply case-insensitivity globally without testing.

### `ENUM`

- No MySQL `ENUM(...)` columns were found. Statuses are `VARCHAR` plus some `CHECK` constraints. They are readily portable; PostgreSQL native enum types are optional and not required.

### Backticks

- No SQL identifier backticks were found. Backticks elsewhere are Markdown or shell syntax and are irrelevant.

### `LIMIT`

- `LIMIT 1` and `LIMIT ? OFFSET ?` occur in repositories and seed code.
- This syntax is supported by PostgreSQL, including JDBC-bound integer parameters. It can remain.
- Pagination without a fully deterministic secondary order can still produce unstable pages in either database; this is not a migration incompatibility.

### Boolean handling

- Schema and SQL use `BOOLEAN`, `TRUE`, and `FALSE`; PostgreSQL supports these natively.
- JDBC `ResultSet.getBoolean` and Java boolean mappings can remain.
- Validate migrated MySQL values because MySQL physically represents boolean as a numeric alias. Reject any non-0/1 legacy values during transformation.

### Timestamp defaults and time zones

- `DATETIME(6)` and `CURRENT_TIMESTAMP(6)` are widespread; `NOW(6)` is used in runtime SQL.
- PostgreSQL supports fractional precision as a **type** (`timestamp(6)` / `timestamptz(6)`), but `now(6)` is invalid.
- `Instant` fields strongly suggest `timestamp(6) with time zone` (`timestamptz`) as the safer target. MySQL `DATETIME` has no timezone, so the source timezone convention must be proven before conversion.
- V13's `ON UPDATE CURRENT_TIMESTAMP(6)` requires application logic or a trigger.
- Test microsecond rounding and JDBC session timezone explicitly.

### JSON

- MySQL JSON columns/functions occur in V2, V9, V14 and several repositories/entities.
- Prefer PostgreSQL `jsonb` unless exact original textual representation/order is a business requirement.
- Replace `JSON_OBJECT`/`JSON_ARRAY` with bound JSON, JSON literals, or `jsonb_build_object`/`jsonb_build_array`.
- Replace `CAST(? AS JSON)` with an explicit `jsonb` binding/cast.
- Validate every source JSON value before import and regression-test serialized API output.

### Native queries and JDBC

- No annotation-based native JPA queries were found.
- All executable native SQL risks are in `JdbcTemplate` code listed above.
- Standard joins, aggregates, `COALESCE`, `CASE`, `DATE(timestamp)`, `UNION ALL`, `LIMIT/OFFSET`, inserts, and deletes can generally remain.

### Stored procedures, views, and triggers

- None were found.
- A new timestamp trigger is optional for notification preferences, but application-managed timestamps are simpler and avoid introducing a new database behavior.

### Indexes and unique constraints

- MySQL permits `INDEX ...` and `UNIQUE KEY ...` inside `CREATE TABLE`; PostgreSQL requires table `UNIQUE` constraints or separate `CREATE [UNIQUE] INDEX` statements.
- Preserve every existing access-path index, then validate with `EXPLAIN (ANALYZE, BUFFERS)` rather than assuming equivalent query plans.
- PostgreSQL does **not** automatically create indexes on referencing foreign-key columns; preserve the explicit FK indexes.
- Replace `FULLTEXT INDEX ftx_job_descriptions_content` (V2:135) with an intentional GIN/`tsvector` search implementation if the application needs full-text search. No runtime `MATCH ... AGAINST` query currently uses it, so deferral is possible.
- Re-evaluate identifier length: PostgreSQL truncates identifiers to 63 bytes. Check every generated/explicit constraint and index name for collision after truncation.
- Re-evaluate unique constraints under case-sensitive PostgreSQL behavior and NULL semantics. The “current subscription” rule deserves a partial unique index rather than a nullable generated surrogate.

### Binary and large text

- `MEDIUMTEXT` → `TEXT`.
- `MEDIUMBLOB` and `VARBINARY(n)` → `bytea`; PostgreSQL `bytea` does not enforce the MySQL maximum length, so add a `CHECK (octet_length(...) <= n)` only if that limit is meaningful.
- Verify profile photos and encrypted credentials byte-for-byte after import.

### `AFTER column`

- Found in V7, V10, V11, and V16.
- PostgreSQL does not support physical placement in `ADD COLUMN`. Remove it; application queries use named columns or `table.*` row maps and should not depend on ordinal position.

## What does not need database-specific change

- Controllers, DTOs, validation, security filters, AI provider adapters, PDF rendering, frontend code, and HTTP API contracts.
- Spring Data derived repository methods and ordinary JPA mappings, subject to PostgreSQL integration tests.
- Most service orchestration and transaction annotations.
- Standard SQL constructs noted above.
- `GenerationType.IDENTITY` annotations, provided PostgreSQL identity DDL and sequence synchronization are correct.
- Boolean Java/JDBC handling.
- Dockerfiles themselves and the Nginx configuration.

## Data migration risks and validation requirements

1. **Flyway history:** never point the current MySQL migration set at PostgreSQL. Establish a PostgreSQL baseline and record the chosen baseline/version strategy.
2. **Consistent cutover:** use an application write freeze or CDC-based plan. A plain dump while writes continue can break referential consistency.
3. **ID preservation:** import parent tables first, keep existing IDs, then reset identity sequences.
4. **Timestamp interpretation:** determine the source MySQL server/session timezone and whether `DATETIME` values were written as UTC. Convert once, not twice.
5. **Case collisions:** before import, search natural keys using `lower(...)` (emails, template names, provider keys, external references) for rows that will collide under the selected target rule.
6. **Zero/invalid dates:** scan for MySQL sentinel dates and out-of-range values; PostgreSQL rejects them.
7. **JSON:** validate syntax and choose `jsonb`; compare document counts and representative values.
8. **Binary:** compare byte length and cryptographic hashes for images and encrypted credentials.
9. **Text/collation:** test Unicode normalization, sorting, case matching, and maximum lengths.
10. **Constraints:** load in a controlled order, then validate row counts, orphan counts, unique constraints, check constraints, and FK constraints.
11. **Sequences:** compare `nextval` against every identity table's maximum ID.
12. **Query behavior:** regression-test ownership-protected updates, upserts, monthly AI budget boundaries, ATS text aggregation, pagination, and generated-key child inserts.
13. **Performance:** collect PostgreSQL statistics (`ANALYZE`) after load and examine important plans.
14. **Rollback:** retain a final MySQL snapshot and define DNS/application rollback boundaries; do not allow divergent writes without a reconciliation strategy.

## Migration checklist — safest to hardest

1. **Inventory and decisions**
   - [ ] Pin the supported PostgreSQL major version and JDBC/Flyway versions.
   - [ ] Choose `timestamptz(6)` versus `timestamp(6)` based on proven source semantics.
   - [ ] Choose `jsonb` versus `json`.
   - [ ] Define case-insensitive uniqueness/collation policy for natural keys.
   - [ ] Decide clean PostgreSQL baseline versus parallel vendor-specific Flyway locations.

2. **Documentation and non-runtime labels**
   - [ ] Update architecture, onboarding, database, Docker, and deployment docs.
   - [ ] Replace port 3306, MySQL service/CLI/backup commands, and MySQL stack diagrams.
   - [ ] Sanitize the NUL byte in the large learning guide, then audit its remaining content.

3. **Build and datasource configuration**
   - [ ] Replace MySQL JDBC and Flyway modules with PostgreSQL equivalents.
   - [ ] Remove/change the forced Hibernate dialect and driver classes.
   - [ ] Change example JDBC URLs, ports, users, and non-secret placeholder credentials.
   - [ ] Update environment validation and its tests.

4. **CI**
   - [ ] Replace the MySQL 8.4 service with PostgreSQL and `pg_isready`.
   - [ ] Change integration JDBC URL and step labels.
   - [ ] Run all migrations and database integration tests on a fresh PostgreSQL database.

5. **Portable schema rewrite**
   - [ ] Convert `AUTO_INCREMENT` to identity columns.
   - [ ] Remove engine/charset/`AFTER` clauses.
   - [ ] Convert `DATETIME(6)`, `MEDIUMTEXT`, `MEDIUMBLOB`, and `VARBINARY`.
   - [ ] Convert inline indexes/unique keys to PostgreSQL constraints/indexes.
   - [ ] Preserve all PK/FK/check/index names without 63-byte collisions.

6. **Entity mappings**
   - [ ] Remove MySQL `MEDIUMTEXT`/`MEDIUMBLOB` definitions.
   - [ ] Implement consistent JSONB mapping/binding.
   - [ ] Validate JPA schema mappings against PostgreSQL with `ddl-auto=validate` in a dedicated test profile if appropriate.

7. **Straightforward runtime SQL**
   - [ ] Replace `NOW(6)`, `DATE_ADD`, `DATE_FORMAT`, and `UTC_TIMESTAMP`.
   - [ ] Replace JSON construction/casts.
   - [ ] Translate all upserts to `ON CONFLICT ... EXCLUDED`.
   - [ ] Translate `UPDATE ... JOIN` to `UPDATE ... FROM`.

8. **Generated keys and transactional correctness**
   - [ ] Replace every `LAST_INSERT_ID()` with atomic `RETURNING id` or Spring generated-key APIs.
   - [ ] Verify ATS child rows, job creation, and AI usage ledger writes use the correct parent ID under concurrency.

9. **Complex schema/query semantics**
   - [ ] Redesign the current-subscription uniqueness rule as a partial unique index.
   - [ ] Replace or defer the MySQL FULLTEXT index.
   - [ ] Rewrite ATS `GROUP_CONCAT` using deterministic `string_agg` without join multiplication.
   - [ ] Decide application-managed versus trigger-managed notification `updated_at`.

10. **Data profiling and rehearsal**
    - [ ] Profile case collisions, invalid dates, booleans, JSON validity, binary lengths, orphans, and duplicates in MySQL.
    - [ ] Build repeatable export/transform/import scripts.
    - [ ] Rehearse against a production-sized snapshot and record duration.
    - [ ] Reset all identity sequences and run data reconciliation queries.

11. **Full verification**
    - [ ] Run unit, integration, security, Flyway, and end-to-end suites.
    - [ ] Add PostgreSQL-specific concurrency tests for upserts and generated keys.
    - [ ] Compare critical API responses and record counts between databases.
    - [ ] Benchmark important queries and add/tune indexes based on PostgreSQL plans.

12. **Production cutover**
    - [ ] Take and restore-test final MySQL backup.
    - [ ] Apply write freeze or validated CDC catch-up.
    - [ ] Import, reconcile, reset sequences, analyze, and smoke-test.
    - [ ] Switch secrets/URL without exposing the database publicly.
    - [ ] Monitor errors, locks, connection pool, query latency, sequence health, and data drift.
    - [ ] Keep a time-bounded, tested rollback plan until PostgreSQL is accepted as authoritative.

## Final assessment

This is not a driver-only migration. The domain model and most application layers are portable, but the Flyway schema and a concentrated set of JDBC repositories are deliberately MySQL-specific. The safest approach is to create a PostgreSQL-native baseline/schema, rewrite the identified runtime SQL, validate behavior in PostgreSQL CI, and only then rehearse production data transfer. Editing already-applied MySQL Flyway files in place would be the riskiest approach because it breaks checksum history while still failing to provide a controlled cross-engine data migration.
