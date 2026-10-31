# Testing Checklist

## Password Persistence (V30)

- Client Settings sends current/new/confirmation values only through the backend.
- Only a client session may change its own password; admin/other-client/body role
  overrides are rejected in Express and Vercel.
- Confirmed save updates the existing CLIENT_CREDENTIALS Password and
  LastPasswordChange cells. New password works through Client ID and email; the
  old password fails after logout. Another client's credential stays unchanged.
- Incorrect current password, mismatched confirmation, unchanged password,
  leading/trailing-space passwords, and invalid lengths do not write anything.
- Canonical Password and legacy aliases use the same policy for login/change.
  Duplicate credentials fail closed; a blank canonical credential never falls
  back to an old CLIENTS password. No bulk reset or profile password column added.
- Leading zeros/special characters remain literal text, not spreadsheet formulas.
- Password mutations use POST, no URL secrets, no-store and no automatic retries.
- Failed persistence or old unconfirmed deployment response does not show success.
  UI displays the error and does not clear the fields as if the save succeeded.
- Passwords are absent from API response/audit/log payloads. No real customer
  password is read, changed or shared merely to run automated tests.
- Existing JWT sessions remain unchanged. Live owner-approved password testing
  requires deploying V30; unit/API/UI synthetic tests do not prove a live save.

## KYC Review (V29)

Automated regression tests use synthetic in-memory records only. Complete the
live checks below after the owner deploys V29 and configures its signing property;
never approve a real client simply to smoke-test software.

- Client Profile shows PAN/Aadhaar inputs; Aadhaar is masked and saved full Aadhaar
  is absent from client API responses. Existing Aadhaar is retained on PAN-only edits.
- Invalid PAN/Aadhaar formats fail before writes. Submission becomes under_review,
  not verified. Verified numbers cannot be changed until an admin reopens KYC.
- Admin Clients > View / Review KYC shows the same client's KYC record. Review
  requires owned active PAN/Aadhaar documents, a review checkbox and confirmation.
- Only after authorized manual document comparison: Verify writes KYC status,
  actor/date/evidence and selected document statuses. List/profile/dashboard agree.
- Reject/reopen requires remarks. Evidence/number changes reopen the review.
- Stale revisions return 409 without overwriting a newer decision. Background
  refresh disables stale edits/reviews until reload.
- Client cannot use admin read/review APIs, override role/client ID, approve itself
  or read another client's KYC. Both Express and Vercel enforce these checks.
- Unsigned/tampered/expired Apps Script requests fail without reads/writes.
- Missing signing setup/old deployment shows a safe error; no fake empty KYC
  record, silent approval or auth bypass is used as a fallback.
- KYC requests use no-store, never service-worker/LocalStorage persistence; logout
  during a write does not recreate identity data in the query cache.
- Phone/tablet/desktop/dark mode: fields, evidence selects, focus and confirmation
  remain usable. Existing login, financial data and document upload still work.

## Existing Portal Regression

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
