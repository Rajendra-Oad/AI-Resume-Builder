# Incident Response

## Principles

Protect people and data first, restore safe service second, preserve evidence, communicate verified facts, and learn without blame. Never expose secrets, tokens, resume content, prompts, payment history, or personal data in public channels or tickets.

## Severity

| Severity | Definition | Initial response | Update cadence |
| --- | --- | --- | --- |
| SEV-1 | Broad outage, confirmed/likely data loss or security compromise, authentication bypass, destructive database event | Page incident commander, SRE, security, engineering, product immediately | At least every 30 minutes |
| SEV-2 | Major workflow unavailable or severe degradation with no acceptable workaround | Page on-call and service owners | At least hourly |
| SEV-3 | Limited impact, partial degradation, provider issue with workaround | Assign owning team during support hours | As milestones change |
| SEV-4 | Cosmetic/documentation/low-risk operational issue | Normal backlog | Normal tracking |

If uncertain, start at the higher severity and downgrade with evidence.

## First response

1. Acknowledge the alert and create the incident record with UTC start time.
2. Assign incident commander, operations lead, communications lead, and scribe; avoid one person doing every role.
3. State customer impact, affected workflows/regions/releases, data/security status, and next update time.
4. Preserve dashboards, deploy/configuration IDs, correlation IDs, provider status/tickets, and sanitized logs.
5. Stop unsafe deployments, load tests, destructive jobs, or credential use. Freeze writes only when necessary and authorized.
6. Establish the last known-good time/change and choose mitigation: traffic hold, provider fallback, configuration correction, application rollback, or recovery.

## Recovery playbooks

- **Bad release:** follow `RELEASE_RUNBOOK.md` application rollback after schema compatibility review.
- **Database outage/corruption/deletion:** use `BACKUP_AND_RECOVERY.md`; restore in isolation, validate, obtain RPO/data-gap approval, then cut over.
- **Secret compromise:** revoke/rotate the secret, invalidate affected sessions/tokens/credentials, audit access, redeploy safely, and involve security/privacy owners.
- **SMTP/AI/provider outage:** verify provider status and quotas; use approved fallback only; do not bypass user consent or weaken security.
- **High latency/capacity:** correlate request, JVM, Hikari, PostgreSQL, and provider signals; shed optional/heavy work only through existing controls.
- **Frontend/DNS/CDN:** verify provider status/certificates/DNS, then promote the known-good immutable Vercel deployment.

## Communication template

> **[SEV-N] AI Resume Builder — [investigating/identified/monitoring/resolved]**  
> Started: [UTC]  
> Impact: [workflows/users/regions; verified only]  
> Data/security: [no indication / investigating / confirmed; restricted details separately]  
> Current action: [action and owner]  
> Next update: [UTC]

Customer communication requires product/support approval; breach notifications require security/legal/privacy approval. Provider tickets and internal sensitive evidence stay in restricted systems.

## Resolution and monitoring

- Confirm health, authentication, resume workflows, database consistency, provider operations, errors/latency, queued work, and alerts.
- Reconcile any accepted writes or jobs during degradation/recovery.
- Keep enhanced monitoring through the agreed stability window.
- Record resolution time, customer impact, actual RPO/RTO, and remaining risks before closing.

## Post-incident review

Hold a review for SEV-1/2 and recurring SEV-3 incidents. Document timeline, detection, impact, contributing conditions, what worked, what failed, recovery evidence, security/privacy review, and measurable actions with owners/dates. Track actions to completion and update runbooks, tests, alerts, architecture decisions, and training without rewriting history.

