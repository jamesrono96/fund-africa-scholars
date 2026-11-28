# Administration API operations

These endpoints are development foundations for the private administrator workflow. They are not a substitute for an administrator-facing user-management interface or an operational support policy.

## Access control

- Every `/api/admin/*` request is routed through the admin handler.
- The handler requires a valid, unexpired `fas_session` whose user record has `role = 'admin'`.
- Mutating requests must also carry the exact configured `APP_ORIGIN`.
- A student session receives HTTP 403. An absent, invalid or expired session cannot read administrative data.
- Do not promote an account by editing a request, browser storage or frontend code. Owner promotion must be performed securely against the private development database after confirming the owner's account identity.

## Read-only endpoints

### `GET /api/admin/users?limit=25&offset=0`

Returns a paginated user directory with account identity, country, role, email-verification timestamp, creation timestamp and any membership status/type/start date. The response intentionally excludes password hashes, session tokens and payment provider payloads.

- `limit`: integer from 1 to 100; defaults to 25.
- `offset`: integer from 0 to 100000; defaults to 0.
- The API fetches one extra row to indicate `has_more`.

### `GET /api/admin/audit-logs?limit=50&offset=0`

Returns a paginated audit history with action, target, recorded details, timestamp and actor identity where the actor account still exists.

- `limit`: integer from 1 to 100; defaults to 50.
- `offset`: integer from 0 to 100000; defaults to 0.
- Treat audit details as confidential operational data.

## Admin dashboard views

The admin dashboard includes read-only, paginated tables for student accounts and audit events. The user table shows account identity, country, role, email-verification state, membership status and registration date. The audit table shows timestamp, actor, action, target and recorded details. Both views call the protected read-only endpoints above; neither offers account or membership mutations.

## Deliberate limitations

- These APIs are read-only. They do not edit users, promote administrators, change membership status, refund payments or delete accounts.
- Membership actions must wait for confirmed payment-provider verification, entitlement rules, support procedures and refund/dispute policy.
- No real student personal data should be entered into the GitHub Pages preview or development Worker.
- The endpoints and regression tests still require execution in CI and browser/API acceptance testing before launch.
