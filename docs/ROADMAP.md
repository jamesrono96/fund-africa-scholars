# Fund Africa Scholars — Build Roadmap

The repository is the development workspace. Deployment is deliberately postponed until the owner approves it.

## Phase 1 — Product foundation

- [x] Create repository and initial landing page
- [x] Define initial data model and API foundation
- [x] Add student account page and frontend sign-in/registration interactions (API connection pending)
- [ ] Establish reusable frontend component structure and design system
- [ ] Add accessibility, responsive-layout and form-validation checks

## Phase 2 — Scholarship directory

- [ ] Scholarship list and detail views
- [ ] Search by keyword, destination, study level and subject
- [ ] Filters for funding type, eligibility and deadline
- [ ] Pagination and empty/loading/error states
- [ ] Official source link, source checked date and verification status
- [ ] Admin review before a scholarship becomes public

**Acceptance:** a visitor can find a published scholarship, understand its eligibility and deadline, and open the official provider source.

## Phase 3 — Student accounts

- [x] Registration and login API foundation
- [x] Password hashing and HTTP-only session cookie foundation
- [x] Logout and current-session endpoint
- [x] Basic login/registration rate-limit foundation
- [ ] Apply migration and configure a development database
- [ ] Email verification and password reset
- [ ] Add CSRF protections and production security review
- [ ] Email verification and password reset
- [ ] Student profile and preferences
- [ ] Saved scholarships and application tracker
- [ ] Server-side authorization on every private endpoint

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

- [ ] Admin-only dashboard
- [ ] Create, edit, archive and review scholarship records
- [ ] User and membership management
- [ ] Audit log for sensitive actions
- [ ] Role-based access control
- [ ] Safe handling of reported or expired opportunities

**Acceptance:** a student cannot invoke admin actions by changing a URL or request payload.

## Phase 6 — Scholarship discovery and monitoring

- [ ] Curated list of official provider sources
- [ ] Scheduled discovery jobs
- [ ] Duplicate detection
- [ ] Extract eligibility, funding and deadline fields
- [ ] Track last checked date and source changes
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
