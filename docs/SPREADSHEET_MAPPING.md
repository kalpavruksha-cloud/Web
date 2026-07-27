# Spreadsheet Mapping

## Live Integration

- Spreadsheet ID: `19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI`
- Apps Script URL in local env: `https://script.google.com/macros/s/AKfycbz4IMhPb_XqCFPBorxEBTgKsREaFOQaEmoKgBgedtIsfUHiXe4BbU91Yl6dy1P5oSMr/exec`
- Backend remains the only browser-facing integration layer.

## Header Matching

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
