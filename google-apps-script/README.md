# Google Apps Script Integration

## Password Persistence (V30)

Latest marker: `KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_31_PASSWORD_AUTHORITY_V30`.
V30 includes the full V29 KYC implementation and all earlier fixes.

Replace the complete Code.gs, save, and deploy a **New version** of the existing
Web App, keeping the same URL and executing as the owner. Publish the matching
frontend/backend changes through the existing GitHub/Vercel project. No additional
environment variable or Script Property is required for password changes. The
V29 signing property remains required for KYC only.

The existing CLIENT_CREDENTIALS Password cell is the password authority. Client
Settings > Change Password writes that same row and records LastPasswordChange
only after the password is read back successfully. No actual customer password
is changed merely by deployment. Existing sessions are not new password logins;
sign out before checking that the old password is rejected.

Login no longer falls back to a stale CLIENTS password when a credential row
already exists. The existing explicit CLIENTS-only migration remains available
only for accounts without a credential row, after their password is checked.
Login and password change share canonical Password/legacy-header resolution.
Existing alternative password columns on the affected account are synchronized,
not used as additional valid passwords. Duplicate accounts/conflicting canonical
fields fail closed; the script never bulk-resets passwords or guesses a row.

Changes use a lock, POST body, current-password verification, confirmation, literal
text storage and fresh readback. GET password changes are rejected. New passwords
must be 6-100 characters, different from the current password, and have no leading
or trailing spaces. Special characters and leading zeros are preserved. Unsafe
writes are never automatically retried. An unconfirmed save shows an error, not
a success notification. No password is echoed in API responses or audit records.

The existing workbook architecture stores Password as plaintext, visible to its
authorized spreadsheet editors; this release does not introduce hashing or add
passwords to client profiles, admin dashboard exports or public diagnostics.
Restrict spreadsheet access. Support should prefer resetting a password rather
than transmitting a client's stored password.

## Admin KYC Review (V29)

Historical V29 marker (included in V30): `KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_30_ADMIN_KYC_REVIEW_V29`.
V29 includes V28 and all earlier fixes. Replace the complete Code.gs; do not paste
only the new functions. Keep the existing spreadsheet and Web App deployment URL.

Before deploying, open **Project Settings > Script Properties** and add
`PORTAL_JWT_SECRET` with the exact current backend/Vercel `JWT_SECRET` value.
Copy it privately; never put it in Code.gs, the spreadsheet, a public URL, a client
environment variable, a screenshot or a Git commit. This property signs only the
new server-to-script KYC requests; existing login, JWT cookies and sessions are
unchanged. If the backend secret is rotated, update this property to match.

Save, then **Deploy > Manage deployments > Edit > New version > Deploy**, executing
as the owner with backend access. `?action=deploymentTest` must return the V29
marker and `kycSigningConfigured: true`. This boolean confirms a configured
32-character-or-longer property, not a successful secret match; verify a legitimate
signed-in KYC read afterwards. Publishing GitHub/Vercel does not deploy Apps Script.

- Client: **Profile > PAN & Aadhaar Details**, submit numbers; supporting scans
  continue to use the existing Documents upload flow.
- Admin: **Clients > View / Review KYC > KYC Verification**. Compare the entered
  numbers with the selected client-owned PAN and Aadhaar documents, check the
  review confirmation, choose Verify KYC and confirm. Reject/reopen requires a
  reason. This is manual document review, not government identity verification.
- The existing KYC tab is the status authority. Uploading a file alone never
  verifies a client. No real client is automatically approved by deployment.
- New KYC writes add audit/evidence columns only in the existing KYC tab. They
  update the selected DOCUMENTS statuses and append an ACTIVITY_LOG action. No
  investment, transaction, dashboard formula or credential is rewritten.
- Verified numbers are locked until admin reopens review. Identity-evidence
  changes make the status under_review. Stale revisions and duplicate records
  fail closed. Client responses contain only Aadhaar's last four digits; full
  Aadhaar is available only to the focused admin review endpoint.

## Email Login and Registration Totals (V28)

Historical V28 marker (included in V29):
`KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_30_EMAIL_LOGIN_DASHBOARD_FORMULAS_V28`.

Replace the complete Code.gs and deploy a New version of the existing Web App.
Keep its URL. Publishing GitHub/Vercel does not deploy Apps Script automatically.

