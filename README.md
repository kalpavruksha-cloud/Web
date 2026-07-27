# KALPAVRUKSHA PORTAL

A production-oriented wealth management client and admin portal for Kalpavruksha Wealth.

Architecture:

```text
React Frontend -> Express TypeScript Backend -> Google Apps Script Web App -> Existing Google Spreadsheet
```

The spreadsheet is the only master database. The browser never calls Apps Script directly.

## Quick Start

```bash
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:8080/api`

Health check: `http://localhost:8080/api/system/health`

Startup health: `http://localhost:8080/api/system/startup`

## Deployment

This repository is ready for:

- Frontend and backend API: Vercel, using `vercel.json`
- Optional separate backend: Render, Railway, or another Node.js host
- Database: existing Google Spreadsheet through the deployed Google Apps Script Web App

Do not commit real `.env` files. Use `.env.example`, `server/.env.example`, and `client/.env.production.example` as templates.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for GitHub, Vercel, backend, CORS, and custom-domain steps.
