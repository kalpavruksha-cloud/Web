# Google Apps Script Integration

The configured Web App URL is:

`https://script.google.com/macros/s/AKfycbz4IMhPb_XqCFPBorxEBTgKsREaFOQaEmoKgBgedtIsfUHiXe4BbU91Yl6dy1P5oSMr/exec`

The latest local `Code.gs` includes `doGet`, `doPost`, `health`, `schema`, authentication, client portal actions, Drive uploads, and spreadsheet writes. If `/api/system/startup` reports `Script function not found: doPost`, the deployed Google Apps Script version is not this local file yet.

`Code.gs` is a complete replacement implementation for the existing spreadsheet. Review it, paste it into the existing Apps Script project bound to the provided spreadsheet, then deploy a new Web App version.

Do not create a new spreadsheet. Keep using:

`19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI`

## Deployment

1. Open the existing Apps Script project for the spreadsheet.
2. Replace or merge `Code.gs` after backing up the current script.
3. Set script property `SPREADSHEET_ID` to the existing spreadsheet ID, or use the embedded `SPREADSHEET_ID` constant already present in `Code.gs`.
4. Deploy as Web App.
5. Execute as the script owner.
6. Allow access from the backend hosting environment.
7. Update `APPS_SCRIPT_URL` in the backend environment if the deployment URL changes.
8. Approve the requested Spreadsheet and Drive permissions.
9. Verify `GET /api/system/health` and admin `GET /api/admin/spreadsheet-schema`.