The verified credential sheet has ClientId (Login ID), ClientName, Password,
Role, Status and LastPasswordChange, but no Email column. V28 resolves a unique
CLIENTS email to its Client ID, then verifies that account's existing credential
password and role. Email matching is case-insensitive. Client-ID login, JWT,
inactive/pending status checks and role authorization are unchanged. Duplicate
identities fail closed; names are never used to guess a login. An email without a
Client ID link needs an owner-approved source-data repair. Blank emails cannot
be used for login.

Registration writes now match existing headers by normalized name, preserving a
ClientId even when the header contains trailing whitespace. New DASHBOARD rows
initialize all seven financial fields, including Present Investment and Monthly
Payout, and inherit existing financial formulas in native R1C1 form. A verified
unused formula-generated Client ID slot is reserved before appending a new row,
so later transaction-driven ID formulas already see the registered ID. Only the
new account's slot is written; existing client/financial records are not rewritten.
Where no existing formula template is available, a new unfunded account starts
with explicit zero values, matching the existing registration convention.

The admin Dashboard and Reports keep both source-backed cards visible. Missing
or invalid amounts remain unavailable, never a partial sum or an invented zero.

## Payout Estimate Clients (V27)

The existing admin dashboard response separates current-calendar-month balances
from next month's estimated payouts, with names and dates from CLIENTS. No new
API, sheet, financial write or authentication flow is added. Verified
Investment_Master monthly ROI percentage points and funded dates supply the
calendar. The workbook starts each deposit's first payout the following calendar
month. Recorded master withdrawals reduce principal proportionally as of the
cycle date, consistent with the workbook; explicit maturity dates are respected.

Posted payments, reversals and payout-period allocations reduce only the matching
client's period balance. Future-dated payments are excluded. Upcoming estimates
include all eligible clients, not only new deposits, and assume no future source
changes. Missing terms/dates make the calendar unavailable, not zero. Generated
Approved ledger rows are not independent proof of bank settlement.

V27 marker:
`KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_29_PENDING_PAYOUT_CLIENTS_V27`.
Replace the complete Code.gs, save and deploy a New version of the existing Web
App, retaining the URL. Publish the frontend through the existing GitHub/Vercel
workflow. Publishing this repository does not update Apps Script automatically.

## Verified Approved Ledger Status (V26)

The owner-authorized read-only workbook audit found that all populated
Transaction_Register rows use Approved, and DASHBOARD SUMIFS explicitly treats
that status as posted. V26 accepts Approved ledger transactions in payout,
transaction-flow, portfolio and payout-remainder calculations. It also accepts
Approved read-only Withdrawal_Master history, without treating approved portal
withdrawal requests as paid. No spreadsheet amounts, dates, statuses or formulas
are changed. Existing V25 client payout-date support is included.

Expected marker:
`KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_28_APPROVED_LEDGER_CHARTS_V26`.
Replace the full Code.gs, save, and deploy a New version of the existing Web App.
Publishing this repository does not deploy Apps Script automatically.

An in-memory audit against the live effective values produced monthly payout,
withdrawal and transaction-flow series, independently reconciled
against the register. Closing portfolio matched DASHBOARD. Private financial rows
were not committed; regression tests reproduce the verified shape with synthetic
amounts and client IDs. Portal authentication and source-data permissions are
unchanged. See docs/SPREADSHEET_MAPPING.md for the verified fields.

## CLIENTS Payout Date (V25)

Full replacement Code.gs includes all V24 chart fixes and the existing CLIENTS
Date of payout mapping. Expected marker:
`KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_28_CLIENT_PAYOUT_DATE_V25`.
Save and deploy a New version of the same existing deployment, retaining its URL.
No spreadsheet data migration or formula rewrite is required.

Profiles expose payoutDate; transactions expose scheduledPayoutDate, joined by
client ID and scoped for clients. A full date or recurring day of month is
supported. Blank/invalid schedules are not fabricated. The actual transaction
Date is never overwritten by today's schedule, and charts retain actual payment
dates. Duplicate client IDs with conflicting schedules return null.

## Admin Report Charts (V24)

