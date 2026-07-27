# Startup

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Network access to Google Apps Script

## Install

```bash
npm install
```

## Local Environment

Local development uses generated files that are intentionally ignored by Git:

- `.env`
- `server/.env`
- `client/.env`

Safe templates are committed:

- `.env.example`
- `server/.env.example`
- `client/.env.example`
- `client/.env.production.example`

Required backend values:

```env
NODE_ENV=development
PORT=8080
CLIENT_URL=http://localhost:5173
APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbz4IMhPb_XqCFPBorxEBTgKsREaFOQaEmoKgBgedtIsfUHiXe4BbU91Yl6dy1P5oSMr/exec
SPREADSHEET_ID=19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI
JWT_SECRET=replace_with_a_secure_random_32_plus_character_secret
JWT_EXPIRES_IN=8h
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
APPS_SCRIPT_TIMEOUT_MS=15000
LOG_LEVEL=info
SUPPORT_EMAIL=support@kalpavrukshawealth.com
SUPPORT_PHONE=+91 00000 00000
SUPPORT_WHATSAPP_URL=https://wa.me/910000000000
```

Required frontend value:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

## Start

```bash
npm run dev
```

This starts both:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080/api`

## Health Checks

```bash
npm run startup:health
```

Expected URLs:

- `http://localhost:5173`
- `http://localhost:8080/api/system/health`
- `http://localhost:8080/api/system/startup`

## Build

```bash
npm run build
```

## Troubleshooting

- `Invalid environment configuration`: confirm `.env` and `server/.env` exist locally.
- Port `8080` already in use: stop the existing backend process or change `PORT`.
- Port `5173` already in use: stop the existing frontend process or change the Vite port.
- Apps Script shows `Invalid action`: deploy `google-apps-script/Code.gs` to the existing Apps Script Web App.
- Spreadsheet not verified: deploy the Apps Script replacement, then open `/api/system/startup`.
- Login fails: confirm the spreadsheet has a credentials tab and the Apps Script `login` action is deployed.
- For GitHub, commit `.env.example` files only. Never commit `.env`, `server/.env`, or `client/.env`.
