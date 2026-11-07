# Initial administrator setup (development only)

The admin dashboard uses the normal sign-in endpoint and then checks the account's server-side `role`. Public registration always creates a `student` account; it cannot select or request the admin role.

When a development database has been configured:

1. Register your own account through the student account flow.
2. In the private development database console, inspect the account:
   `SELECT id, email, role FROM users WHERE email = 'YOUR_LOGIN_EMAIL';`
3. Promote only your own account using a direct, owner-controlled SQL statement:
   `UPDATE users SET role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE email = 'YOUR_LOGIN_EMAIL';`
4. Confirm the result:
   `SELECT id, email, role FROM users WHERE role = 'admin';`
5. Sign out and sign in again, then open `admin.html`.

Do not create a public API endpoint for role promotion. Do not add real passwords, tokens, personal credentials or actual account email addresses to this repository.

## Scholarship publishing rules

- A new scholarship defaults to `pending` verification and `draft` publication.
- The admin must check the official provider page and source details.
- The API refuses to publish a record unless its verification status is `verified`.
- Archive is a soft action; it changes publication status to `archived` rather than deleting the record.
- Sensitive admin actions are written to `audit_logs`.

This is an implementation foundation. Before real use, the database migrations, origin configuration, CSRF strategy, email verification and full security review must be completed.
