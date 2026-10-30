# Deployment

## Current Production Integration

- Apps Script URL: `https://script.google.com/macros/s/AKfycbz4IMhPb_XqCFPBorxEBTgKsREaFOQaEmoKgBgedtIsfUHiXe4BbU91Yl6dy1P5oSMr/exec`
- Spreadsheet ID: `19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI`
- Frontend local URL: `http://localhost:5173`
- Backend local URL: `http://localhost:8080/api`

## Current Email Login and Summary Upgrade (V28)

1. Replace the complete Apps Script Code.gs with google-apps-script/Code.gs.
2. Save, then Manage deployments > Edit the existing Web App > New version > Deploy.
3. Retain the current URL. Verify `?action=deploymentTest` returns
   `KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_30_EMAIL_LOGIN_DASHBOARD_FORMULAS_V28`.
4. Publish the frontend through the existing GitHub/Vercel project. PWA cache
   version v24 loads the updated shared admin financial cards.
5. Check Present Investment and Monthly Payout on both admin Dashboard and Reports
   against complete DASHBOARD client rows. Missing cells must not become zero.
6. Using a legitimate activated account, verify that Client ID and its unique
   CLIENTS email authenticate the same account with the same password and role.
7. Verify any authorized new registration retains its Client ID under the existing
   CLIENTS header and receives formula-backed DASHBOARD financial cells. Do not
   create fake clients in production for a smoke test.

Email matching requires a populated unique CLIENTS email and Client ID link. Do
not change roles, passwords or activation status to work around a data problem.
V28 does not silently migrate existing financial/profile records. Any historical
blank-cell repair requires an owner-approved exact range.

## Payout Calendar Upgrade (V27)

V27 includes the previous V26/V25 fixes and separates current-month ledger balances
from next-month payout estimates. It adds no sheet, database or API route.

1. Replace the complete Apps Script Code.gs with google-apps-script/Code.gs.
2. Save, then Manage deployments > Edit the existing Web App > New version > Deploy.
3. Retain the deployment URL. Verify `?action=deploymentTest` returns
   `KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_29_PENDING_PAYOUT_CLIENTS_V27`.
4. Publish the frontend through the existing GitHub/Vercel workflow.
5. Sign in as admin. Dashboard should separate Pending This Month and Upcoming
   Payouts. Reports offers View pending clients and View upcoming clients.
6. Verify that a newly funded deposit first enters the following month's schedule,
   and that client dates, filtered exports and per-client totals reconcile.

No spreadsheet amounts/formulas or authentication settings are changed. The
figures are based on recorded ledger entries, not independent bank settlement.
Without confirmed monthly rates or recurring payout dates, the new calendar shows
unavailable rather than inventing balances. GitHub publishing does not deploy GS.

## Verified Ledger Charts Upgrade (V26)

The dashboard and analytics now use one shared `/api/dashboard` snapshot instead
of eight overlapping module requests. This upgrade requires both the web release
and the updated `google-apps-script/Code.gs` deployment:

1. Replace the entire Apps Script editor's `Code.gs` with the repository file.
2. Save, then open Deploy > Manage deployments > Edit (pencil).
3. Select Version > New version, then Deploy. Keep Execute as: Me and the existing access configuration.
4. Keep the existing deployment URL to avoid changing Vercel environment variables.
5. Open the existing `/exec?action=deploymentTest` URL. The marker must be
   `KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_28_APPROVED_LEDGER_CHARTS_V26`.
6. After the GitHub-triggered Vercel deployment succeeds, reload the portal and sign in as admin.

The admin dashboard should make a single `/api/dashboard` request for its records,
with full collections in `data.adminData`. Client responses never include this field.
The spreadsheet is opened once and each required tab is read once per dashboard
request. Read caches are discarded even on failure; there is no cross-request
business-data cache. Until Apps Script is upgraded, the web release uses a bounded
two-request compatibility path after retrieving the legacy summary.

