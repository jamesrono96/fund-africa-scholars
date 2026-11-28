# Release gate — owner review required

This checklist is the final boundary between the private development preview and a real public service. A checked code task does not mean a live provider, legal review, or production deployment has been completed.

## Completed development foundations

- Public landing page, scholarship directory and scholarship detail interface
- Student account, profile, saved opportunities and application tracker
- Admin scholarship management and evidence-based verification gate
- Read-only paginated student-account directory and administrator audit-log viewer
- Read-only paginated student-account directory and administrator audit-log viewer
- Official-source discovery queue with human approval; no automatic publishing
- Development Worker and D1 schema/migrations
- JavaScript, API-security and SQLite migration checks in GitHub Actions
- Playwright account/directory smoke tests and mobile-width responsive checks
- Baseline API security headers

## Must be completed before real students use the service

- [ ] Choose a transactional email provider and configure its API token as a Cloudflare Worker secret (never commit it)
- [ ] Implement and test email verification and password reset end-to-end using that provider
- [ ] Configure the sender domain and verify SPF, DKIM and DMARC with the selected provider
- [ ] Choose and purchase the custom domain; place the website and API under the same registrable domain to avoid third-party-cookie restrictions
- [ ] Reconfigure APP_ORIGIN, CORS, cookie policy and CSRF protections for the final domain; test sign-in/session persistence in Chrome, Firefox, Safari and mobile browsers
- [ ] Review CodeQL and Dependabot findings and complete independent security/dependency review
- [ ] Complete accessibility and mobile-device review
- [ ] Write and obtain owner/legal review of privacy notice, terms, data-retention policy, refund policy and membership terms
- [ ] Configure automated database backups, retention, monitoring and incident-response contacts; rehearse a restore using [the operations runbook](OPERATIONS_RUNBOOK.md)
- [ ] Populate the directory only with genuine opportunities checked against official sources
- [ ] Confirm the owner administrator account is securely promoted in the private development database and review the admin workflow
- [ ] Test student and administrator workflows with synthetic accounts and records only, including the new admin read-only tables and deadline watch, including the new admin read-only tables and deadline watch

## Decisions required before payments

- [ ] Select a payment provider that supports the intended African customer countries and payment methods
- [ ] Confirm price, currency presentation, settlement currency, refunds, disputes and support process
- [ ] Implement provider-side payment verification, signed webhooks, idempotency and audit logging
- [ ] Test successful, failed, pending, duplicate, refunded and disputed payment scenarios
- [ ] Confirm lifetime membership entitlements and access rules

## Production release gate

- [ ] Owner explicitly approves production deployment
- [ ] Production database and secrets are separate from development
- [ ] Production migrations and rollback plan are reviewed
- [ ] Production smoke tests pass on the custom domain
- [ ] Payment integration passes provider test mode before any live transaction
- [ ] Final owner acceptance test is completed

## Current restrictions

Payments are not integrated. Production hosting and production data collection are not enabled. The GitHub Pages preview and development Worker are not approved for real student personal information. Automated scholarship discovery produces review candidates only and never verifies or publishes an opportunity by itself.
