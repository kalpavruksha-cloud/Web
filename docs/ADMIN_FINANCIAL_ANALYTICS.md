# Admin Financial Analytics

## Cards Used on Both Pages

Dashboard and Reports render the same `AdminOverviewCards` component. Financial
figures originate from the existing `/api/dashboard` response, not separate
component calculations.

| Card | Meaning |
| --- | --- |
| Total Investment | Sum of DASHBOARD Total Invested; investment principal is used only when DASHBOARD has no records. |
| Net investment (gold line) | DASHBOARD Present Investment when valid. Legacy fallback: total invested minus DASHBOARD Total Withdrawal, or completed withdrawals without DASHBOARD records. Negative balances are not silently clamped. |
| Total Portfolio Value | Sum of DASHBOARD Net Portfolio. It is not renamed available balance or assumed to equal net investment. |
| Estimated Monthly Payout | Remaining current-month payout: sum per client of max(scheduled amount minus completed payouts assigned to that month, 0). Smaller lines show scheduled amount, recorded payments for the month, and historical total payouts separately. |
| Total payouts (small line) | DASHBOARD Total Payout. Completed payout/interest ledger totals are used only when DASHBOARD has no records. |
| Pending Withdrawals | Count of requests with pending status; the gold line shows their total amount awaiting approval. |
| Verified KYC | Verified client count using the KYC tab, with profile status as fallback. Duplicate KYC rows do not count a client twice; missing/rejected/non-verified clients need review. |
| Documents Uploaded | Document-record count; its smaller line is unread notifications, not a KYC alert. |
| Present Investment | Direct sum of the DASHBOARD client-row Present Investment values; client dashboard shows its own amount. Not an estimate of market value. |
| Monthly Payout | Direct DASHBOARD Monthly Payout amount; a monthly schedule, not the unpaid remainder or all-time Total Payout. |

## Payout Requirements

V22 prefers each client's explicit DASHBOARD Monthly Payout amount for the
monthly schedule and remainder. It does not add investment-master amounts again.
A missing/error/negative payout in an existing DASHBOARD schedule makes the
estimate unavailable with a warning, not a partial sum or a fallback to a different
source. Older sheets without this column retain the investment-record fallback:
use a monetary Monthly Return, Monthly Payout, Monthly Interest, or Monthly Payout
Amount column. Header matching remains case/space/underscore insensitive.
Optional fields: Next Payout Date/Scheduled Payout Date and Payout Frequency/Payment
Frequency. Monthly recurrence is supported. Missing amounts or unsupported
frequencies produce null plus an explicit warning; an explicit numeric zero is
valid. ROI alone is not sufficient because its units and payment terms are not
confirmed. No rate conversion, prorating, or payment execution is invented.

The API keeps `estimatedMonthlyPayout` as the gross estimate for compatibility.
`scheduledMonthlyPayout` exposes that same amount; the visible card uses
`remainingMonthlyPayout`, never the old gross value as an unpaid balance.
`paidMonthlyPayout` shows completed payout/interest records allocated to the month.
The existing client-ledger convention applies: credit is a payout credit and debit
is a reversal. Pending/rejected/future payments are not deducted. If Payout Period,
Payout Month, For Month or Accrual Month is provided, it identifies the obligation
month (for example `2026-10`); otherwise the payment's India calendar month is used.
An explicit older period therefore does not reduce the current month's remainder.
An overpayment for one client cannot reduce another client's unpaid amount.
Missing terms, dates, client IDs or invalid explicit periods make the remainder
unavailable with a warning rather than showing a false zero. An actual fully paid
schedule produces zero. Without investment status, an Investment_Master entry
requires a client ID, funded start date and eligible date window; explicit pending,
rejected or closed investments are never assumed active.
Current month boundaries use Asia/Kolkata, independent of the server's timezone.

## Withdrawal Records

Admin `GET /api/withdrawals`, Dashboard records and linked client details include
both portal requests and historical Withdrawal_Master rows. History is labelled
`recordSource: withdrawal_master`, `readOnly: true`, with recorded dates and client
ID. Blank historical status remains `recorded`, not an invented `paid` status.
History cannot be approved/marked paid from the UI; writes still target only the
existing request sheet. Pending approval cards count actionable requests, not
read-only history. A matching explicit client ID and withdrawal ID deduplicates
the list across tabs; matching amount/date alone never removes a legitimate row.
Analytics still use the complete primary history source once per request.
Client API reads and permissions are unchanged and never return all-client history.
Admin linked-record matching trims and ignores case but never rewrites client codes.

