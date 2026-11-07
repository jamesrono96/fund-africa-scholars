# Fund Africa Scholars — Build Roadmap

The repository is the development workspace. Deployment is deliberately postponed until the owner approves it.

## Phase 1 — Product foundation

- [x] Create repository and initial landing page
- [x] Define initial data model and API foundation
- [x] Add student account page and frontend sign-in/registration interactions (API connection pending)
- [ ] Establish reusable frontend component structure and design system
- [ ] Add accessibility, responsive-layout and form-validation checks

## Phase 2 — Scholarship directory

- [x] Public scholarship directory page
- [x] Search by keyword, destination country and study level
- [x] Scholarship cards showing provider, funding, eligibility, deadline and official source
- [x] Individual scholarship detail page and verified detail API
- [x] Filters for funding type, eligibility keyword and deadline window
- [x] Loading, empty and error states
- [ ] Pagination
- [x] Official source link, source checked date and verification status
- [x] Admin review and publication status fields/API foundations
- [x] Scholarship source URL and source checked date fields

**Acceptance:** a visitor can find a published scholarship, understand its eligibility and deadline, and open the official provider source.

## Phase 3 — Student accounts

- [x] Registration and login API foundation
- [x] Password hashing and HTTP-only session cookie foundation
- [x] Logout and current-session endpoint
- [x] Basic login/registration rate-limit foundation
- [ ] Apply migration and configure a development database
- [ ] Email verification and password reset
- [ ] Add CSRF protections and production security review
- [ ] Student profile and preferences
- [x] Saved-scholarships API with per-user ownership checks (backend configuration pending)
- [x] Application-tracker API with per-user ownership checks (backend configuration pending)
- [x] Student dashboard interface for saved opportunities, status updates and private notes
- [ ] Server-side authorization and security review for all private endpoints

**Acceptance:** students can access only their own profile, saved records and application data.

## Phase 4 — Membership and payments

- [ ] Confirm payment provider and supported countries/currencies
- [ ] Create payment initiation flow on the server
- [ ] Verify payment using provider-signed webhook or server-to-server verification
- [ ] Make webhook handling idempotent
- [ ] Grant lifetime membership only after confirmed successful payment
- [ ] Store transaction references, status and audit events
- [ ] Provide payment support and refund-policy information

**Acceptance:** no client-side redirect or screenshot can independently grant paid access.

## Phase 5 — Administration

- [x] Admin-only dashboard interface
- [x] Admin-only create, edit, archive and review API foundations
- [x] Verification required before publication
- [x] Admin action audit-log foundation
- [ ] Configure database and securely promote the owner's admin account
- [ ] User and membership management
- [ ] Audit log for sensitive actions
- [ ] Role-based access control
- [ ] Safe handling of reported or expired opportunities

**Acceptance:** a student cannot invoke admin actions by changing a URL or request payload.

## Phase 6 — Scholarship discovery and monitoring

- [x] Official source registry API foundation (manual source registration; no automated crawling yet)
- [x] Candidate review queue API foundation with duplicate URL/fingerprint checks
- [x] Admin-only candidate review statuses and audit events
- [ ] Curated list of official provider sources
- [x] Admin-triggered official-source link scan foundation (same-domain links only; no AI extraction)
- [x] Discovery run history and scan result audit trail
- [ ] Scheduled discovery jobs
- [ ] Duplicate detection
- [x] Convert accepted candidates into unpublished scholarship drafts with explicit unverified eligibility placeholder
- [x] Rule-based official-page extraction suggestions for eligibility, funding, study levels and deadline clues (manual review required)
- [ ] AI-assisted structured extraction with source citations and confidence scoring
- [x] Track candidate-page snapshots, last checked date and source changes (manual checks)\n- [x] Move changed candidates to human review and expose snapshot history
- [ ] Human approval for uncertain or changed records
- [ ] Notifications for saved opportunities and approaching deadlines

**Acceptance:** automated discovery never silently publishes an uncertain scholarship as verified.

## Phase 7 — Quality and release readiness

- [ ] Unit and integration tests
- [ ] Security review and dependency review
- [ ] Accessibility and mobile checks
- [ ] Backup and recovery plan
- [ ] Privacy policy, terms and membership/refund terms
- [ ] Production configuration review
- [ ] Owner approval before deployment

## Decisions still required

- Payment provider (must support the target countries and the chosen payment methods)
- Email delivery provider
- Final membership access rules and refund policy
- Whether scholarship browsing is public or some features require membership
- Domain and production hosting configuration

No production credentials should be added to GitHub. Use encrypted environment secrets when deployment is eventually approved.
