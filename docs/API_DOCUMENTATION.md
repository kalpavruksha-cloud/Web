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
  Client responses remain scoped to the existing client request history.

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

## Dashboard Columns (V22)

The existing dashboard responses additionally expose `presentInvestment` and
`monthlyPayout` from matching DASHBOARD columns. They are numbers, null when
present but invalid/incomplete, and omitted on legacy sheets without these
columns. Admin values sum client rows; client values remain scoped. The admin
schedule prefers DASHBOARD Monthly Payout; the unpaid balance is still returned
separately as `admin.remainingMonthlyPayout`. No additional endpoint is needed.

## Diagnostics

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
