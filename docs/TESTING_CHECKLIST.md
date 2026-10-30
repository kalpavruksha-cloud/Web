# Testing Checklist

- Client login with valid spreadsheet credentials.
- The same activated client logs in by its unique CLIENTS email and Client ID,
  with identical identity and role; an email does not accept a different client's password.
- Duplicate emails/Client IDs fail closed, missing email-ID links produce an error,
  and pending/inactive accounts remain restricted through email login.
- New registration preserves Client ID under trimmed/normalized sheet headers,
  initializes Present Investment and Monthly Payout and inherits existing financial
  formulas in its new DASHBOARD row without rewriting existing rows.
- Admin login with valid spreadsheet credentials.
- Invalid login shows a clear error.
- Inactive account shows account inactive.
- Client dashboard loads all financial values from backend-normalized API data.
- Profile update submits only allowed editable fields.
- Investment list, details, filters, and statement print view.
- Transaction list sorted newest first with search and print/download flow.
- Withdrawal creation blocks invalid amounts and writes to spreadsheet.
- Admin withdrawal approve, reject, and paid actions update spreadsheet.
- Document display opens Google Drive URLs.
- Referral earnings use reward rows, not referral count.
- Notification read and read-all state update spreadsheet.
- Reports render printable summaries.
- Admin Dashboard and Reports both display the source Present Investment and
  Monthly Payout, including valid zero amounts. Blank/invalid/missing values stay
  unavailable and do not silently become zero or partial totals.
- Logout clears the session cookie.
- Mobile navigation, tablet layout, desktop sidebar, and dark mode.
- Keyboard focus is visible on links, controls, and forms.
- Apps Script unavailable state.
- Missing spreadsheet tab/column state.
- Request timeout state.