Deploy the complete Code.gs as a new version of the existing Web App. The marker
is `KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_27_ADMIN_REPORT_CHARTS_V24`.
Monthly withdrawal source priority now applies per client **and calendar month**:
Withdrawal_Master, then completed withdrawal ledger entries, then paid requests.
An older master month no longer suppresses that client's later ledger months.
Within a month only one source is used; rows are not guessed to be duplicates by
amount/date. Reconcile incomplete sources within the same month in the spreadsheet.

Historical aliases include Withdrawal Dt, Withdraw Amount and Debit Amount;
`Withdrawn` is accepted as a completed historical status. Missing column warnings
use the same aliases as the mapper. Explicit payout/interest amount columns and
specific payout/withdrawal type aliases are normalized. Unknown categories are
not treated as payouts. Payout history uses signed credit minus debit, including
reversals; future/undated payments are excluded from dated totals.

`adminAnalytics.transactionFlowMonths` adds monthly credit, debit, net and count
from completed dated ledger rows. The existing transactionMonths net series stays
compatible. Report charts use visible bars even for a single month, year filters,
and the same dashboard snapshot; no new API, database, or authentication flow.

## Client History and Charts (V23)

V23 returns a 12-month, client-scoped portfolio series from complete normalized
investment/ledger/withdrawal history. Opening balances precede the visible window;
unknown months remain empty. A current snapshot is not invented historical growth.
Clients now see their own read-only Withdrawal_Master history alongside portal
requests, newest first, and cannot cancel historical entries. Client and admin
financial reads use the same source priority and Indian date/currency handling.

V23 chose usable dated master records per client, then completed ledger entries
or paid requests for clients without usable master history. V24 narrows this
precedence to each client/month so later activity is retained. Invalid dates produce warnings. The
admin investment chart has a year filter; both charts initially select the latest
activity year when the present year has no activity.

Admin client details reuse the existing dashboard snapshot and display four
client-linked DASHBOARD totals. No routes, authentication flow, spreadsheets or
write destinations have been added or changed.

## DASHBOARD Columns (V22)

V22 reads the existing DASHBOARD columns Present Investment and Monthly Payout.
Both client web/PWA and admin views display those exact sheet amounts. Present
Investment supplies available/net investment; Monthly Payout supplies the monthly
schedule used for the per-client unpaid remainder. Percentage rates are not
inferred or calculated in the app. Missing/error cells are not fabricated zeroes.
No spreadsheet formulas are changed. See docs/SPREADSHEET_MAPPING.md for grounding.

## Withdrawals and Payout Remainder (V21)

V21 includes read-only Withdrawal_Master records in the admin withdrawal list and
linked client details while keeping writes in the existing request sheet. Historical
rows do not become approval requests. Dashboard/Reports show the per-client unpaid
monthly payout remainder, with scheduled and recorded amounts separately. Actual
payment records and explicit monthly terms are required; ROI is never guessed.

V20 extends the admin financial tab selection: Investment_Master and
Transaction_Register take precedence over a plan catalogue or older transaction
tab, regardless of their physical order in the workbook. Client reads, login,
permissions, and existing write routes are unchanged.

Admin charts now share backend-normalized chronological series, parse Indian
dates/currency, display single-point snapshots visibly, and use stable chart
dimensions. Dashboard distribution and registration panels have been removed.
The expanded Current Portfolio chart covers 24 months. Dated client closing
balances replace reconstructed balances; otherwise dated investments, payouts,
withdrawals and adjustments form the recorded book balance. Missing history is
left blank and discrepancies with the current DASHBOARD total are flagged.
The Chart data sources panel shows the selected tabs, record counts, headers,
missing-field warnings, excluded transaction statuses, and snapshot time.

## Admin Financial Analytics

Dashboard and Reports share the same `admin` totals and `adminAnalytics` series.
This includes net investment, current-month estimated payout, total recorded
payouts, pending withdrawal amount, KYC counts, and dated investment/paid-withdrawal
charts. All calculations run inside the existing dashboard request. The historical
Withdrawal_Master is read once for read-only history and analytics, without changing withdrawal
approval workflows or adding a persistent data cache.

Replace the complete `Code.gs` and deploy **New version** on the existing deployment.
Verify `?action=deploymentTest` returns
`KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_24_CLIENT_HISTORY_CHARTS_V23`.
The web release explicitly flags unavailable analytics until this deployment
is updated. Do not change the deployment URL unless necessary.

