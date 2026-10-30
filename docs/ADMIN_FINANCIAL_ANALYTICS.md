# Admin Financial Analytics

## Verified Workbook Status (V26)

A read-only live audit on 28 October 2026 confirmed that DASHBOARD aggregates
Approved transaction rows and that all populated Transaction_Register entries use
that status. The former posted-status whitelist excluded the entire real ledger.
V26 accepts Approved ledger rows without changing spreadsheet statuses. Approved
Withdrawal_Master history is accepted only when identified as read-only historical
master data; Approved portal requests remain unpaid. Pending/rejected/cancelled
ledger rows remain excluded. The actual workbook's separate Credit, Payout and
Withdrawal columns are normalized without adding the derived TRANSACTIONS tab.

Independent ledger sums matched all corrected monthly series in the audited
snapshot, and reconstructed closing portfolio matched DASHBOARD. Scheduled and
remaining payout amounts were available. Payouts exceeding a client's current
schedule remain flagged rather than reducing another client's unpaid amount.
One historical template row with no usable date is excluded, not given a fake date.
No financial sheet edits were needed. Redeploy Apps Script V26 to activate this
mapping in the portal; repository publication alone does not update the script.

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

### Payout Estimate Drill-Down (V27)

At the owner's request, Reports separates Pending This Month and Upcoming Payouts.
The two cards open current/next-period client lists with names, scheduled/recorded/
balance amounts, CLIENTS dates, status, search and CSV export. No financial record
or spreadsheet formula is changed. The calendars reuse one admin snapshot.

V27 uses verified Investment_Master monthly ROI percentage points and funding
dates. The workbook pays each deposit first in the following calendar month, so
new funding no longer inflates the current-month pending balance. Withdrawals are
applied proportionally at the cycle's date; future-dated records are excluded.
Next month includes all eligible clients and explicit prepayments for that period.
These remain ledger-based estimates, not independently verified bank debt.
Missing terms or unique recurring CLIENTS dates make the calendar unavailable;
generic ROI is never assumed monthly. No partial or fabricated totals are shown.

The old DASHBOARD monthlyPayout column remains the current monthly run-rate.
It is not used as the current cycle's due balance. When calendar-ready,
payoutScheduleSource is investment_calendar and existing admin schedule/remainder
fields describe the current cycle. Client portal calculations are unchanged.

Deploy the updated complete Code.gs as a new version of the existing deployment:
`KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_29_PENDING_PAYOUT_CLIENTS_V27`.
Then publish the frontend. Older deployments show an explicit unavailable message,
not a fabricated empty list. No new spreadsheet tab or API route is required.

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
V23 client history reads include only that client's master rows and portal
requests, never all-client history. Historical records cannot be cancelled;
request creation and approval write destinations remain unchanged.
Admin linked-record matching trims and ignores case but never rewrites client codes.

## Charts

- V21 selects admin financial source tabs in explicit alias priority, not workbook position. Investment_Master precedes investment records/catalogues; Transaction_Register precedes raw/legacy transaction tabs. Withdrawal_Master supplies read-only admin history and analytics; it does not replace the withdrawal approval workflow. Read sources remain visible in admin-only Chart data sources.
- Monthly Investment has a year filter. Current years stop at the as-of month; past years show all twelve months, with zero amounts for genuine no-activity months. The initial year is the latest year with activity when the current year is empty.
- Monthly Investment prefers dated Investment_Master principal records. Blank historical master status is accepted when date and client ID exist; explicit pending/rejected records are excluded. Without usable master records, prefer completed investment/deposit ledger entries, then funded investment records. Never add both sources together.
- V24 Monthly Withdrawals selects usable dated Withdrawal_Master amounts per client and calendar month. Blank master status represents recorded history, not a paid workflow request. V26 accepts Approved read-only master records, consistent with the verified workbook; approved-but-unpaid portal requests stay excluded, as do pending/rejected/cancelled entries. For each client/month without usable master records, use posted withdrawal ledger entries, then paid workflow records with payment dates. Never add different sources for the same client/month. Invalid dates are warned and future records are excluded. Old master months no longer suppress later ledger months for the same client. Initial period selects the latest activity year if the current year is empty. This is source precedence, not fuzzy row matching: if a master month is only partially maintained, reconcile it at the source rather than merging ambiguous ledger duplicates.
- Year and month filters operate on the same backend snapshot without new API calls. All months gives monthly totals; a selected month gives daily totals. Previous years show twelve months; current periods stop at the as-of month/day.
- Monthly Payout Report: signed dated completed payout/interest ledger entries (credit minus debit, including reversals), not expected monthly returns grouped by investment start date. Year-filtered bars remain visible with just one recorded month. Missing months within a returned dated series are zero-activity months, not invented payments.
- Transaction Flow: monthly completed ledger credit/debit bars with the net total above the chart. Equal credit/debit does not hide real activity. Year filters select the most recent activity, including debit-only years. V24 adds transactionFlowMonths; older deployments retain net-only bars and show an upgrade notice.
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

### Admin Chart Rendering And Payout History (2026-10-29)

- Admin charts measure their container and pass explicit numeric canvas dimensions
  to Recharts. Temporary zero-width animated panels retain their last usable
  width. Window resize remains supported when ResizeObserver is unavailable.
- Withdrawal, payout and flow charts expose a selectable-period values table
  alongside the visual chart. Values come from the same backend analytics series;
  the frontend does not substitute generated payments for missing source data.
- The shared admin overview refreshes every 60 seconds while visible, on reconnect,
  and on focus when stale after 30 seconds. Dashboard, Reports and Payout History
  share one query and retain their existing snapshot during background refreshes.
  Client query defaults and authentication are unchanged.
- `/admin/payout-history` uses the existing admin-protected `/dashboard` response.
  No backend API or Apps Script action was duplicated or added. Payout/interest
  ledger entries and reversals are joined by normalized exact client ID to the
  existing profile and backend `adminClientSummaries`.
- Filters cover client name/ID, posting status, payout date range, net payout
  range, current client investment/withdrawal ranges, client plan context and sort.
  Default selection is posted/completed ledger entries, including Approved ledger
  records, not pending withdrawal approvals. Twenty rows are paginated on screen;
  CSV and print include every filtered row, not only the visible page.
- Investment, withdrawal and portfolio columns are current client totals from the
  backend, not historical balances on each payout date. They are never added up
  across repeated payout rows. Missing amounts stay unavailable rather than zero.
- Client plan names come only from actual client-linked investment records. They
  are context, not an allocation of a cumulative payout to a particular plan.
  Investment_Master without plan links displays Not linked; never infer a client
  plan from the investment-plan catalogue or a matching amount.
- Raw numeric payout precision is preserved in exports; screen currency formatting
  does not rewrite source records. CSV text cells guard against formula injection.
- PWA static-cache version is v21. API responses remain network-only and no
  business data or authentication is cleared for the asset update.
- This release is frontend-only: no spreadsheet formula edits or Code.gs redeploy
  are needed. Publish the client build through the existing GitHub/Vercel workflow.
  A live authenticated UI check is still required after deployment.

Deploy the complete `google-apps-script/Code.gs` as a new version of the existing
deployment. Expected marker:
`KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_29_PENDING_PAYOUT_CLIENTS_V27`.

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
V23 Apps Script deployment; a successful build or health response does not prove it.
