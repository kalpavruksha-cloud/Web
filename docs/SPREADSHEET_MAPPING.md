# Spreadsheet Mapping

## Live Integration

- Spreadsheet ID: `19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI`
- Apps Script URL in local env: `https://script.google.com/macros/s/AKfycbz4IMhPb_XqCFPBorxEBTgKsREaFOQaEmoKgBgedtIsfUHiXe4BbU91Yl6dy1P5oSMr/exec`
- Backend remains the only browser-facing integration layer.

## CLIENTS Payout Date (V25)

The user reports adding `Date of payout` to CLIENTS. Direct connector access on
28 October 2026 returned permission denied, so live cell values are not yet verified
and have not been edited. No financial records or formulas are rewritten.

The mapper recognizes Date of payout / Payout Date / Scheduled Payout Date with
the existing case/space/underscore normalization. A full calendar date becomes
YYYY-MM-DD; a recurring day 1-31 (including `15th` or `15th of each month`) becomes
a day string. It is displayed as a recurring schedule, not an invented next date.
Blank/missing profile cells stay undefined; invalid or conflicting duplicate client
dates become null. Profile exposes payoutDate; transactions expose scheduledPayoutDate,
using an empty string for a matched client's unset schedule. An absent transaction
schedule is unavailable, not evidence that the client has no configured payout date.
Matching uses trimmed case-insensitive Client ID, without rewriting client codes.

This is a client's current schedule, not proof that a historical payout occurred.
The actual transaction Date and monthly payment-history chart dates are unchanged.
Client reads remain session-scoped. Transaction print/CSV include the separate
Scheduled Payout Date column. The dashboard reuses its request-local CLIENTS read;
no new API or database is introduced.

## Admin Chart Mapping (V24)

Withdrawal_Master is the user-confirmed tab name. Its exact live row-1 headers
have not been supplied/verified. Supported explicit date aliases: Payment Date,
Paid Date, Paid On, Withdrawal Date, Withdraw Date, Withdrawn Date, Date of
Withdrawal, Withdrawal Dt, Transaction Date, Date. Amount aliases: Amount,
Withdrawal Amount, Withdraw Amount, Withdrawn Amount, Withdrawal, Debit, Debit
Amount. Client-ID normalization remains unchanged. Missing columns are reported
in the admin source panel; unrelated fields are never inferred as money or dates.

V24 source priority is per client/month: usable completed/recorded master rows,
then completed withdrawal ledger rows, then paid portal requests. Sources within
the same client/month are not added. Dates and monetary amounts are normalized
before aggregation. Historical blank status stays recorded; Withdrawn is accepted.

Monthly Payout Report uses completed payout/interest transactions and signed
credit minus debit, not DASHBOARD's current Monthly Payout schedule. Explicit
Payout Amount, Interest Amount, Monthly Payout Amount, Payout or Interest can supply
the amount for a recognized payout type when generic Amount/Credit/Debit are absent.
Transaction Flow adds monthly credit, debit, net and count from the same completed
ledger. No new spreadsheet columns, sheets, formulas or write destinations.

## DASHBOARD Columns (V22)

V23 additionally sends admin-only per-client totals from Total Invested, Total
Withdrawal, Total Payout and Net Portfolio as `adminClientSummaries`, matched by
trimmed, case-insensitive Client ID. Missing amounts remain unavailable, not an
investment-table approximation. Client detail pages reuse this dashboard snapshot.

V23 client historical reads reuse Investment_Master, Transaction_Register and
Withdrawal_Master with the same alias priority and normalization as admin reads,
but filter by the signed-in client before mapping. Withdrawal history is read-only.
The one-year portfolio series contains 12 rolling monthly balances, including
opening records before the visible year, and never backfills unknown market values.

The user-provided screenshot on 21 October 2026 shows:

| Sheet header | API field | Use |
| --- | --- | --- |
| Present Investment (G) | `presentInvestment` | Current client investment. The displayed formula is `=B2-D2`, Total Invested minus Total Withdrawal. Supplies available balance and admin net investment when valid. |
| Monthly Payout (H) | `monthlyPayout` | Direct monetary monthly schedule, separate from historical Total Payout. Supplies the per-client admin scheduled amount before subtracting completed payments assigned to the current month. |

