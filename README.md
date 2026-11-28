# Fund Africa Scholars

A scholarship discovery and student-support platform focused on helping African students find international study opportunities.

## Development status

**The GitHub Pages preview, development Cloudflare Worker and development D1 schema/migrations have been deployed successfully.** The account, directory, student dashboard and admin interfaces are wired to the development API. Playwright browser tests now cover account sign-in UI, API failure feedback and directory filtering with mocked API responses; live cross-site session-cookie validation and owner admin setup remain outstanding. Payment processing and production deployment are disabled. See [GitHub Pages preview instructions](docs/GITHUB_PAGES_PREVIEW.md).

## Planned features

- Scholarship directory with destination, study level, subject, funding, eligibility and deadline filters
- Scholarship detail pages with official source links and verification dates
- Student registration, login and profile management
- Saved scholarships and application tracking
- Planned one-time lifetime membership
- Admin dashboard for scholarships, users, memberships and moderation
- Scholarship discovery and deadline-monitoring workflows with human review
- Email notifications and referral features

## Repository structure

- `index.html` — responsive landing-page preview
- `directory.html` — public scholarship directory and search interface
- `scholarship.html` — individual verified scholarship details
- `account.html` — student sign-in and registration interface
- `admin.html` — administrator scholarship, read-only user directory and audit-log interface
- `assets/js/directory.js` — public scholarship search, rendering and signed-in destination recommendations
- `assets/js/scholarship.js` — scholarship details and student save/track actions
- `assets/js/account.js` — account page interactions and API client
- `dashboard.html` — student profile, saved-scholarships and application-tracking workspace
- `assets/js/dashboard.js` — student profile/preferences, dashboard interface and API client
- `assets/js/admin.js` — admin dashboard interactions
- `worker/admin.js` — admin-only scholarship management API handlers
- `worker/student.js` — authenticated profile, destination recommendations, saved-scholarship and application-tracking API handlers
- `db/schema.sql` — initial relational database schema
- `worker/index.js` — API foundation with scholarship listing, detail and student authentication endpoints
- `db/migrations/0002_auth_rate_limits.sql` — rate-limit table migration
- `db/migrations/0003_admin_setup_template.sql` — owner-only admin role setup template
- `db/migrations/0004_scholarship_discovery.sql` — discovery sources, runs and candidate queue
- `db/migrations/0005_candidate_source_snapshots.sql` — official-page snapshot and change history
- `db/migrations/0006_candidate_field_reviews.sql` — append-only administrator decisions on individual extracted fields
- `db/migrations/0007_scholarship_verification_checklist.sql` — evidence-backed scholarship-level verification checklist
- `db/migrations/0008_field_review_follow_up.sql` — preserves field-review history and adds needs-follow-up decisions
- `docs/ADMIN_SETUP.md` — secure admin setup instructions
- `.github/workflows/validate.yml` — GitHub Actions JavaScript syntax, Worker API tests, browser tests and SQLite migration checks
- `.github/workflows/codeql.yml` — scheduled CodeQL security analysis
- `.github/dependabot.yml` — weekly dependency and GitHub Actions update checks
- `wrangler.toml` — development Worker and D1 binding configuration
- `docs/ROADMAP.md` — build sequence and completion criteria

## Important

- Do not commit secrets, API tokens, passwords, private keys, or live payment credentials.
- Payment access must be granted only after server-side verification from the payment provider.
- Scholarship records must include an official source URL and a checked date. Unverified records must not be presented as verified.
- Admin actions and payment state changes must be validated on the server.
- Do not deploy a production version or connect production data until the owner explicitly approves it.

## Local development

The GitHub Pages preview uses the Cloudflare development Worker at `https://fund-africa-scholars-api.jamesrono96.workers.dev` and the configured D1 database. The base schema and numbered migrations were successfully applied in the development database, and the development Worker deployment workflow has succeeded. Browser-level end-to-end testing and cross-site session-cookie validation remain outstanding. Payment processing and production deployment are not enabled.

Run browser tests with `npm run test:e2e`. See [the roadmap](docs/ROADMAP.md) for the planned implementation sequence and [the controlled browser testing guide](docs/DEVELOPMENT_TESTING.md) for live development test procedures and release blockers. See [the release gate](docs/RELEASE_GATE.md) for the remaining owner decisions and launch requirements. The draft [operations runbook](docs/OPERATIONS_RUNBOOK.md) describes the backup, recovery and incident-response work that must be configured before production.


## Scholarship discovery foundation

The admin API includes a manual official-source registry and a candidate review queue. The development D1 schema and numbered migrations through `0008_field_review_follow_up.sql` have been applied successfully. Do not rerun the one-time schema workflow against this database. Discovery candidates are never published automatically; an administrator must verify and separately create/publish a scholarship. Daily scheduled checks are configured for active registered sources. They queue candidates for human review only and never verify or publish records automatically. AI extraction remains optional and requires a configured Workers AI binding. Email and push notifications are not implemented; the student dashboard currently provides an in-dashboard deadline watch for saved and tracked scholarships.


