# Admin Financial Analytics

## Cards Used on Both Pages

Dashboard and Reports render the same `AdminOverviewCards` component. Financial
figures originate from the existing `/api/dashboard` response, not separate
component calculations.

| Card | Meaning |
| --- | --- |
| Total Investment | Sum of DASHBOARD Total Invested; investment principal is used only when DASHBOARD has no records. |
| Net investment (gold line) | Total invested minus DASHBOARD Total Withdrawal; without DASHBOARD records, completed withdrawals are used. Negative balances are not silently clamped. |
| Total Portfolio Value | Sum of DASHBOARD Net Portfolio. It is not renamed available balance or assumed to equal net investment. |
| Estimated Monthly Payout | Explicit monthly payout amounts for active investments eligible in the current Asia/Kolkata calendar month. Future starts, expired maturities, and next-payout dates outside the month are excluded. |
| Total payouts (small line) | DASHBOARD Total Payout. Completed payout/interest ledger totals are used only when DASHBOARD has no records. |
| Pending Withdrawals | Count of requests with pending status; the gold line shows their total amount awaiting approval. |
| Verified KYC | Verified client count using the KYC tab, with profile status as fallback. Duplicate KYC rows do not count a client twice; missing/rejected/non-verified clients need review. |
| Documents Uploaded | Document-record count; its smaller line is unread notifications, not a KYC alert. |

## Payout Requirements

Use a monetary Monthly Return, Monthly Payout, Monthly Interest, or Monthly Payout
Amount column. Header matching remains case/space/underscore insensitive.
Optional fields: Next Payout Date/Scheduled Payout Date and Payout Frequency/Payment
Frequency. Monthly recurrence is supported. Missing amounts or unsupported
frequencies produce null plus an explicit warning; an explicit numeric zero is
valid. ROI alone is not sufficient because its units and payment terms are not
confirmed. No rate conversion, prorating, or payment execution is invented.

This is a gross current-month estimate, not the unpaid remainder after payments.
Current month boundaries use Asia/Kolkata, independent of the server's timezone.

## Charts

- Monthly Investment: January through the current month of the present India calendar year, chronological, with zero amounts for genuine no-activity months.
- Prefer completed investment/deposit ledger entries. If none exist, use dated funded investment records. Never add both sources together.
- Monthly Withdrawals: completed withdrawal ledger entries, or paid withdrawal records with payment dates when no completed ledger entries exist. Pending, approved-but-unpaid, and rejected requests are not completed withdrawals.
- Year and month filters operate on the same backend snapshot without new API calls. All months gives monthly totals; a selected month gives daily totals. Previous years show twelve months; current periods stop at the as-of month/day.
- Monthly Payout Report: dated completed payout/interest ledger entries, not expected monthly returns grouped by investment start date.
- Indian `dd/MM/yyyy`, ISO dates, Apps Script Date values, and spreadsheet date serials are supported. Invalid/impossible dates are excluded with warnings. Future dates are excluded from actual-activity charts.
- Mark Paid records Payment Date for future charting. Do not backfill historical payment dates using request dates unless independently verified.
- Filtered chart exports use the currently selected period.

## Deployment and Verification

Deploy the complete `google-apps-script/Code.gs` as a new version of the existing
deployment. Expected marker:
`KALPAVRUKSHA_PORTAL_CODE_GS_2026_10_14_ADMIN_ANALYTICS_V18`.

Sign in as admin, open Dashboard then Reports, and verify matching card values.
Check monthly investment against completed investment ledger amounts for the
current year; test withdrawal filters against paid transactions for known dates.
Confirm a pending request changes pending count/amount but not completed charts.
Confirm missing payout terms show Not available and a warning, rather than zero.

Automated tests cover the calculations, source precedence, dates, role separation,
request-local read reuse, card rendering, and interactive month/year filtering.
Live financial reconciliation requires an authenticated admin session and the
V18 Apps Script deployment; a successful build or health response does not prove it.