The H-column formula was not visible. The implementation reads the sheet's numeric
amounts; it does not calculate or assume a percentage. No formulas are written back.
Client responses include only that client's rows. Admin aggregates client rows and
excludes unlinked footer totals from these new fields. Any blank/error cell makes
the aggregate unavailable rather than returning a partial total; explicit zero is
valid. Missing columns stay absent for legacy compatibility. `Monthly Payout` is
the schedule, not the unpaid remainder or all-time payouts. The remainder remains
the sum of per-client max(schedule minus assigned completed payments, zero).

This mapping is grounded in the supplied screenshot and regression tests. Direct
Google Sheets access returned 403, so live formulas and all client totals still
require verification in an authorized admin session after deploying V22.

## Header Normalization

Header matching is case-insensitive and tolerant of spaces, underscores, and hyphens.

Examples that map to `clientId`:

- `Client ID`
- `CLIENT_ID`
- `clientId`
- `client_id`

## Existing Tabs Reused

These tabs are detected or supported by the current Apps Script mapper:

- `CLIENTS`
- `CLIENT_CREDENTIALS`
- `KYC`
- `BANK_DETAILS`
- `INVESTMENT_PLANS`
- `TRANSACTIONS`
- `DASHBOARD`
- `DOCUMENTS`
- `REFERRALS`
- `NOTIFICATIONS`
- `ACTIVITY_LOG`
- `PlatformSettings` / `Settings` / `PortalSettings`

## Client Portal Tabs Added When Missing

The Apps Script extension reuses compatible existing tabs first. If a required workflow tab is missing, it creates the sheet with the required headers before writing.

- `Investment Requests`
- `Agreements`
- `Bank Change Requests`
- `Support Requests`
- `FAQ`
- `Client Preferences`

## Required Client Workflow Columns

### Investment Requests

- `Request ID`
- `Client ID`
- `Client Name`
- `Plan ID`
- `Plan Name`
- `Amount`
- `Payment Mode`
- `Payment Reference`
- `Payment Date`
- `Payment Proof URL`
- `Request Date`
- `Status`
- `Admin Remarks`
- `Approved Investment ID`
- `Approved Date`

### Agreements

- `Agreement ID`
- `Client ID`
- `Investment ID`
- `Agreement Name`
- `Agreement Type`
- `Issue Date`
- `Effective Date`
- `Expiry Date`
- `Signing Status`
- `Document Status`
- `Drive URL`
- `Signed File ID`
- `Signed File URL`
- `Signed File Name`
- `Uploaded Date`
- `Admin Remarks`

### Documents

- `Document ID`
- `Client ID`
- `Document Name`
- `Category`
- `Description`
- `File Name`
- `File Type`
- `MIME Type`
- `File Size`
- `Google Drive File ID`
- `Google Drive URL`
- `Upload Date`
- `Verification Status`
- `Verified Date`
- `Admin Remarks`
- `Uploaded By`
- `Is Active`

### Bank Details And Change Requests

- `Client ID`
- `Account Holder Name`
- `Bank Name`
- `Account Number`
- `IFSC`
- `Branch`
- `Account Type`
- `UPI ID`
- `Cancelled Cheque URL`
- `Verification Status`
- `Admin Remarks`
- `Last Updated`

### Support Requests

- `Ticket ID`
- `Client ID`
- `Subject`
- `Category`
- `Priority`
- `Message`
- `Attachment URL`
- `Created Date`
- `Status`
- `Admin Response`
- `Updated Date`

### Client Preferences

- `Client ID`
- `Email Notifications`
- `SMS Notifications`
- `WhatsApp Notifications`
- `Preferred Language`
- `Updated Date`

## Google Drive Folder Structure

Uploaded files are stored in Drive, not in spreadsheet cells.

```text
Kalpavruksha Portal/
  Clients/
    {CLIENT_ID}/
      Profile/
      KYC/
      Agreements/
      Bank/
      Investment Proofs/
      Support/
      Other/
```

## Verification

Use an authenticated admin session to confirm the current production headers after redeploying Apps Script:

`GET /api/admin/spreadsheet-schema`

Use the public startup endpoint for connectivity:

`GET /api/system/startup`