V21 adds read-only historical withdrawals to admin lists and linked client details,
and the per-client monthly payout remainder. V20 added dated investment totals and the
24-month Current Portfolio history. The Dashboard no longer displays Portfolio
Distribution or Client Registration Trend. See
`docs/ADMIN_FINANCIAL_ANALYTICS.md` for metric definitions and source requirements.
V22 reads DASHBOARD Present Investment and Monthly Payout for the same web/PWA
dashboards. Present Investment supplies available/net investment, and Monthly
Payout supplies the per-client monthly schedule used for the unpaid remainder.
V23 adds the 12-month client portfolio series, scoped client withdrawal history,
per-client withdrawal-chart fallbacks, and the admin client financial summary.
The investment year selector is part of the web release; financial history and
client-summary payloads require Apps Script V23.
V24 fixes withdrawal precedence per client/month and signed payout history, and
adds separate monthly credit/debit transaction-flow totals. The matching web
release adds visible payout bars, credit/debit bars and report year filters.
Deploy both parts. An older script shows an explicit net-only flow notice instead
of inventing a credit/debit breakdown. Service-worker version v19 replaces old
static assets without clearing authentication or storing business records.
V25 reads CLIENTS Date of payout into profiles and transaction rows. The web
release adds a separate Scheduled Payout Date column, including client print and
CSV. Full dates and recurring days are supported; actual transaction dates are
not changed. Service-worker v20 updates the static shell. No new sheet, formula,
financial record, backend route, or authentication flow is required.
V26 corrects a verified live mapping mismatch: Approved is a posted transaction
status in this workbook, as shown by its DASHBOARD SUMIFS formulas. Approved
read-only Withdrawal_Master history is accepted too, while approved-but-unpaid
portal requests remain excluded. No spreadsheet-status edits are required or
performed. Redeploy Code.gs even if V24/V25 was deployed previously; GitHub/Vercel
does not publish Google Apps Script versions. A read-only audit independently
reconciled the corrected chart series against the real register and closing
portfolio against DASHBOARD before release.
The web release shows an explicit analytics
availability notice rather than empty or invented financial charts.

After deployment, sign in as admin and expand Chart data sources. Transactions
should resolve to Transaction_Register when present, and investments to
Investment_Master, regardless of workbook tab order. Use Refresh data to refetch
the snapshot without a full page reload. Verify known monthly totals against the
selected source; health checks do not validate private financial amounts.
Sign in as two different clients and confirm that each sees only their own
withdrawal history, no cancel action for historical records, and 12 months of
portfolio history. Test a client with only a current snapshot: earlier months
must remain empty. Open admin Clients > View and reconcile the four totals with
that client's DASHBOARD row. Change investment year and withdrawal year/month;
confirm displayed and exported totals use the selected period.
Open Reports: select a year containing one payout month and confirm a visible bar.
Compare signed payout totals with completed payments and reversals, excluding
future/pending rows. A month with equal credit and debit must still show two
transaction bars even though net flow is zero. Compare Monthly Withdrawals on
Dashboard and Reports for the same year/month; confirm an older master month
does not hide a later completed ledger month for the same client.
Verify Scheduled Payout Date for two different clients against their CLIENTS rows.
Test both a full date and a recurring day; transaction Date must stay unchanged.
Confirm client print/CSV include the schedule. A missing value must show Not set,
not another client's date or a fabricated date.
For Current Portfolio, check the first/last displayed months and the reconciliation
between history closing balance and the current DASHBOARD total. A difference
is a source-data reconciliation issue, not a value to override automatically.

## GitHub Preparation

Do not commit real environment files. The repository ignores:

- `.env`
- `server/.env`
- `client/.env`
- build output and dependency folders

Commit only the safe templates:

- `.env.example`
- `server/.env.example`
- `client/.env.example`
- `client/.env.production.example`

First GitHub publish:

```bash
git add .
git commit -m "Fix Vercel backend API deployment"
git push -u origin main
```

## Full Vercel Hosting

The frontend and Express backend now run together on Vercel:

- React app: `client/dist`
- Vercel API: `api/index.js`
- Browser API base URL: `/api`

Vercel project settings:

- Framework preset: Vite
- Root directory: repository root
- Install command: `npm install --include=dev`
- Build command: `npm run build --workspace client`
- Output directory: `client/dist`

