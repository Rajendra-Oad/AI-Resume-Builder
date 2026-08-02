# Backup and Disaster Recovery

## Scope and current resilience

This is the production recovery runbook for the AI Resume Builder: React on Vercel, Spring Boot on Render, and PostgreSQL on Render. It protects database state, deployable application artifacts, infrastructure configuration, and the secrets required to decrypt or access data. It does not change application behavior or the database schema.

Current controls:

- `render.yaml`, `vercel.json`, Dockerfiles, Flyway migrations, workflows, and application configuration keys are versioned in Git.
- GitHub Actions builds and verifies immutable commits, and Render/Vercel retain deployment history for application rollback.
- Flyway is the schema authority; Hibernate validates rather than updates production schema.
- Render readiness includes database connectivity and disk-space health.
- Secret values are external to Git and therefore are **not** recoverable from this repository.
- The repository does not identify the active Render database plan, prove PITR availability, record a successful backup, or contain restore-test evidence.

Production must use a paid Render PostgreSQL instance whose Recovery page shows an active recovery window. Render currently provides continuous PITR for paid databases; the documented window is three days for Hobby workspaces and seven days for Pro or higher. Free databases do not have Render recovery. Confirm the live dashboard and current provider documentation rather than assuming the Blueprint default provides backups.

## Recovery policy and objectives

The service owner must approve and record these values before launch. Do not claim an objective until a timed rehearsal demonstrates it.

| Objective                | Approved value                                                  | Evidence required                                                          |
| ------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Data-loss RPO            | `TBD`                                                           | Must be no greater than the active PITR/archive lag and business tolerance |
| Service RTO              | `TBD`                                                           | Timed database recovery, configuration switch, deploy and smoke test       |
| PITR window              | `TBD`                                                           | Screenshot/export from the production database Recovery page with date     |
| Logical export retention | `TBD`                                                           | Object-storage lifecycle policy and successful retrieval evidence          |
| Restore-test frequency   | At least quarterly and after material platform/database changes | Completed recovery-test record                                             |

The minimum technical strategy is continuous provider PITR plus independently retained logical exports when retention beyond the provider recovery window is required. `pg_dump` is portability/long-retention coverage; it is not a replacement for PITR and does not by itself prove recoverability.

## Ownership

| Responsibility                                        | Accountable role                                                           |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| Approve RPO/RTO, retention and recovery spend         | Product/service owner                                                      |
| Verify PITR, backup age, storage and alerts           | Primary DBA/SRE                                                            |
| Control database recovery and production cutover      | Incident commander plus DBA                                                |
| Maintain Render/Vercel/GitHub configuration inventory | Platform owner                                                             |
| Escrow and rotate secrets                             | Security owner; a second authorized custodian must be able to recover them |
| Execute application verification                      | Backend/frontend service owners                                            |
| Schedule and record restore rehearsals                | SRE owner                                                                  |

No single operator should both authorize destructive production actions and execute them without peer verification.

## Database backup schedule

### Continuous recovery

1. Use a paid Render PostgreSQL database.
2. On the Recovery page, verify PITR is active and record the earliest/latest selectable recovery time.
3. Alert on database unavailability, storage pressure, backup/recovery warnings, and a recovery window that is absent or shorter than policy.
4. Review recovery capability weekly and before every migration-bearing production deployment.
5. Before risky deployments, record an available recovery point immediately before deployment; provider PITR is continuous, so this is evidence/annotation rather than a manual snapshot.

PITR restores to a **new** Render database. This isolation is intentional and enables validation before cutover. Never delete the original database until recovery is verified and the incident retention period has elapsed.

### Logical exports and long-term retention

Render-created logical exports are retained by Render for seven days. If policy requires longer retention, schedule `pg_dump` exports to a separate private object-storage account using Render's documented PostgreSQL-to-S3 pattern or an equivalent controlled runner.

Recommended policy to approve—not an assertion about the current account—is:

