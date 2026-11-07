# Fund Africa Scholars

A scholarship discovery and student-support platform focused on helping African students find international study opportunities.

## Development status

**Private development stage — not deployed.** The project is being built and reviewed in GitHub first. No production website, payment processing, or live student accounts are active.

## Planned features

- Scholarship directory with destination, study level, subject, funding and deadline filters
- Scholarship detail pages with official source links and verification dates
- Student registration, login and profile management
- Saved scholarships and application tracking
- Planned one-time lifetime membership
- Admin dashboard for scholarships, users, memberships and moderation
- Scholarship discovery and deadline-monitoring workflows with human review
- Email notifications and referral features

## Repository structure

- `index.html` — responsive landing-page preview
- `account.html` — student sign-in and registration interface
- `admin.html` — administrator scholarship management interface
- `assets/js/account.js` — account page interactions and API client
- `assets/js/admin.js` — admin dashboard interactions
- `worker/admin.js` — admin-only scholarship management API handlers
- `db/schema.sql` — initial relational database schema
- `worker/index.js` — API foundation with scholarship listing and student authentication endpoints
- `db/migrations/0002_auth_rate_limits.sql` — rate-limit table migration
- `db/migrations/0003_admin_setup_template.sql` — owner-only admin role setup template
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
