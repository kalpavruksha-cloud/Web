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
