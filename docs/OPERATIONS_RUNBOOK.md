# Operations, backup and recovery runbook

This is a preparation guide for the owner and future operator. It does not claim that backups, alerts or an incident-response service are already configured.

## Current environment boundary

- The GitHub Pages preview and development Cloudflare Worker/D1 are for development and synthetic test data only.
- Do not enter real student personal information until the release gate is satisfied.
- Never store API tokens, database exports, passwords, session cookies or payment credentials in this repository.
- Production infrastructure must use separate resources and secrets and requires explicit owner approval.

## Before accepting real users

1. Identify the production D1 database, Worker, website domain and account owners.
2. Enable an automated D1 backup/export process appropriate to the selected Cloudflare plan and document its retention window.
3. Store backup files in a restricted, encrypted location outside GitHub. Restrict access to named operators and record access.
4. Define a recovery point objective (maximum acceptable data loss) and recovery time objective (maximum acceptable outage) with the owner.
5. Configure alerts for Worker errors, failed scheduled discovery jobs, D1 capacity/availability and backup failures.
6. Record the operator, escalation contact and incident communication procedure.
7. Run a restore rehearsal into a separate non-production database before launch, and after material schema changes.

## Backup verification checklist

- [ ] Confirm the backup job completed and its timestamp is recorded.
- [ ] Confirm the export is non-empty and can be opened by the intended restore tooling.
- [ ] Confirm access controls and encryption for the backup location.
- [ ] Confirm retention and deletion policy.
- [ ] Record the schema/migration version represented by the backup.
- [ ] Never overwrite the only known-good backup with an unverified export.

## Recovery procedure

1. Declare the incident and pause risky administrative changes.
2. Identify the last known-good backup and the relevant schema/migration version.
3. Restore to a separate recovery database first; do not overwrite the live database as an initial test.
4. Apply only the reviewed migrations needed to bring the restored database to the intended version.
5. Check database integrity and foreign-key consistency.
6. Verify a small set of synthetic accounts, scholarship records, saved items, applications and audit events.
7. Confirm Worker bindings and secrets point to the intended environment.
8. Obtain owner approval before switching traffic or replacing a production database.
9. Record the incident timeline, data-loss window, actions taken and follow-up work.

## Scholarship-source operations

- Register only official university, government, embassy, foundation or recognized scholarship-portal domains.
- Check that the registered page and application URL use HTTPS and belong to the institution/provider.
- Discovery candidates are leads only. A person must check intake status, eligible nationalities, study level, funding, deadline/time zone and application route against official evidence.
- Re-check changed or uncertain records. Do not automatically mark an opportunity verified or archive it solely because a date has passed; confirm the provider's current intake status.
- Record reviewer decisions and evidence in the admin workflow.

## Incident response

For suspected account compromise, exposed credentials, unauthorized data access or incorrect scholarship publication:

1. Restrict affected credentials or sessions using the provider's supported controls.
2. Preserve relevant logs and timestamps; do not publish personal data in issue trackers.
3. Assess affected users and records with the owner and qualified security/privacy support.
4. Follow applicable legal and contractual notification obligations after jurisdiction-specific review.
5. Rotate affected secrets, patch the cause, test recovery and document closure.

## Status

This runbook is a draft. Backup automation, retention, monitoring, alert delivery, restore rehearsal, recovery objectives and incident contacts must be configured and approved before production.
