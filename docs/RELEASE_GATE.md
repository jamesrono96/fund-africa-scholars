# Release gate — owner review required

This checklist is the final boundary between the private development preview and a real public service. A checked code task does not mean a live provider, legal review, or production deployment has been completed.

## Completed development foundations
- Public landing page, scholarship directory and scholarship detail interface
- Student account, profile, saved opportunities and application tracker
- Admin scholarship management and evidence-based verification gate
- Official-source discovery queue with human approval; no automatic publishing
- Development Worker and D1 schema/migrations
- JavaScript, API-security and SQLite migration checks in GitHub Actions
- Playwright account/directory smoke tests and mobile-width responsive checks
- Baseline API security headers

Owner confirmations are collected in [OWNER_DECISIONS.md](OWNER_DECISIONS.md).

## Must be completed before real students use the service
- [ ] Choose a transactional email provider and configure its API token as a Cloudflare Worker secret (never commit it)
- [ ] Implement and test email verification and password reset end-to-end using that provider
- [ ] Configure the sender domain and verify SPF, DKIM and DMARC with the selected provider
- [ ] Choose and purchase the custom domain; place the website and API under the same registrable domain to avoid third-party-cookie restrictions
- [ ] Reconfigure APP_ORIGIN, CORS, cookie policy and CSRF protections for the final domain; test sign-in/session persistence in Chrome, Firefox, Safari and mobile browsers
- [ ] Review CodeQL and Dependabot findings and complete independent security/dependency review
- [ ] Complete accessibility and mobile-device review
- [ ] Publish privacy notice, terms and data-retention policy after legal review
- [x] Record owner policy of no voluntary membership refunds, preserving mandatory statutory rights and payment-provider remedies
- [ ] Obtain jurisdiction-specific legal review of [membership terms draft](MEMBERSHIP_TERMS_DRAFT.md), including no-refund wording, before checkout
- [ ] Configure automated database backups, retention, monitoring and incident-response contacts; rehearse a restore using [the operations runbook](OPERATIONS_RUNBOOK.md)
- [ ] Owner approves the initial official source list and review cadence ([source policy](SCHOLARSHIP_SOURCE_POLICY.md))
- [ ] Populate the directory only with genuine opportunities checked against official sources
- [ ] Confirm the owner administrator account is securely promoted in the private development database and review the admin workflow
- [ ] Test student and administrator workflows with synthetic accounts and records only, including the new admin read-only tables and deadline watch

## Approved membership policy
- [x] USD $5 one-time payment grants lifetime membership (not recurring and not three-month expiry)
- [x] Public scholarship browsing, searching, detail pages and official application links remain free
- [x] All five premium features are included together for lifetime members:
  1. Save/bookmark scholarships
  2. Application tracker
  3. Deadline watch and reminders
  4. Private application notes
  5. Enhanced personalised recommendations
- [x] Implement server-side premium entitlement checks against a verified USD $5 succeeded lifetime payment record (payment integration is still absent)
- [x] Add a student membership-status API and dashboard messaging for free versus lifetime-member accounts
- [x] Keep public scholarship browsing and official links accessible without membership
- [x] Add regression tests for free-account and lifetime-member states, including blocked unpaid reads and mutations
- [ ] Complete live development Worker/D1 and cross-browser testing of premium gating
- [ ] Publish clear membership, no-voluntary-refund and support terms after legal review

## Decisions required before payments (payments are currently OFF)
- [ ] Owner gives separate explicit approval to begin payment integration
- [ ] Select a payment provider that supports the intended customer countries and payment methods
- [x] Record no-voluntary-refund owner policy, subject to non-waivable legal rights
- [ ] Confirm currency display, settlement currency, disputes and support process
- [ ] Implement provider-side payment verification, signed webhooks, idempotency and audit logging
- [ ] Test successful, failed, pending, duplicate, refunded and disputed payment scenarios in provider test mode
- [ ] Owner explicitly approves live payment activation after test-mode acceptance

## Production release gate
- [ ] Owner explicitly approves production deployment
- [ ] Production database and secrets are separate from development
- [ ] Production migrations and rollback plan are reviewed
- [ ] Production smoke tests pass on the custom domain
- [ ] Payment integration passes provider test mode before any live transaction
- [ ] Final owner acceptance test is completed

## Current restrictions
Payments are not integrated or activated. The premium API gate is implemented, but no user can obtain a paid membership through the website yet. Do not add a payment provider, checkout, live payment credentials or payment webhook/membership activation workflow until the owner separately approves that work. Production hosting and production data collection are not enabled. The GitHub Pages preview and development Worker are not approved for real student personal information. Automated scholarship discovery produces review candidates only and never verifies or publishes an opportunity by itself.
