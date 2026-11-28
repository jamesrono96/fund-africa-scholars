# Owner handover and final development checklist

**Prepared:** 28 November 2026  
**Repository:** `jamesrono96/fund-africa-scholars`  
**Environment:** Development preview only  
**Release status:** NOT READY FOR REAL STUDENT DATA OR PRODUCTION

## 1. Confirmed development foundation
The repository contains:
- Public landing page, scholarship directory and scholarship detail pages.
- Homepage search routing to the directory with query, destination and study-level filters.
- Student registration/login UI and Worker API foundation, password hashing and HTTP-only session-cookie foundation.
- Student dashboard with profile, saved scholarships, application tracker, notes, preferred destinations and deadline watch.
- Admin dashboard and server-side admin API foundations for scholarship management, verification, publication, read-only users and audit logs.
- Official scholarship-source registry and candidate discovery/review workflow. Discovery does not verify or publish scholarships automatically.
- D1 base schema and numbered migrations.
- GitHub Actions for validation, browser tests, CodeQL, Pages preview and development service smoke checks.
- Draft operational, release and source-verification documentation.

## 2. Approved membership direction
The owner has confirmed:
- **USD $5 one-time lifetime membership.**
- **Free scholarship browsing:** public users can browse, search and view scholarship details without paying.
- **Premium features:** selected student-support tools will be reserved for lifetime members.
- **Payments remain disabled** until the owner separately approves payment integration and activation.

Suggested premium boundary for planning (not yet an enforced paywall): saved/bookmarked scholarships, application tracking, deadline watch/reminders, private application notes and enhanced personalised recommendations. Confirm the final list and existing-account treatment before adding access enforcement.

## 3. Latest automated checks
Latest reviewed GitHub Actions runs on commit `ff879cf`:
- Application validation: passed.
- CodeQL security analysis: passed.
- GitHub Pages preview: passed.

Earlier validation included JavaScript syntax checks, npm audit at high severity, Worker API security smoke tests, Playwright browser tests and SQLite schema/migration integrity checks. A passing CI run is not a substitute for end-to-end tests against the live development Worker/D1 or a security audit.

## 4. Development tasks still requiring work
- Run the controlled manual browser test plan against the current preview.
- Test registration, login, logout, session expiry and private student endpoints against the live development Worker/D1.
- Test admin review, field-level evidence checks, draft conversion and publication using synthetic records.
- Test source registration, scan, candidate extraction and changed-source review using approved official sources.
- Review and remediate any new CodeQL and Dependabot findings.
- Complete manual keyboard, screen-reader and real-device/mobile review.
- Configure automated development backups and rehearse a restore.
- Complete independent security review of private endpoints, CSRF/origin controls and session cookie behaviour.
- Design premium entitlements and test their server-side enforcement only after the owner confirms the exact feature boundary.

## 5. Owner actions — required before final operational setup

### A. Approve source registry and reviewers
- Review `INITIAL_OFFICIAL_SOURCE_REGISTRY.md`.
- Confirm initial destinations and providers.
- Name the people who will verify scholarship candidates.
- Approve the review cadence.
- Only then register the approved sources in development.

### B. Securely activate the owner administrator
- Register the owner account through the site using an email address controlled by the owner.
- Confirm the exact email address through a secure owner-controlled channel.
- Use the private development D1 database to promote only that account.
- Never share a password, session token or Cloudflare credential in chat or GitHub.

### C. Choose transactional email
- Select a provider that delivers to intended student countries.
- Choose a sender address and verify the sender domain.
- Add the provider API token as a Cloudflare Worker secret, never a repository file.
- Implement and test email verification and password reset before accepting real accounts.

### D. Confirm domain, hosting and legal jurisdiction
- Choose and purchase the domain.
- Confirm Cloudflare production account and hosting plan.
- Identify operator jurisdiction and countries actively served.
- Obtain qualified review of privacy notice, terms, data retention, membership and refund terms.
- Configure support and privacy-request contact details.

### E. Confirm premium entitlements and payment activation
- Confirm the final premium feature list and treatment of existing accounts.
- Draft and legally review membership, refund and support terms.
- Choose a provider supporting target countries and methods only when ready.
- Owner must separately approve payment integration before any provider or checkout is connected.
- Test signed webhooks, idempotency and success/failure/pending/refund/dispute cases in test mode.
- Live payment activation requires another explicit owner approval.

### F. Optional AI
- Decide whether Workers AI should be enabled.
- Confirm the model and private development configuration.
- AI output remains a suggestion and cannot publish a scholarship.

## 6. Do not do yet
- Do not enter real student personal information into the GitHub Pages preview or development API.
- Do not advertise candidate research documents as verified scholarships.
- Do not accept money, activate checkout or collect membership fees.
- Do not add payment-provider integrations or secrets before separate owner approval.
- Do not commit production secrets to GitHub.
- Do not deploy production or point a purchased domain at the preview until the release gate is satisfied.

## 7. Recommended owner sequence after handover
1. Review and approve the source registry and nominate reviewers.
2. Register the owner account and securely activate administrator access.
3. Complete synthetic-data tests of student and admin workflows.
4. Select email provider and sender domain; complete verification/reset workflows.
5. Choose custom domain and production hosting architecture.
6. Obtain privacy/legal review and complete independent security review.
7. Confirm the final premium feature boundary and membership terms.
8. Approve payment integration separately when ready; keep live payments off until final approval.
9. Approve production deployment explicitly.
10. Run a final owner acceptance test before inviting real students.

## Final status
The development foundation and automated checks are in place, and the membership direction is now approved. The project is not fully launched. Remaining work includes technical testing and owner-controlled provider, account, legal and deployment decisions. Payments remain disabled by explicit owner instruction.
