# Development browser testing guide

This guide is for controlled testing of the GitHub Pages preview and the development Worker only.

## Safety before testing

- The preview is not production and must not be used to collect real student information.
- Use a test-only email address and a unique test password. Never reuse a personal or school password.
- Do not enter real student records, upload identity documents or send payment details.
- Do not add unverified scholarship information to the public directory.
- The public directory should remain empty until genuine opportunities have been checked against official provider sources and passed the evidence checklist.
- The admin account must be promoted by the database owner using the private development D1 console. Never expose an admin-promotion endpoint.

## Browser smoke test

Run these checks in the latest Chrome, Firefox and Edge where available. Repeat key layout checks at a narrow mobile viewport (approximately 390 px wide).

### Public pages

1. Open the [GitHub Pages preview](https://jamesrono96.github.io/fund-africa-scholars/).
2. Confirm the home page loads without a blank screen or horizontal scrolling.
3. Open the scholarship directory. With no verified records, confirm the empty state is clear and does not invent opportunities.
4. Submit a search with a keyword and then clear it. Confirm the page gives a clear loading, result, empty or error state.
5. Open a scholarship detail URL without an identifier and confirm a helpful not-found message appears.
6. Check that navigation links and the official-source link behavior are understandable on mobile.

### Student account (test account only)

1. Open the account page and switch between Sign in and Create account.
2. Submit an invalid email and a password shorter than 12 characters; confirm browser validation prevents submission.
3. Create a test account using a test-only email and unique password.
4. Confirm the account page displays the signed-in test profile.
5. Open the student dashboard and confirm the profile, saved-scholarship and application sections load.
6. Edit the test profile and preferred destinations; save and reload to confirm persistence.
7. Sign out and confirm protected dashboard data is no longer accessible.
8. Try signing in with an incorrect password and confirm the error is clear without exposing account secrets.

### Admin workflow (owner-controlled test account)

1. Promote only the owner's test account using the instructions in [ADMIN_SETUP.md](ADMIN_SETUP.md).
2. Sign in at the admin page and confirm a normal student account is denied.
3. Create an unpublished draft using a clearly labelled test record and a non-public test source only if the admin workflow supports it.
4. Confirm publishing is blocked until all seven evidence checklist items are complete.
5. Confirm a changed official source resets verification/publication as required.
6. Remove the test record and test source after testing; do not publish test data.

## API and security checks

The automated Node test suite covers authentication origin checks, private endpoint authentication, per-user ownership, scholarship publication gates, evidence validation, bounded JSON bodies and logout origin validation.

The scheduled development smoke workflow checks the static homepage, Worker health endpoint, CORS origin and public scholarship API shape. These checks do not prove that browser cookies work across GitHub Pages and workers.dev.

## Known release blockers

- GitHub Pages and workers.dev are different sites. Modern browsers may block the cross-site session cookie even though the cookie is marked Secure and SameSite=None. Test behavior in real browsers; a custom domain with website and API under the same registrable domain is the planned fix before launch.
- Email verification and password recovery are not implemented. Do not describe accounts as email-verified.
- Browser end-to-end tests against the live development Worker/D1 are not yet automated.
- Workers AI extraction is not active until its binding and model are configured and tested.
- No scholarship should be described as available until an administrator verifies it against the official source and publishes it.
- Privacy policy, terms, data-retention rules, backups and incident-response procedures need owner review before collecting real user data.
- Payments and production deployment are deliberately disabled.

## Reporting a test failure

Record the browser and version, page URL, approximate viewport, steps taken, expected result and actual result. Do not include passwords, session cookies, API tokens or personal student information in screenshots or reports.
