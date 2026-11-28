# Owner handover and final development checklist

**Prepared:** 28 November 2026  
**Repository:** `jamesrono96/fund-africa-scholars`  
**Environment:** Development preview only  
**Release status:** NOT READY FOR REAL STUDENT DATA OR PRODUCTION

## 1. Confirmed development foundation
The latest confirmed repository head at handover preparation is `6224cc0` (28 November 2026). The repository contains:
- Public landing page, scholarship directory and scholarship detail pages.
- Homepage search routing to the directory with query, destination and study-level filters.
- Student registration/login UI and Worker API foundation, password hashing and HTTP-only session-cookie foundation.
- Student dashboard with profile, saved scholarships, application tracker, notes, preferred destinations and deadline watch.
- Admin dashboard and server-side admin API foundations for scholarship management, verification, publication, read-only users and audit logs.
- Official scholarship-source registry and candidate discovery/review workflow. Discovery does not verify or publish scholarships automatically.
- D1 base schema and numbered migrations.
- GitHub Actions for validation, browser tests, CodeQL, Pages preview and development service smoke checks.
- Draft operational, release and source-verification documentation.

## 2. Owner-approved membership policy
- **USD $5 paid once for lifetime membership.**
- **Free for everyone:** browse, search and view scholarship details and official application links.
- **All five premium features for lifetime members:**
  1. Save/bookmark scholarships.
  2. Application tracker.
  3. Deadline watch and reminders.
  4. Private application notes.
  5. Enhanced personalised recommendations.
- One payment grants the five features for life; this is not a recurring subscription and does not expire after three months.
- Payments remain disabled until the owner separately approves payment integration and live activation.

Membership entitlements must be enforced server-side after independently verified payment. No client-side switch, redirect or editable browser value may grant paid access.

## 3. Latest automated checks
On commit `6224cc0`, GitHub Actions completed successfully: application validation (including JavaScript syntax, high-severity dependency audit, Worker API security tests, Playwright browser end-to-end tests and SQLite schema/migration integrity checks), CodeQL security analysis and the GitHub Pages preview build. These checks validate the development code and preview build, not production readiness or live cross-site session behavior.

These are automated CI checks against test fixtures and a local SQLite validation database. They do not substitute for live end-to-end tests against the development Worker/D1, cross-browser cookie/session testing or an independent security review.

## 4. Development tasks still requiring work
- Run the controlled manual browser test plan against the current preview.
- Test registration, login, logout, session expiry and private student endpoints against the live development Worker/D1.
- Test admin review, field-level evidence checks, draft conversion and publication using synthetic records.
- Test source registration, scan, candidate extraction and changed-source review using approved official sources.
- Review and remediate any new CodeQL and Dependabot findings.
- Complete manual keyboard, screen-reader and real-device/mobile review.
- Configure automated development backups and rehearse a restore.
- Complete independent security review of private endpoints, CSRF/origin controls and session cookie behaviour.
- Server-side premium endpoints now require a valid lifetime membership backed by a succeeded, verified USD 5 payment record.
- A membership-status endpoint and free-student dashboard state are implemented.
- Public scholarship browsing remains free; premium endpoints return a clear membership-required response.
- Live payment integration, signed webhooks and membership activation remain unimplemented until separately approved.
- [x] Add automated regression coverage for unpaid and active lifetime-member entitlement states in the Worker and student dashboard.
- [ ] Run live Worker/D1 and cross-browser tests for both unpaid and paid synthetic test accounts.

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

### E. Payment integration and activation (still owner-gated)
- Owner must separately approve payment integration before any provider or checkout is connected.
- Select a provider supporting target countries and payment methods.
- Agree settlement currency, refunds, failed/pending payments, disputes and support.
- Implement signed webhooks, idempotency and audit logging only after approval.
- Test successful, failed, pending, duplicate, refunded and disputed cases in test mode.
- Obtain separate explicit owner approval before live payments are activated.

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
7. Review the implemented membership entitlement rules and publish legally reviewed membership, refund and support terms.
8. Approve payment integration separately when ready; keep live payments off until final approval.
9. Approve production deployment explicitly.
10. Run a final owner acceptance test before inviting real students.

## Final status
The USD $5 lifetime membership policy and all five premium benefits are approved. Scholarship browsing remains free. Server-side premium entitlement checks and free-versus-member dashboard handling have been implemented, but live development end-to-end validation is still pending. The project is not fully launched; technical testing and owner-controlled provider, account, legal and deployment decisions remain. Payments remain disabled by explicit owner instruction.