## Charts

- V21 selects admin financial source tabs in explicit alias priority, not workbook position. Investment_Master precedes investment records/catalogues; Transaction_Register precedes raw/legacy transaction tabs. Withdrawal_Master supplies read-only admin history and analytics; it does not replace the withdrawal approval workflow. Read sources remain visible in admin-only Chart data sources.
- Monthly Investment: January through the current month of the present India calendar year, chronological, with zero amounts for genuine no-activity months.
- Monthly Investment prefers dated Investment_Master principal records. Blank historical master status is accepted when date and client ID exist; explicit pending/rejected records are excluded. Without usable master records, prefer completed investment/deposit ledger entries, then funded investment records. Never add both sources together.
- Monthly Withdrawals prefers dated Withdrawal_Master amounts. Blank master status represents recorded history, not a paid workflow request. Explicit pending, approved-but-unpaid, rejected and cancelled records are excluded. Without eligible master records, use completed withdrawal ledger entries, then paid workflow records with payment dates. Never combine master and ledger totals.
- Year and month filters operate on the same backend snapshot without new API calls. All months gives monthly totals; a selected month gives daily totals. Previous years show twelve months; current periods stop at the as-of month/day.
- Monthly Payout Report: dated completed payout/interest ledger entries, not expected monthly returns grouped by investment start date.
- Indian `dd/MM/yyyy`, ISO dates, Apps Script Date values, and spreadsheet date serials are supported. Invalid/impossible dates are excluded with warnings. Future dates are excluded from actual-activity charts.
- Mark Paid records Payment Date for future charting. Do not backfill historical payment dates using request dates unless independently verified.
- Filtered chart exports use the currently selected period.
- Current Portfolio occupies one full-width dashboard panel with a 420px chart and exactly 24 calendar months ending in the current India month. Investment and withdrawal sources follow the same precedence as the monthly charts. Completed payout/interest, referral, fee and adjustment entries supply signed changes.
- Recorded client closing/running balances replace that client's reconstructed balance rather than being added again. For multiple entries on the same day, the last spreadsheet row is the day's closing record; keep same-day ledger rows in posting order. Client balances are summed after each day. Balances before the 24-month window supply the opening amount. Unknown earlier history stays null; known month-end balances carry forward across no-activity months. Invalid balance text is not a zero balance.
- This is recorded book history, not an invented market valuation curve. The current DASHBOARD total stays unchanged. The latest reconstructed balance is reconciled with it, and any difference is reported without modifying history. With no usable history, only the current snapshot is shown.
- Portfolio distribution uses complete investment-level current valuations, or actual per-client DASHBOARD portfolio values when those valuations are incomplete. Only when neither valuation source exists does it show recorded principal, explicitly labelled as principal rather than current value. Labels identify the selected source and basis.
- Portfolio Distribution and Client Registration Trend have been removed from Dashboard. Report distribution remains available. Registration metadata is retained for compatibility; DOB is never used.
- All chart containers have explicit numeric height and minimum width constraints. Single-point area charts display a visible point. Real Recharts SVG rendering is tested without mocking the chart library.
- The source panel lists detected columns, counts and excluded posting statuses. Correct missing data at the source; do not mark pending or rejected transactions completed merely to populate a chart.

## Deployment and Verification

Deploy the complete `google-apps-script/Code.gs` as a new version of the existing
deployment. Expected marker:
`KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_21_DASHBOARD_COLUMNS_V22`.

Sign in as admin, open Dashboard then Reports, and verify matching card values.
Check monthly investment against dated Investment_Master amounts for the
current year; test withdrawal filters against Withdrawal_Master for known dates.
If a master source is unavailable, check the fallback source named below the chart.
Check the 24-month portfolio series against per-client closing balances and dated
cash flows; investigate any difference from the current DASHBOARD total.
Confirm a pending request changes pending count/amount but not completed charts.
Confirm missing payout terms show Not available and a warning, rather than zero.
Verify a partial payment reduces only that client's monthly remainder; verify an
overpayment does not reduce another client's remainder. Verify historical rows
appear in both Withdrawal Management and the linked client's details, read-only.

Automated tests cover the calculations, source precedence, dates, role separation,
request-local read reuse, card rendering, and interactive month/year filtering.
Live financial reconciliation requires an authenticated admin session and the
V22 Apps Script deployment; a successful build or health response does not prove it.
