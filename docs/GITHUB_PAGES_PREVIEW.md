# GitHub Pages preview

This repository can publish a **static preview** of Fund Africa Scholars through GitHub Pages. It is intended for visual review before the production Cloudflare deployment.

## Preview URL

Once the GitHub Pages workflow succeeds, the preview will be available at:

https://jamesrono96.github.io/fund-africa-scholars/

## What is included

The preview workflow stages only the HTML pages and browser-side JavaScript needed to view the interface. It does not publish the Worker source, database schema, migrations, tests, or Wrangler configuration as part of the Pages artifact.

## Important limitations

GitHub Pages is static hosting. It does not run the Cloudflare Worker API or D1 database. Therefore, account registration and sign-in, saved scholarships, recommendations, application tracking, admin operations, discovery scans, and AI extraction will not work in this preview. No payment processing is enabled.

The preview is not the production service and must not be used to collect real student data or passwords. Scholarship listings remain empty until opportunities have been verified and published through the real backend.

## Enable GitHub Pages once

If the workflow reports that Pages is not enabled:

1. Open the repository's **Settings**.
2. Select **Pages** under **Code and automation**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Return to the **Actions** tab and rerun **GitHub Pages preview**.

After setup, every push to `main` updates the preview automatically. The workflow can also be started manually from the Actions tab.

## Production remains separate

This preview does not configure or deploy anything to Cloudflare. The Cloudflare Worker, D1 database, secrets, custom domain and production configuration remain separate and are not touched by this workflow.


## Development D1 database setup (manual, one-time)

The repository contains a manual GitHub Actions workflow named **Apply development D1 schema**. It applies the base schema and numbered migrations to the development database configured in `wrangler.toml`. It does not deploy a Worker or publish the production site.

Before running it:

1. In Cloudflare, create a custom API token with **Account → D1 → Edit** permission, scoped to the account that owns this database. This workflow only executes D1 SQL; it does not deploy Workers, so it does not need Workers Scripts permissions. Do not use a Global API Key.
2. In the GitHub repository, open **Settings → Secrets and variables → Actions**.
3. Add repository secrets named `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
4. Open **Actions → Apply development D1 schema → Run workflow**.
5. Type `fund-africa-scholars-db` into the confirmation input and run it.

This is a one-time initialization workflow, not a repeatable migration runner. Do not rerun it after it has succeeded: numbered migrations may not be safe to apply twice. If it fails partway through, inspect the D1 tables and the workflow logs before deciding how to resume. The admin setup template migration is intentionally skipped.

Never put API tokens in source files, commits, chat messages or workflow inputs. Do not run this against a production database.
