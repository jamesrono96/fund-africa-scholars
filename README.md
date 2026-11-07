# Fund Africa Scholars

A scholarship discovery and student-support platform focused on helping African students find international study opportunities.

## Development status

**Private development stage — not deployed.** The project is being built and reviewed in GitHub first. No production website, payment processing, or live student accounts are active.

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
- `admin.html` — administrator scholarship management interface
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
- `docs/ADMIN_SETUP.md` — secure admin setup instructions
- `.github/workflows/validate.yml` — GitHub Actions JavaScript syntax and SQLite migration checks
- `wrangler.toml` — local/deployment configuration template (not deployed)
- `docs/ROADMAP.md` — build sequence and completion criteria

## Important

- Do not commit secrets, API tokens, passwords, private keys, or live payment credentials.
- Payment access must be granted only after server-side verification from the payment provider.
- Scholarship records must include an official source URL and a checked date. Unverified records must not be presented as verified.
- Admin actions and payment state changes must be validated on the server.
- Do not deploy this repository until the owner explicitly approves it.

## Local development

The initial landing page can be previewed by opening `index.html` in a browser. The account interface and API endpoints are implemented as development foundations. The database migration still needs to be applied, and the API must be configured and tested in a development environment before accounts can work. The API and database are not live.

See [the roadmap](docs/ROADMAP.md) for the planned implementation sequence.


## Scholarship discovery foundation

The admin API includes a manual official-source registry and a candidate review queue. Apply `db/migrations/0004_scholarship_discovery.sql` and `db/migrations/0005_candidate_source_snapshots.sql` after the earlier migrations before using these endpoints. Discovery candidates are never published automatically; an administrator must verify and separately create/publish a scholarship. Automated crawling, AI extraction, scheduled checks and notifications are not implemented yet.


### Manual source checks

An administrator can trigger a check for a registered source. The Worker fetches the registered HTTPS page without following redirects, limits the HTML response size, and only queues matching scholarship-related links on that same official domain. These are link-title candidates, not verified scholarship facts. Every candidate stays private for human review; no scan publishes records. Scheduled scans and AI extraction are not implemented.


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

The candidate queue now supports individual approve/reject decisions for rule-based and AI-assisted funding, study-level, eligibility and deadline suggestions. Each decision records the reviewer, timestamp, exact evidence excerpt and candidate official URL in an append-only review table. These decisions are an audit trail only: they do not copy values into scholarship records, mark a scholarship verified, or publish it. Apply migration `0006_candidate_field_reviews.sql` in the development database before using this feature.

### Scholarship-level verification gate

The admin scholarship records now include a seven-item checklist covering official source identity, current intake, eligible nationalities, study level, funding terms, application deadline and application route. Every item requires an HTTPS evidence URL on the scholarship's official hostname and an evidence excerpt. The API blocks marking a scholarship verified or publishing it until all seven items are confirmed or explicitly marked not applicable. A checklist item marked needs follow-up automatically returns the scholarship to needs-review and draft status. Apply migration `0007_scholarship_verification_checklist.sql` after migration 0006.

### Automated repository checks

GitHub Actions now runs JavaScript syntax checks for Worker and browser scripts, then applies the initial SQLite schema and migrations 0002 and 0004–0007 to an in-memory database and checks referential integrity. This validates syntax and migration compatibility; it is not an end-to-end test of the Worker against a configured Cloudflare D1 instance.

### Student profile foundation

The student dashboard includes a profile section for editing a student's display name and country of residence, plus up to ten preferred study destinations. The email address is read-only. The authenticated API validates profile fields, restricts destination choices to supported countries, checks the application origin for updates, and returns only the signed-in student's profile. This is implemented code only; it is not live until the Worker and D1 database are configured and tested in a development environment.


### Destination-based recommendations

Signed-in students can see a small set of published, verified scholarships whose destination country matches one of their saved study preferences. The recommendation endpoint is private, uses only the student's own preferences, and never includes draft or unverified records. The directory labels these as destination matches only; it does not claim that the student meets each scholarship's eligibility criteria. Recommendations require a configured API and database and are not live in this GitHub-only development stage.
