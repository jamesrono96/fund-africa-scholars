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
- `assets/js/directory.js` — public scholarship search and rendering
- `assets/js/scholarship.js` — scholarship details and student save/track actions
- `assets/js/account.js` — account page interactions and API client
- `dashboard.html` — student saved-scholarships and application-tracking workspace
- `assets/js/dashboard.js` — student dashboard interface and API client
- `assets/js/admin.js` — admin dashboard interactions
- `worker/admin.js` — admin-only scholarship management API handlers
- `worker/student.js` — authenticated saved-scholarship and application-tracking API handlers
- `db/schema.sql` — initial relational database schema
- `worker/index.js` — API foundation with scholarship listing, detail and student authentication endpoints
- `db/migrations/0002_auth_rate_limits.sql` — rate-limit table migration
- `db/migrations/0003_admin_setup_template.sql` — owner-only admin role setup template
- `db/migrations/0004_scholarship_discovery.sql` — discovery sources, runs and candidate queue
- `db/migrations/0005_candidate_source_snapshots.sql` — official-page snapshot and change history
- `docs/ADMIN_SETUP.md` — secure admin setup instructions
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
