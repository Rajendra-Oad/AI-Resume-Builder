# Release Runbook

## Purpose and roles

This runbook deploys one immutable, reviewed commit to Render and Vercel through GitHub Actions. The release manager controls the window and decision log; engineering owns application verification; the DBA/SRE owns database, monitoring, and recovery evidence; security owns secret/security exceptions; the product owner accepts user-facing scope.

Store real names, phone numbers, provider support IDs, and escalation channels in the private on-call system—not in Git. At launch record:

- primary/secondary on-call;
- incident commander and communications lead;
- Render, Vercel, PostgreSQL, SMTP, AI, DNS, and monitoring escalation links;
- product/security/legal escalation routes.

## Standard release

1. Open the release ticket and copy `PRODUCTION_LAUNCH_CHECKLIST.md` into it.
2. Freeze the exact SHA. Confirm CI, integration, dependency/security, UAT, and release approvals.
3. Verify dashboards/alerts, latest recovery point, PITR/restore evidence, provider status, and on-call availability.
4. Confirm Render/Vercel/GitHub environment secrets by name and owner without exporting their values.
5. Create the semantic release tag only for the approved SHA. Preserve generated backend/frontend artifacts and release notes.
6. Start the production deployment workflow. Do not manually deploy a different branch or mutable workspace.
7. Watch the Render build/startup logs. Flyway must complete successfully before readiness becomes healthy. Stop on checksum, validation, connection, or secret errors.
8. Watch Vercel build and promotion. Confirm the deployment is associated with the same SHA.
9. Verify the deployment workflow's reusable production smoke script passes readiness, liveness, metrics protection, frontend availability/security headers, and the Vercel-to-Render authenticated API boundary.
10. Execute the smoke-test section of the launch checklist with synthetic accounts.
11. Compare errors, latency, JVM, Hikari, PostgreSQL, provider usage/cost, and frontend errors with the pre-release baseline.
12. Record approval and enter the post-launch observation window. Close only after evidence is attached.

## Verification failure

- Stop further promotion or user communication that assumes success.
- Preserve logs, correlation IDs, deploy IDs, timestamps, and sanitized failing responses.
- Determine whether the failure is application, configuration, provider, DNS, database, or observability related.
- If a safe configuration correction is approved, version the change in the provider audit trail and redeploy; never patch secrets into code.
- If user impact or data risk exists, declare an incident and follow `INCIDENT_RESPONSE.md`.

## Application rollback

1. Release manager and incident commander approve rollback and record the reason/time.
2. Confirm the last known-good application is compatible with the current Flyway schema and accepted writes.
3. Roll back/promote the known-good Render deployment and Vercel deployment using provider history or the documented CI/CD procedure.
4. Restore the matching configuration inventory where required, without rotating secrets unless compromise is suspected.
5. Wait for readiness and run authentication, resume retrieval/edit, dashboard, and API-proxy smoke tests.
6. Monitor errors, Hikari/database connections, and background work until stable.
7. Preserve the failed release for investigation; open corrective actions before retrying.

## Database rollback strategy

Flyway is forward-only. Never edit an applied migration, manually remove its history row, or start an older backend against a newer schema without proven compatibility. Prefer an application hotfix/forward migration. Use PITR or a verified backup restore only for corruption/destructive change under the recovery runbook, with write freeze, explicit data-loss/RPO approval, isolated restore validation, and controlled cutover.

## Configuration rollback

Compare the deployed Render/Vercel environment to the approved private inventory. Revert only the identified values, preserve audit evidence, and restart/redeploy through provider controls. Secret compromise requires rotation and session/token/provider revocation, not simple value restoration.

## Emergency communication

- Severity, start time, affected workflows/regions, customer impact, data/security status, owner, next update time.
- Use verified facts; never paste tokens, resume content, email addresses, database rows, or provider payloads.
- Notify provider support when their service is implicated and retain ticket IDs.
- Update stakeholders at the cadence defined by severity until recovery and final closure.