- weekly logical export;
- retain weekly copies for five weeks;
- retain one monthly copy for twelve months if legal/privacy policy allows;
- delete expired copies through object-storage lifecycle rules;
- take an additional export before exceptionally high-risk data operations.

The final frequency and retention must fit the approved RPO, data classification, storage cost, and deletion obligations. Backups contain personal resumes, credential ciphertext, authentication records, audit data, and payment history; they inherit the highest data classification in the database.

For each export:

1. use the same PostgreSQL client major version as the server where practical;
2. use a dedicated least-privilege backup identity, never the application password;
3. require TLS in transit;
4. use private storage with public access blocked, provider-managed encryption at rest, versioning/object lock where required, and a key policy separate from application administrators;
5. record UTC start/end time, source database identifier, PostgreSQL version, archive size, checksum, tool version and storage object version;
6. alert on missed schedule, nonzero exit, zero/unexpected size, checksum failure, age beyond policy, or lifecycle/replication failure.

Do not log connection URLs, passwords, encryption keys, JWT secrets, AI keys, SMTP credentials, or restored row contents.

## Backup verification

Completion of a backup job is not recovery evidence.

- After every logical export, verify a cryptographic checksum and that `pg_restore --list <archive>` can read the archive catalog.
- At least quarterly, restore a selected backup or PITR point into a new isolated database.
- Run [the restored-database validator](../scripts/disaster-recovery/validate-restored-database.ps1) and the application smoke tests below.
- Record duration, selected recovery point, observed data cutoff, Flyway version, PostgreSQL version, application commit, failures and corrective actions.
- Delete the isolated recovery database only after evidence is retained and the test owner signs off.

Example read-only structural validation after restoring to a deliberately named isolated database:

```powershell
$env:DR_DATABASE_URL = "postgresql://<recovery-user>:<password>@<host>/<app-dr-restore-name>?sslmode=require"
./scripts/disaster-recovery/validate-restored-database.ps1 -ExpectedFlywayVersion "17.1"
Remove-Item Env:DR_DATABASE_URL
```

The validator refuses database names that do not visibly identify a DR/recovery target. It checks required tables, successful Flyway history and the expected latest version without printing application rows. It does not prove data correctness or application behavior.

## Point-in-time recovery procedure

Use PITR for corruption, accidental deletion, or recent data loss within the active window.