### Manual source checks

An administrator can trigger a check for a registered source. The Worker fetches the registered HTTPS page without following redirects, limits the HTML response size, and only queues matching scholarship-related links on that same official domain. These are link-title candidates, not verified scholarship facts. Every candidate stays private for human review; no scan publishes records. Daily scheduled checks are configured for active registered sources. They queue candidates for human review only; they do not verify or publish records. AI extraction remains optional and requires a configured Workers AI binding.


Accepted discovery candidates can be converted by an administrator into unpublished scholarship drafts. Drafts start with pending verification and a prominent eligibility placeholder; conversion does not verify or publish them.


### Candidate source change tracking

Each manual candidate-page extraction stores a SHA-256 content fingerprint, page title, description and a bounded text excerpt. A later extraction compares the page with its previous snapshot. If the content differs, the candidate is moved to `needs_review` (unless already rejected or marked duplicate), an audit event is recorded, and administrators can inspect the snapshot history. A detected change is only a review signal; it does not establish what changed or whether scholarship details are different.

### Candidate detail extraction

Administrators can request a bounded HTML inspection of a candidate page on its registered official domain. The current rule-based helper captures page title/description and possible funding, study-level, eligibility and deadline clues into the private candidate record. It does not infer a confirmed deadline from ambiguous text, does not call an AI model, and does not publish anything. Administrators must compare every suggestion with the official page before editing or verifying a scholarship.


### Evidence-backed extraction suggestions

Manual extraction now stores structured funding, study-level, eligibility and deadline clues with short evidence excerpts from the fetched official page. Each clue has a conservative review-confidence label and an explanation of why it received that label. Date-shaped strings are deliberately not treated as confirmed deadlines, and the helper does not assign automatic high confidence. This is deterministic rule-based extraction, not an AI model; every suggestion requires human verification. An AI provider/model integration remains a separate future task and must preserve source evidence and human approval.


### Optional AI-assisted candidate review

The admin API includes an optional Workers AI review route at `POST /api/admin/discovery/candidates/:id/ai-extract`. It is inactive unless a Workers AI binding named `AI` is configured in a development environment. The model can be selected with the non-secret `AI_MODEL` environment variable; the code has a default model identifier that must be confirmed against the account's enabled Workers AI models. The route fetches only the candidate's registered official HTTPS page, treats page text as untrusted input, asks for JSON suggestions with exact quotations, and discards suggestions whose evidence is not found verbatim in the fetched text. Rule-based extraction results are preserved alongside AI results. This is an optional integration foundation, not a live AI feature: no binding is enabled here, no credentials are stored in GitHub, and the route has not been tested against a configured AI account. AI output remains unverified and cannot publish scholarships.


### Field-level evidence review

The candidate queue now supports individual approve/reject decisions for rule-based and AI-assisted funding, study-level, eligibility and deadline suggestions. Each decision records the reviewer, timestamp, exact evidence excerpt and candidate official URL in an append-only review table. These decisions are an audit trail only: they do not copy values into scholarship records, mark a scholarship verified, or publish it. Migration `0006_candidate_field_reviews.sql` is included in the applied development migration set.

### Scholarship-level verification gate

The admin scholarship records now include a seven-item checklist covering official source identity, current intake, eligible nationalities, study level, funding terms, application deadline and application route. Every item requires an HTTPS evidence URL on the scholarship's official hostname and an evidence excerpt. The API blocks marking a scholarship verified or publishing it until all seven items are confirmed or explicitly marked not applicable. A checklist item marked needs follow-up automatically returns the scholarship to needs-review and draft status. Migration `0007_scholarship_verification_checklist.sql` is included in the applied development migration set.

### Automated repository checks

GitHub Actions now runs JavaScript syntax checks for Worker and browser scripts, then applies the initial SQLite schema and migrations 0002 and 0004–0007 to an in-memory database and checks referential integrity. The latest development D1 workflow also confirmed the configured database target, applied the base schema and numbered migrations, and verified expected tables. Browser-level end-to-end tests are still required.

### Student profile foundation

The student dashboard includes a profile section for editing a student's display name and country of residence, plus up to ten preferred study destinations. The email address is read-only. The authenticated API validates profile fields, restricts destination choices to supported countries, checks the application origin for updates, and returns only the signed-in student's profile. The development Worker and D1 database are configured. Browser-level testing is still required.


### Destination-based recommendations

Signed-in students can see a small set of published, verified scholarships whose destination country matches one of their saved study preferences. The recommendation endpoint is private, uses only the student's own preferences, and never includes draft or unverified records. The directory labels these as destination matches only; it does not claim that the student meets each scholarship's eligibility criteria. The recommendation endpoint is deployed with the development API; it still needs browser-level testing and verified scholarship records.


Administrator API operations and access-control notes: [docs/ADMIN_OPERATIONS.md](docs/ADMIN_OPERATIONS.md).
