# Deployment

## Current Production Integration

- Apps Script URL: `https://script.google.com/macros/s/AKfycbz4IMhPb_XqCFPBorxEBTgKsREaFOQaEmoKgBgedtIsfUHiXe4BbU91Yl6dy1P5oSMr/exec`
- Spreadsheet ID: `19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI`
- Frontend local URL: `http://localhost:5173`
- Backend local URL: `http://localhost:8080/api`

## GitHub Preparation

Do not commit real environment files. The repository is configured to ignore:

- `.env`
- `server/.env`
- `client/.env`
- build output and dependency folders

Commit only the safe templates:

- `.env.example`
- `server/.env.example`
- `client/.env.example`
- `client/.env.production.example`

First GitHub publish:

```bash
git add .
git commit -m "Prepare Kalpavruksha Portal for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/YOUR_REPO.git
git push -u origin main
```

## Local Verification

```bash
npm install
npm run typecheck
npm run build
npm run lint
npm run test
npm run dev
```

Open:

- `http://localhost:5173`
- `http://localhost:8080/api/system/health`
- `http://localhost:8080/api/system/startup`

## Backend Hosting

Deploy the Express backend to Render, Railway, or another Node.js host.

Build command:

```bash
npm install
npm run build --workspace server
```

Start command:

```bash
npm run start --workspace server
```

Backend environment variables:

```env
NODE_ENV=production
PORT=8080
CLIENT_URL=https://your-vercel-domain.vercel.app
APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbz4IMhPb_XqCFPBorxEBTgKsREaFOQaEmoKgBgedtIsfUHiXe4BbU91Yl6dy1P5oSMr/exec
SPREADSHEET_ID=19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI
JWT_SECRET=generate_a_new_secure_32_plus_character_secret
JWT_EXPIRES_IN=8h
CORS_ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
APPS_SCRIPT_TIMEOUT_MS=15000
LOG_LEVEL=info
SUPPORT_EMAIL=support@kalpavrukshawealth.com
SUPPORT_PHONE=+91 00000 00000
SUPPORT_WHATSAPP_URL=https://wa.me/910000000000
```

After deployment, verify:

- `https://your-backend-domain/api/system/health`
- `https://your-backend-domain/api/system/startup`

## Frontend Hosting on Vercel

Import the GitHub repository into Vercel.

Recommended Vercel project settings:

- Framework preset: Vite
- Root directory: repository root
- Install command: `npm install`
- Build command: `npm run build --workspace client`
- Output directory: `client/dist`

The root `vercel.json` already contains these values and SPA route rewrites.

Frontend environment variable:

```env
VITE_API_BASE_URL=https://your-backend-domain/api
```

Do not add `APPS_SCRIPT_URL`, `SPREADSHEET_ID`, or `JWT_SECRET` to Vercel frontend variables.

## Custom Domain

When the domain is confirmed, add it in Vercel:

```text
portal.kalpavrukshawealth.com
```

Then update backend environment variables:

```env
CLIENT_URL=https://portal.kalpavrukshawealth.com
CORS_ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app,https://portal.kalpavrukshawealth.com
```

Redeploy the backend after changing CORS.

## Apps Script

The existing deployment is already active. Redeploy only when `google-apps-script/Code.gs` changes.

When redeploying:

1. Open the existing Apps Script project.
2. Paste the latest `google-apps-script/Code.gs`.
3. Confirm the spreadsheet ID is `19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI`.
4. Deploy as Web App.
5. Execute as: Me.
6. Access: Anyone or the backend-access option supported by the deployment.
7. Update backend `APPS_SCRIPT_URL` if Google issues a new Web App URL.

## Production Verification

1. Open backend `/api/system/health`.
2. Open backend `/api/system/startup`.
3. Confirm Apps Script and spreadsheet connectivity.
4. Sign in as admin and verify Admin Dashboard.
5. Sign in as client and verify Client Portal.
6. Confirm client routes do not show admin layout.
7. Confirm admin routes do not show client layout.
8. Upload a profile photo and document metadata.
9. Test withdrawals, transactions, referrals, notifications, and reports.
10. Test mobile and desktop layouts on the Vercel domain.
