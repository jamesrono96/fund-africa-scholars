# Owner decisions required before final launch work

The platform can continue to be developed in GitHub. The owner has approved the membership direction below, but no payment provider, checkout, paid subscription, production service or live payment has been activated.

## 1. Website domain and production hosting
- Choose and purchase the custom domain.
- Confirm whether the website and API should both run under the same registrable domain.
- Approve the production Cloudflare account, Worker, D1 database and Pages/Workers deployment plan.
- Confirm the production environment is separate from development.

## 2. Email delivery
- Select an email provider that can deliver transactional messages to the countries you intend to serve.
- Choose the sender address and verify the sending domain.
- Authorize the required provider account and secret configuration outside GitHub.
- Email verification and password reset must be completed and tested before real student accounts are accepted.

## 3. Approved membership model
**Owner-approved commercial direction:**
- One-time membership fee: **USD $5**.
- Membership duration: **lifetime** (one payment, not a recurring subscription).
- Scholarship discovery: **free public browsing, searching and viewing**.
- Premium features: selected student-support tools may require lifetime membership.
- **Payments remain disabled** until the owner gives separate, explicit approval.

Recommended premium-feature boundary for product planning (not yet enforced as a paywall):
- Free: browse/search the scholarship directory, view scholarship details and official source links.
- Premium: save/bookmark opportunities, maintain an application tracker, use deadline watch/reminders, and keep personal application notes or enhanced personalised recommendations.

Before implementing membership enforcement or checkout, the owner must confirm the final premium feature list and the exact behaviour for existing student accounts. Before accepting money, the owner must also:
- Select a provider that supports intended African countries and payment methods, including intended mobile-money/card options.
- Approve settlement/currency display, refunds, failed/pending payments, disputes and customer-support rules.
- Approve provider-specific checkout, signed webhook verification, idempotency, audit logging and membership activation tests.

No payment provider or checkout should be connected, configured or activated without that separate approval.

## 4. Owner administrator identity
- Confirm the exact email address of the owner account already registered in the private development database.
- Approve the secure one-time promotion of that account to administrator.
- This must be done against the private development database, not by editing frontend code or committing credentials.

## 5. Legal and privacy review
- Confirm the country/jurisdiction of the platform operator and the main countries in which it will actively serve students.
- Obtain qualified review of the privacy notice, terms, data-retention policy, membership terms and refund policy.
- Confirm the contact address for privacy requests and customer support.

## 6. Scholarship source priorities
- Approve the initial source list and priority destinations/provider types.
- Assign the people who will review scholarship candidates and verify evidence.
- Agree the re-check cadence and the process for expired or changed opportunities.

## 7. Optional AI-assisted discovery
- Decide whether to enable Cloudflare Workers AI in the development environment.
- Confirm the model available to the account and approve the use of source-page text for evidence-backed suggestions.
- AI suggestions remain unverified; human approval is mandatory.

## Final approval boundary
Production deployment, live payments, real student data collection and production secrets remain disabled until the owner explicitly approves the relevant decisions and the release gate is satisfied. The approved USD $5 lifetime model is a product decision, not permission to activate payments. Never send passwords, API tokens or payment credentials in chat or commit them to GitHub.
