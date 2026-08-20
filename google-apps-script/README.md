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

## Drive Upload Authorization

Document upload requires Google Drive permission because files are saved in Drive before their metadata is written to the `DOCUMENTS` sheet.

If upload fails with `You do not have permission to call DriveApp.getRootFolder`, do this in the Apps Script editor:

1. Open **Project Settings**.
2. Enable **Show "appsscript.json" manifest file in editor**.
3. Open `appsscript.json`.
4. Replace it with the local `google-apps-script/appsscript.json`.
5. Open `Code.gs` and replace it with the latest local `google-apps-script/Code.gs`.
6. In the function selector, run `driveAuthorizationTest`.
7. Approve the Google permissions, including Drive.
8. Deploy a new Web App version with **Execute as: Me**.
9. Test:

`https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=driveAuthorizationTest`

The result must include:

`"driveApp":"authorized"`