1. Declare an incident, appoint an incident commander and record the suspected UTC damage time.
2. Stop or restrict writes when continued writes would worsen loss. Preserve logs and the damaged database.
3. Confirm the chosen recovery time is before the damaging transaction and within Render's Recovery window. Account for monitoring/log clock accuracy.
4. In Render PostgreSQL **Recovery**, start a point-in-time restore to a new database with a name containing `recovery` or `dr-`.
5. Keep the recovery instance isolated from production services. Restrict its IP allowlist and access.
6. When available, run structural validation with the expected Flyway version for the application commit being recovered.
7. Query only approved aggregate/control data to confirm the expected cutoff. Do not copy sensitive rows into tickets or chat.
8. Connect an isolated backend deployment to the recovered database. Use production-equivalent configuration but separate mail/AI credentials or safe provider test settings to prevent external side effects.
9. Run the recovery smoke tests.
10. Freeze production writes, record the final acknowledged RPO/data gap, and obtain cutover approval.
11. Update the Render backend database references (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`) to the recovery instance. Keep `DB_SSL_MODE=require`.
12. Deploy the application commit compatible with the restored Flyway history. Watch Flyway startup and readiness.
13. Verify production through Vercel, monitor errors/connections, and reconcile any approved post-recovery transactions.
14. Retain the old database read-only/suspended according to incident and privacy policy. Delete it only with explicit authorization after the rollback window.

Render does not permit selecting a recovery time within the most recent ten minutes. Current plan limits and provider status can extend achievable RPO/RTO.

## Full restore from a logical export

Prefer PITR for recent Render-hosted loss. Use a logical export for long-term recovery, portability, or when the required point is outside PITR.

1. Retrieve the archive and its recorded checksum from protected storage; verify both before extraction.
2. Provision a new empty PostgreSQL database with a supported version and sufficient storage. Never target the production database or a schema containing valuable data.
3. Restrict network access and create the required owner/restore roles without using application credentials.
4. Install matching PostgreSQL client tools. Follow the archive-format-specific `pg_restore` procedure from Render/PostgreSQL documentation with `ON_ERROR_STOP`/`--exit-on-error`, no owner restoration where roles differ, and TLS.
5. Capture restore start/end time and sanitized command/tool versions. Do not capture the connection secret.
6. Run `ANALYZE` after a successful restore so planner statistics reflect the restored instance.
7. Run the structural validator, compare approved aggregate counts/control records, and inspect Flyway history.
8. Start an isolated compatible backend and complete smoke tests.
9. Follow the controlled cutover steps from the PITR procedure.

Do not run `flyway repair`, edit `flyway_schema_history`, delete migrations, or enable Hibernate schema update to make a restore pass. Investigate any checksum/version mismatch and select the matching application commit or an approved forward-fix.

## Flyway and application compatibility

Before connecting an application release, record:

- Git commit and backend artifact/image digest;
- latest successful `flyway_schema_history.version` and checksum status;
- PostgreSQL major version;
- whether the application release expects migrations newer than the restored point.

Starting a newer backend may apply forward migrations automatically. Do this first on the isolated restored database and only when the forward transition is the approved recovery strategy. Starting an older backend against a newer schema is allowed only when compatibility was demonstrated by that release. Database rollback is never performed by editing applied migration files.

## Application and infrastructure recovery

### Backend on Render

1. Recreate/sync the service from the reviewed `render.yaml` at the approved commit.
2. Restore every required secret from the authorized secret manager/escrow, not from chat, tickets, logs or developer `.env` files.
3. Attach the recovered database fields and verify TLS, frontend URL, CORS and secure cookies.
4. Deploy the exact compatible commit/image and wait for readiness.
5. Confirm metrics/logging and alert delivery before reopening traffic.

### Frontend on Vercel

1. Recreate the project from the Git repository and reviewed `vercel.json`, or promote/roll back a known-good deployment.
2. Restore the inventory of public build variables. If Sentry is enabled, restore its DSN/environment/release configuration; never place a private token in `VITE_*`.
3. Verify the `/api` rewrite points to the recovered Render service and redeploy so current variables are included.
4. Test direct nested-route loads, CSP, HTTPS and API proxy behavior.

Vercel rollback restores a previous deployment's configuration and can therefore use stale environment values. After rollback, explicitly compare the deployed environment against the recovery inventory.

### Configuration and secret recovery

Git is the backup for non-secret configuration: protect the repository with organization ownership, MFA, branch protection, and an independently recoverable Git provider account. Periodically mirror the repository or release bundles to a second controlled location.

Maintain a secrets inventory in an approved password manager or cloud secret manager. Store **names, owners, locations, rotation dates and recovery contacts** in the inventory; store values only in the secret manager. Cover at least:

- Render/GitHub/Vercel owner and recovery accounts;
- database credentials and backup identity;
- `JWT_SECRET`;
- `USER_API_KEY_ENCRYPTION_KEY`—loss makes stored user provider credentials undecryptable;
- SMTP credentials and `MAIL_FROM` ownership;
- Gemini/OpenAI keys;
- `MANAGEMENT_METRICS_TOKEN`;
- Vercel public build configuration and any private CI/deployment tokens;
- object-storage credentials and backup encryption/KMS recovery authority;
- DNS registrar/domain recovery and TLS ownership.

Export only platform configuration metadata/key names where supported. Never commit or place plaintext secret exports beside database archives. Require two authorized custodians, tested break-glass access, MFA recovery codes in protected escrow, access review, and rotation after suspected disclosure or recovery use.

## Recovery smoke tests

Run against the isolated recovered environment before production cutover:

1. Backend readiness and liveness return healthy; metrics scrape succeeds with its token.
2. Flyway startup completes without repair/baseline/checksum warnings; Hibernate validation passes.
3. Existing authorized test user can log in, refresh and log out. Use a dedicated recovery-test account, not a customer account.
4. Create, update, version, restore and delete a synthetic resume.
5. Run AI generation using an approved test provider/project and confirm failure handling; do not spend against production unexpectedly.
6. Run ATS analysis and verify job-match/history output.
7. Generate/download a PDF and verify export history.
8. Confirm notifications/mail are redirected or suppressed in isolation.
9. Confirm logs contain correlation IDs and no secrets/content; confirm dashboards receive signals.
10. Verify an aggregate record count and a known synthetic canary created before the selected recovery point. Do not expose real row contents in evidence.

After cutover, repeat only safe production checks and create a new synthetic record. Do not repeat side-effecting provider tests without authorization.

## Disaster decision matrix

| Event                                         | Primary response                                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Bad application deployment, schema compatible | Roll back/redeploy Render and Vercel artifacts; no database restore                                                    |
| Failed migration before commit                | Preserve logs, verify Flyway history, deploy approved fix; restore only if data/schema was damaged                     |
| Accidental deletion or recent corruption      | Stop writes and PITR to a new instance before the event                                                                |
| Corruption outside PITR window                | Restore independently retained logical export to a new instance                                                        |
| Render service loss, database healthy         | Recreate backend from Blueprint, restore secrets, attach existing database                                             |
| Vercel project loss                           | Recreate from Git/vercel.json, restore public environment inventory and domain                                         |
| Secret exposure                               | Rotate affected secrets and dependent credentials; restore service configuration; database restore usually unnecessary |
| Encryption key loss                           | Recover escrowed key; database backup alone cannot decrypt user provider credentials                                   |
| Region/provider-wide outage                   | Escalate to provider and execute cross-provider recovery only if separately designed, funded and rehearsed             |

The current repository does not implement cross-region database replication or automatic provider failover. Do not claim regional disaster recovery until those external controls exist and are tested.

## Recovery checklist and evidence

### Before an incident

- [ ] Paid Render PostgreSQL and active PITR window verified.
- [ ] RPO/RTO and retention approved and rehearsed.
- [ ] Backup/recovery/storage alerts reach an owned on-call route.
- [ ] Long-term logical export job and lifecycle policy verified if required.
- [ ] Secret inventory, two-custodian access and MFA recovery tested.
- [ ] Latest application commit/artifact and configuration manifests recoverable.
- [ ] Quarterly restore rehearsal scheduled.

### During recovery

- [ ] Incident commander, DBA and approver named.
- [ ] Writes stopped/restricted and evidence preserved.
- [ ] Damage time and selected UTC recovery point recorded.
- [ ] Restore targets a new isolated database.
- [ ] Checksum, Flyway, structural and application verification passed.
- [ ] Observed RPO/data gap and cutover approval recorded.
- [ ] Backend/frontend configuration points to the intended recovery resources.
- [ ] Monitoring and rollback window active.

### After recovery

- [ ] Customer-impact and data-reconciliation decisions completed.
- [ ] Compromised/used secrets rotated where required.
- [ ] New backup/PITR coverage verified on the recovered primary.
- [ ] Old resources retained or destroyed under explicit policy/approval.
- [ ] Actual RPO/RTO, timeline, evidence and follow-up actions recorded.
- [ ] Runbook and automation corrected from lessons learned.

Evidence must include identifiers, timestamps, checksums, versions, sanitized screenshots/logs and approvals—never credentials or customer data.

## Provider references

- [Render PostgreSQL recovery and backups](https://render.com/docs/postgresql-backups)
- [Render PostgreSQL creation, connection and encryption](https://render.com/docs/postgresql-creating-connecting)
- [Render Blueprint infrastructure as code](https://render.com/docs/infrastructure-as-code)
- [Render environment variables and secret files](https://render.com/docs/configure-environment-variables)
- [Vercel deployment rollback](https://vercel.com/docs/instant-rollback)
- [Vercel environment variables](https://vercel.com/docs/environment-variables)
