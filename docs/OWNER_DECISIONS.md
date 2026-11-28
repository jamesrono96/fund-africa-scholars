# Owner decisions required before final launch work

The platform can continue to be developed in GitHub, but the following decisions or account-owner actions cannot safely be guessed. No payment provider, custom domain, production service or paid subscription has been activated.

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

## 3. Membership and payments

The current business idea is a one-time USD 5 lifetime membership, but the final access policy has not been approved.

- Confirm the price, currency display and whether the USD 5 lifetime price is final.
- Select a provider that supports the target African countries and payment methods, including the intended local mobile-money/card options.
- Decide whether scholarship browsing is public and which features, if any, require membership.
- Approve refund, failed-payment, pending-payment, dispute and customer-support rules.
- Only then implement provider-specific checkout, signed webhook verification and membership activation.

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

Production deployment, live payments, real student data collection and production secrets remain disabled until the owner explicitly approves the relevant decisions and the release gate is satisfied. Never send passwords, API tokens or payment credentials in chat or commit them to GitHub.
