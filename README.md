# KALPAVRUKSHA PORTAL

A production-oriented wealth management client and admin portal for Kalpavruksha Wealth.

Architecture:

```text
React Frontend -> Express TypeScript Backend -> Google Apps Script Web App -> Existing Google Spreadsheet
```

The spreadsheet is the only master database. The browser never calls Apps Script directly.

## Quick Start

```bash
cp .env.example server/.env
npm install
npm run dev:server
npm run dev:client
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:8080/api`

Health check: `http://localhost:8080/api/system/health`

## Important Integration Status

The provided Apps Script deployment is reachable, but probing `action=health`, `action=schema`, and `action=getSettings` returned:

```json
{ "success": false, "error": "Invalid action" }
```

This repository includes a complete replacement Apps Script in `google-apps-script/Code.gs`, but it is not deployed automatically.
