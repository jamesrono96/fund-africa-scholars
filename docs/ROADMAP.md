# Fund Africa Scholars — Build Roadmap

The repository remains the development workspace. The development Worker and D1 database are deployed; production deployment remains disabled pending owner approval.

## Phase 1 — Product foundation

- [x] Create repository and initial landing page
- [x] Define initial data model and API foundation
- [x] Add student account page and frontend sign-in/registration interactions
- [ ] Establish reusable frontend component structure and design system
- [ ] Add accessibility, responsive-layout and form-validation checks

## Phase 2 — Scholarship directory

- [x] Public scholarship directory page
- [x] Search by keyword, destination country and study level
- [x] Scholarship cards showing provider, funding, eligibility, deadline and official source
- [x] Individual scholarship detail page and verified detail API
- [x] Filters for funding type, eligibility keyword and deadline window
- [x] Loading, empty and error states
- [x] Offset pagination for the public scholarship directory
- [x] Official source link, source checked date and verification status
- [x] Admin review and publication status fields/API foundations
- [x] Scholarship source URL and source checked date fields

**Acceptance:** a visitor can find a published scholarship, understand its eligibility and deadline, and open the official provider source.

## Phase 3 — Student accounts

- [x] Registration and login API foundation
- [x] Password hashing and HTTP-only session cookie foundation
- [x] Logout and current-session endpoint
- [x] Basic login/registration rate-limit foundation
- [x] Apply base schema and numbered migrations to development D1; GitHub Actions verified expected tables
- [ ] Select and configure an email delivery provider; implement email verification and password reset
- [ ] Validate cross-site cookie behavior and complete CSRF/production security review
- [x] Student profile and study-destination preferences API and dashboard interface
- [x] Private recommendations for verified scholarships matching preferred destinations
- [x] Saved-scholarships API with per-user ownership checks
- [x] Application-tracker API with per-user ownership checks
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
- [x] Configure development database; [ ] securely promote the owner's admin account
- [x] Read-only admin user directory with membership status and bounded pagination
- [x] Read-only admin audit-log viewer API with actor context and bounded pagination
- [x] Strict pagination validation and student-role denial regression tests for admin read APIs
- [x] Document admin API access controls, fields and deliberate limitations
- [ ] User and membership management actions (remain disabled until payment and support policies are finalized)
- [ ] Audit log UI and review of sensitive actions
- [ ] Role-based access control
- [ ] Safe handling of reported or expired opportunities

**Acceptance:** a student cannot invoke admin actions by changing a URL or request payload.

## Phase 6 — Scholarship discovery and monitoring

- [x] Official source registry API foundation (manual source registration; bounded same-domain link scanning)
- [x] Candidate review queue API foundation with duplicate URL/fingerprint checks
- [x] Admin-only candidate review statuses and audit events
- [ ] Curated list of official provider sources
- [x] Admin-triggered official-source link scan foundation (same-domain links only; no AI extraction)
- [x] Discovery run history and scan result audit trail
- [x] Daily scheduled checks for active registered sources (maximum five per run; human review only)
- [ ] Duplicate detection
- [x] Convert accepted candidates into unpublished scholarship drafts with explicit unverified eligibility placeholder
- [x] Rule-based official-page extraction suggestions for eligibility, funding, study levels and deadline clues (manual review required)
- [x] Evidence-backed structured extraction suggestions with excerpts and conservative review-confidence labels (rule-based)
- [x] Optional Workers AI extraction route and admin action with exact-quote evidence checks (configuration and testing pending)
- [ ] Configure and test Workers AI binding/model in a private development environment
- [ ] AI-assisted structured extraction with source citations and calibrated confidence scoring
- [x] Track candidate-page snapshots, last checked date and source changes (manual checks)
- [x] Move changed candidates to human review and expose snapshot history
- [x] Human approve/reject/needs-follow-up decisions for individual extracted fields, validated against saved extraction evidence and recorded with source URL, reviewer and timestamp
- [x] Seven-item scholarship-level evidence checklist in admin dashboard
- [x] Server-side verification/publication gate requiring all checklist items confirmed or not applicable
- [x] Return scholarship to needs-review/draft if a checklist item needs follow-up
- [ ] Human approval for uncertain or changed records (operational review and testing still required)
- [x] Student dashboard deadline watch for saved/tracked scholarships (past deadlines and deadlines within 30 days; in-dashboard only)\n- [ ] Email or push notifications for saved opportunities and approaching deadlines

**Acceptance:** automated discovery never silently publishes an uncertain scholarship as verified.

## Phase 7 — Quality and release readiness

- [x] GitHub Actions JavaScript syntax checks
- [x] Automated SQLite schema/migration application and integrity check
- [x] Worker API security smoke tests and SQLite migration validation in GitHub Actions
- [x] Enforce streaming JSON request-size limits across authentication, student, scholarship-admin and discovery APIs, including requests without Content-Length
- [x] Add baseline API response headers for MIME sniffing, clickjacking protection, HTTPS transport and disabled unused device permissions
- [x] Add regression tests for baseline security headers on core and delegated student API responses
- [x] Add daily cleanup of expired authentication sessions with regression coverage
- [x] Add regression test for oversized authentication request bodies
- [x] Add regression tests confirming logout rejects untrusted origins and revokes the current session for the configured origin
- [x] Document a controlled browser test plan, safe test-data rules and release blockers
- [x] Add Playwright browser tests for account tab switching, mocked sign-in, API failure feedback and directory filter submission
- [x] Add Playwright mobile-width overflow checks for all primary pages and accessibility assertions for account and directory forms
- [ ] Browser end-to-end tests against the live development Worker/D1
- [x] Publish a manual browser smoke-test guide for public, student and admin flows
- [x] Add scheduled GitHub Actions smoke checks for the public website, API health, CORS and public scholarship endpoint
- [ ] Validate cross-site session cookies in supported browsers (GitHub Pages and workers.dev are different sites)
- [ ] Security review and dependency review
- [ ] Accessibility and mobile checks
- [ ] Backup and recovery plan
- [ ] Privacy policy, terms and membership/refund terms
- [ ] Production configuration review
- [ ] Owner approval before deployment

## Decisions still required

- Payment provider (must support the target countries and the chosen payment methods)
- Email delivery provider
- Custom domain decision (needed to place website and API on the same site for reliable browser session cookies)
- Final membership access rules and refund policy
- Whether scholarship browsing is public or some features require membership
- Domain and production hosting configuration

No production credentials should be added to GitHub. Use encrypted environment secrets when deployment is eventually approved.
