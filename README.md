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

- `index.html` — current responsive landing-page preview
- `db/schema.sql` — initial relational database schema
- `worker/index.js` — API foundation for a future Cloudflare Worker
- `wrangler.toml` — local/deployment configuration template (not deployed)
- `docs/ROADMAP.md` — build sequence and completion criteria

## Important

- Do not commit secrets, API tokens, passwords, private keys, or live payment credentials.
- Payment access must be granted only after server-side verification from the payment provider.
- Scholarship records must include an official source URL and a checked date. Unverified records must not be presented as verified.
- Admin actions and payment state changes must be validated on the server.
- Do not deploy this repository until the owner explicitly approves it.

## Local development

The initial landing page can be previewed by opening `index.html` in a browser. The API and database are scaffolding only until their environment and authentication are configured.

See [the roadmap](docs/ROADMAP.md) for the planned implementation sequence.