The root `vercel.json` contains these settings and React SPA rewrites.

The browser waits up to 75 seconds. Vercel allows the API function to run for 60
seconds; the Apps Script request is capped at 55 seconds so timeout errors can
return as JSON before Vercel terminates the function. Legacy shorter Vercel
timeout settings are raised to 45 seconds to allow response recovery. The separate Express server
uses a 60-second total budget, including safe read retries. Writes are never
automatically retried on timeout. These are maximum limits, not loading delays.

Login credentials are sent to Apps Script in a JSON POST body. Login and safe
reads can retry once when Google returns a transient HTTP/HTML error, within the
same deadline. Every attempt uses a fresh request nonce and disables HTTP caching.
Credential rejection responses are not retried, and mutations are never retried,
including legacy mutations transported by GET. Raw Google error pages are kept
out of client responses. This transport fix does not require a new Apps Script
deployment when the existing deployment already supports `doPost`.

Set these Vercel environment variables:

```env
NODE_ENV=production
CLIENT_URL=https://your-vercel-domain.vercel.app
APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbz4IMhPb_XqCFPBorxEBTgKsREaFOQaEmoKgBgedtIsfUHiXe4BbU91Yl6dy1P5oSMr/exec
SPREADSHEET_ID=19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI
JWT_SECRET=generate_a_new_secure_32_plus_character_secret
JWT_EXPIRES_IN=8h
CORS_ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
APPS_SCRIPT_TIMEOUT_MS=60000
LOG_LEVEL=info
SUPPORT_EMAIL=support@kalpavrukshawealth.com
SUPPORT_PHONE=+91 00000 00000
SUPPORT_WHATSAPP_URL=https://wa.me/910000000000
VITE_API_BASE_URL=/api
```

`JWT_SECRET` must be set in the same Vercel environment as the deployment you are testing. If testing a preview deployment URL, set it for Preview too, then redeploy.

If the dashboard value is not visible in `/api/system/health`, set it from the Vercel CLI inside the linked project:

```bash
vercel env add JWT_SECRET production
vercel env add JWT_SECRET preview
vercel env add JWT_SECRET development
vercel --prod
```

Do not set `VITE_API_BASE_URL` to `http://localhost:8080/api` in Vercel.

After deployment, verify:

- `https://your-vercel-domain.vercel.app/api/system/health`
- `https://your-vercel-domain.vercel.app/api/system/startup`

## Custom Domain

When the domain is confirmed, add it in Vercel:

```text
portal.kalpavrukshawealth.com
```

Then update Vercel environment variables:

```env
CLIENT_URL=https://portal.kalpavrukshawealth.com
CORS_ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app,https://portal.kalpavrukshawealth.com
VITE_API_BASE_URL=/api
```

Redeploy after changing the environment variables.

## Separate Backend Alternative

If the backend is hosted separately on Render or Railway:

```bash
npm install
npm run build --workspace server
npm run start --workspace server
```

Then set Vercel frontend:

```env
VITE_API_BASE_URL=https://your-backend-domain/api
```

## Apps Script

Redeploy only when `google-apps-script/Code.gs` changes.

When redeploying:

1. Open the existing Apps Script project.
2. Paste the latest `google-apps-script/Code.gs`.
3. Confirm the spreadsheet ID is `19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI`.
4. Deploy as Web App.
5. Execute as: Me.
6. Access: Anyone or the backend-access option supported by the deployment.
7. Update `APPS_SCRIPT_URL` in Vercel if Google issues a new Web App URL.

## Production Verification

1. Open `/api/system/health` on the Vercel domain.
2. Open `/api/system/startup` on the Vercel domain.
3. Confirm Apps Script and spreadsheet connectivity.
4. Sign in as admin and verify Admin Dashboard.
5. Sign in as client and verify Client Portal.
6. Confirm client routes do not show admin layout.
7. Confirm admin routes do not show client layout.
8. Test profile photo upload and document upload.
9. Test withdrawals, transactions, referrals, notifications, and reports.
10. Test mobile and desktop layouts on the Vercel domain.