Payout estimates require an explicit monetary `Monthly Return`, `Monthly Payout`,
`Monthly Interest`, or `Monthly Payout Amount` column on the investment records.
The script does not guess whether generic ROI is monthly, annual, or a decimal
percentage. Active investments overlapping the current India calendar month are
eligible; an explicit Next Payout Date restricts the estimate to that month.
Unsupported frequency or missing terms produce a warning and an unavailable
estimate, not a fabricated zero. This is an estimate, not a payment instruction.

Monthly investment charts prefer dated Investment_Master records, including
historical rows with blank status. Explicit pending/rejected entries are excluded.
Monthly withdrawal charts prefer dated Withdrawal_Master records. Blank status
means a recorded historical entry, not a paid approval request. Explicit pending,
approved-but-unpaid and rejected entries are excluded. One primary source per
chart avoids counting the same money again from the transaction register.
Without usable master records, completed ledger entries are used; without ledger
entries, paid workflow records require a Payment Date/Paid Date.
Mark Paid now records Payment Date. Existing undated paid records are flagged and
are not assigned an invented payment month.

## Single-Request Dashboard

The updated dashboard returns the existing totals and all admin chart/table
records in one `adminData` snapshot. It opens the spreadsheet once and reads each
required tab once per dashboard request. These rows are not cached between
requests, and client responses never contain `adminData`.

To enable the single-request dashboard, replace the existing script with the
complete `Code.gs` in this directory, then use **Deploy > Manage deployments >
Edit > Version: New version > Deploy**. Keep the existing deployment and URL.
Check `?action=deploymentTest` for marker
`KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_24_CLIENT_HISTORY_CHARTS_V23`.

Until that deployment is updated, the web portal loads the summary first and
limits legacy collection requests to two at a time. The optimized Apps Script
version must be deployed to eliminate these extra requests fully.

The configured Web App URL is:

`https://script.google.com/macros/s/AKfycbz4IMhPb_XqCFPBorxEBTgKsREaFOQaEmoKgBgedtIsfUHiXe4BbU91Yl6dy1P5oSMr/exec`

The latest local `Code.gs` includes `doGet`, `doPost`, `health`, `schema`, authentication, client portal actions, Drive uploads, and spreadsheet writes. If `/api/system/startup` reports `Script function not found: doPost`, the deployed Google Apps Script version is not this local file yet.

`Code.gs` is a complete replacement implementation for the existing spreadsheet. Review it, paste it into the existing Apps Script project bound to the provided spreadsheet, then deploy a new Web App version.

Do not create a new spreadsheet. Keep using:

`19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI`

## Deployment

1. Open the existing Apps Script project for the spreadsheet.
2. Replace or merge `Code.gs` after backing up the current script.
3. Set script property `SPREADSHEET_ID` to the existing spreadsheet ID, or use the embedded `SPREADSHEET_ID` constant already present in `Code.gs`.
4. Deploy as Web App.
5. Execute as the script owner.
6. Allow access from the backend hosting environment.
7. Update `APPS_SCRIPT_URL` in the backend environment if the deployment URL changes.
8. Approve the requested Spreadsheet and Drive permissions.
9. Verify `GET /api/system/health` and admin `GET /api/admin/spreadsheet-schema`.

## Drive Upload Authorization

Document upload requires Google Drive permission because files are saved in Drive before their metadata is written to the `DOCUMENTS` sheet.

If upload fails with `You do not have permission to call DriveApp.getRootFolder`, do this in the Apps Script editor:

1. Open **Project Settings**.
2. Enable **Show "appsscript.json" manifest file in editor**.
3. Open `appsscript.json`.
4. Replace it with the local `google-apps-script/appsscript.json`.
5. Open `Code.gs` and replace it with the latest local `google-apps-script/Code.gs`.
6. In the function selector, run `driveAuthorizationTest`.
7. Approve the Google permissions, including Drive.
8. Deploy a new Web App version with **Execute as: Me**.
9. Test:

`https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=driveAuthorizationTest`

The result must include:

`"driveApp":"write_authorized"`

This test creates a temporary folder in My Drive and immediately moves it to trash. That is intentional: it forces Google Apps Script to request the full `https://www.googleapis.com/auth/drive` permission required for client document uploads.
