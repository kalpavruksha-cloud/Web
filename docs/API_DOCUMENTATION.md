# API Documentation

Base URL: `/api`

All protected endpoints require the secure `session` HTTP-only cookie issued by `POST /api/auth/login`.

## Auth

- `POST /api/auth/login` `{ identifier, password, remember }`
- `POST /api/auth/logout`
- `GET /api/auth/session`

## Client and Admin Data

- `GET /api/dashboard`
- `GET /api/profile`
- `PUT /api/profile`
- `GET /api/investments`
- `GET /api/investments/:id`
- `POST /api/investments` admin
- `PUT /api/investments/:id` admin
- `GET /api/transactions`
- `GET /api/transactions/:id`
- `POST /api/transactions` admin
- `GET /api/withdrawals`
  Admin responses include read-only `Withdrawal_Master` history alongside portal
  requests. History has `recordSource: "withdrawal_master"` and `readOnly: true`.
  Client responses include only that client's portal requests and read-only master
  history. No all-client history is returned to clients. Historical records cannot
  be cancelled through the client API.

- `POST /api/withdrawals`
- `PUT /api/withdrawals/:id/approve` admin
- `PUT /api/withdrawals/:id/reject` admin
- `PUT /api/withdrawals/:id/paid` admin
- `GET /api/referrals`
- `POST /api/referrals`
- `PUT /api/referrals/:id` admin
- `GET /api/documents`
- `POST /api/documents` admin
- `DELETE /api/documents/:id` admin
- `GET /api/notifications`
- `POST /api/notifications` admin
- `PUT /api/notifications/:id/read`
- `PUT /api/notifications/read-all`
- `GET /api/reports`
- `GET /api/reports/:type`
- `GET /api/settings`
- `PUT /api/settings` admin
- `GET /api/clients` admin extension for Client Management
- `GET /api/clients/:id` admin extension
- `POST /api/clients` admin extension
- `PUT /api/clients/:id` admin extension

## Dashboard History and Summaries (V23)

Client dashboard responses now include `portfolioHistory` with `asOf`, `months`
(exactly 12 `{month, amount}` records), `source`, and `matchesCurrentPortfolio`.
`amount: null` means unavailable history, not zero. This uses the complete scoped
history, not the recent-transactions preview. A current-only snapshot occupies
only the final month. Admin-only `adminClientSummaries` contains client IDs and
`totalInvestment`, `totalWithdrawal`, `totalPayout`, `totalPortfolio`, with null
for missing/invalid totals. It is absent from client responses. The existing
`/api/dashboard` and `/api/client/dashboard` endpoints are reused.

Investment and transaction normalization/source priority are consistent across
roles while client reads stay scoped. V24 withdrawals use one usable primary source
per client/calendar month; `withdrawalSource: combined_records` means different
client/month groups use different primary sources, not that a withdrawal is added
across sources.

## Admin Report Series (V24)

The existing admin `/api/dashboard` response adds
`adminAnalytics.transactionFlowMonths`: `{month, credit, debit, net, count}[]`.
Only completed dated ledger records up to the as-of date are included. Existing
`transactionMonths` remains the signed net series. Equal credit and debit produce
zero net but preserve both gross amounts. These all-client series are never sent
in client responses. `payoutMonths` now includes debit reversals as signed amounts;
it is actual payment history, not the current DASHBOARD payout schedule. All report
filters reuse the same snapshot; no new API or financial calculation in the UI.

V26 recognizes Approved as a posted ledger status, matching the verified
Transaction_Register and DASHBOARD SUMIFS convention. The normalized transaction
still exposes `status: approved`; it is not rewritten to paid. Approved historical
withdrawals enter charts only with readOnly true and recordSource withdrawal_master.
Approved workflow requests remain unpaid and excluded until marked paid. Existing
API shapes, client scoping and permissions are unchanged.

## Client Payout Schedule (V25)

Profile responses add `payoutDate`, read from CLIENTS Date of payout. Transaction
responses add `scheduledPayoutDate` from the matching client row. Both are optional
YYYY-MM-DD strings or day-of-month strings 1-31; null means invalid/conflicting
schedule. Profile omits unset dates; a matched transaction uses an empty string
for an unset schedule, while an absent transaction field means unavailable (for
example an older deployment or unmatched client). The current schedule does not replace the
historical transaction `date`. Client endpoints continue returning only the
signed-in client's records. Existing endpoints and permissions are unchanged.

## Dashboard Columns (V22)

The existing dashboard responses additionally expose `presentInvestment` and
`monthlyPayout` from matching DASHBOARD columns. They are numbers, null when
present but invalid/incomplete, and omitted on legacy sheets without these
columns. Admin values sum client rows; client values remain scoped. The admin
schedule prefers DASHBOARD Monthly Payout; the unpaid balance is still returned
separately as `admin.remainingMonthlyPayout`. No additional endpoint is needed.

## Diagnostics

### Admin Payout Estimate Details (V27)

The existing admin `GET /api/dashboard` response adds
`adminAnalytics.pendingPayouts` and `pendingPayoutWarnings`. No endpoint is added.
Client responses never expose this all-client breakdown.

Each row contains clientId, clientName, period (payout month), scheduledAmount,
recordedAmount, remainingAmount, dueDate, nextScheduledDate, dueStatus and note.
`pendingPayouts` contains positive current-month balances. `upcomingPayouts`
contains next-month estimated balances and `upcomingPayoutPeriod` identifies that
period. `admin.payoutCalendarReady` and `adminAnalytics.payoutCalendarReady`
indicate verified calendar terms. `upcomingPayoutAmount` appears in both objects.
When ready, scheduledMonthlyPayout, paidMonthlyPayout and remainingMonthlyPayout
refer to the current cycle, not the old comparison of today's run-rate with this
month's payments. `payoutScheduleSource` is investment_calendar. The original
DASHBOARD monthlyPayout remains the current monthly run-rate, not an amount overdue.

Names and recurring payout days come from CLIENTS. Short months clamp a configured
day to month end. Missing, conflicting or out-of-period explicit dates remain
unavailable, not an invented default. No schedule/amount is supplied by the browser.

An omitted array means the deployed script does not support the details. Null
means source matching is incomplete. An empty array means no positive balance
remains according to the existing ledger calculation. Sub-paise floating residuals
do not become payable rows. Unconfirmed calendars do not publish partial totals.

The snapshot is not a bank settlement reconciliation. Current-month new funding
starts in the following calendar month's schedule, as in the verified workbook.
Schedules use explicit Investment_Master monthly ROI percentage points, funded
dates, maturity (when present), proportional recorded withdrawals as of the due
date and CLIENTS payout days. Generic annual/unspecified ROI is not converted.
Next-period prepayments count only with an explicit matching payout period;
future-dated payments never count. Overpayments never offset other clients.
No payment or withdrawal mutation is performed by this drill-down.

- `GET /api/system/health` public diagnostic with no secrets.
- `GET /api/admin/spreadsheet-schema` admin-only schema inspection.

Responses use:

```json
{
  "success": true,
  "message": "Operation completed",
  "data": {},
  "error": null,
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

Failures return `success: false` with a structured `error.code` and `error.details`.
