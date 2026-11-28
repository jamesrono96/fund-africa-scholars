# Owner handover and final development checklist

**Prepared:** 28 November 2026  
**Repository:** `jamesrono96/fund-africa-scholars`  
**Environment:** Development preview only  
**Release status:** NOT READY FOR REAL STUDENT DATA OR PRODUCTION

This document separates development work already present in GitHub from actions that require the account owner, external providers, legal review or real-device testing.

## 1. Confirmed development foundation

The repository contains:

- Public landing page, scholarship directory and scholarship detail page.
- Homepage search routing to the directory with query, destination and study-level filters.
- Student registration/login UI and Worker API foundation, password hashing and HTTP-only session-cookie foundation.
- Student dashboard with profile, saved scholarships, application tracker, private notes and deadline watch.
- Admin dashboard and server-side admin API foundations for scholarship management, verification, publication, read-only users and audit logs.
- Official scholarship-source registry and candidate discovery/review workflow. Discovery does not verify or publish scholarships automatically.
- D1 base schema and numbered migrations.
- GitHub Actions for validation, browser tests, CodeQL, Pages preview and development service smoke checks.
- Draft operational, release and source-verification documentation.

## 2. Latest automated checks

Latest reviewed GitHub Actions runs on commit `ed0c6f1`:
- Application validation: passed.
- CodeQL security analysis: passed.
- GitHub Pages preview: passed.

Earlier validation included JavaScript syntax checks, npm audit at high severity, Worker API security smoke tests, Playwright browser tests and SQLite schema/migration integrity checks. A passing CI run is not a substitute for end-to-end tests against the live development Worker/D1 or a security audit.

## 3. Development tasks still requiring work

- Run the controlled manual browser test plan against the current preview.
- Test registration, login, logout, session expiry and private student endpoints against the live development Worker/D1.
- Test admin review, field-level evidence checks, draft conversion and publication using synthetic records.
- Test source registration, scan, candidate extraction and changed-source review using approved official sources.
- Review and remediate any new CodeQL and Dependabot findings.
- Complete manual keyboard, screen-reader and real-device/mobile review.
- Configure automated development backups and rehearse a restore.
- Complete independent security review of private endpoints, CSRF/origin controls and session cookie behaviour.

## 4. Owner actions — required before final operational setup

These cannot be safely guessed or completed without the owner's account access and explicit choices.

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

### E. Confirm membership and payment policy
- Confirm whether USD 5 lifetime membership remains the price.
- Decide which features are public and which require membership.
- Select a provider supporting intended countries and payment methods.
- Approve settlement currency, refunds, failed/pending payments, disputes and support procedures.
- Only then implement signed payment webhooks, server-side verification and idempotent membership activation.

### F. Optional AI
- Decide whether Workers AI should be enabled.
- Confirm the model and private development configuration.
- AI output remains a suggestion and cannot publish a scholarship.

## 5. Recommended owner sequence after handover

1. Review and approve the source registry and nominate reviewers.
2. Register the owner account and securely activate administrator access.
3. Complete synthetic-data tests of student and admin workflows.
4. Select email provider and sender domain; complete verification/reset workflows.
5. Choose custom domain and production hosting architecture.
6. Obtain privacy/legal review and complete independent security review.
7. Confirm membership access rules, payment provider and refund/dispute policy.
8. Approve production deployment explicitly.
9. Deploy separate production Worker and D1, configure secrets/backups/monitoring, migrate and smoke-test.
10. Run a final owner acceptance test before inviting real students.

## 6. Do not do yet

- Do not enter real student personal information into the GitHub Pages preview or development API.
- Do not advertise the current candidate research documents as verified scholarships.
- Do not accept money or enable membership/payment claims.
- Do not add production secrets to GitHub.
- Do not deploy production or point a purchased domain at the preview until the release gate is satisfied.

## Final status

The development foundation and automated checks are in place, but the project is not fully launched. The remaining work is a mixture of additional technical testing and owner-controlled provider, account, legal and deployment decisions. Once the owner actions above are completed, the remaining release work can be performed in a controlled sequence.
