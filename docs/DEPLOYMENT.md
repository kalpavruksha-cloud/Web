# Deployment

## Current Production Integration

- Apps Script URL: `https://script.google.com/macros/s/AKfycbz4IMhPb_XqCFPBorxEBTgKsREaFOQaEmoKgBgedtIsfUHiXe4BbU91Yl6dy1P5oSMr/exec`
- Spreadsheet ID: `19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI`
- Frontend local URL: `http://localhost:5173`
- Backend local URL: `http://localhost:8080/api`

## GitHub Preparation

Do not commit real environment files. The repository ignores:

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
git commit -m "Fix Vercel backend API deployment"
git push -u origin main
```

## Full Vercel Hosting

The frontend and Express backend now run together on Vercel:

- React app: `client/dist`
- Vercel API: `api/index.js`
- Browser API base URL: `/api`

Vercel project settings:

- Framework preset: Vite
- Root directory: repository root
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `client/dist`

The root `vercel.json` contains these settings and React SPA rewrites.

Set these Vercel environment variables:

```env
NODE_ENV=production
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
VITE_API_BASE_URL=/api
```

`JWT_SECRET` must be set in the same Vercel environment as the deployment you are testing. If testing a preview deployment URL, set it for Preview too, then redeploy.

Do not set `VITE_API_BASE_URL` to `http://localhost:8080/api` in Vercel.

After deployment, verify:

- `https://your-vercel-domain.vercel.app/api/system/health`
- `https://your-vercel-domain.vercel.app/api/system/startup`

## Custom Domain

When the domain is confirmed, add it in Vercel:

```text
portal.kalpavrukshawealth.com
```

Then update Vercel environment variables:

```env
CLIENT_URL=https://portal.kalpavrukshawealth.com
CORS_ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app,https://portal.kalpavrukshawealth.com
VITE_API_BASE_URL=/api
```

Redeploy after changing the environment variables.

## Separate Backend Alternative

If the backend is hosted separately on Render or Railway:

```bash
npm install
npm run build --workspace server
npm run start --workspace server
```

Then set Vercel frontend:

```env
VITE_API_BASE_URL=https://your-backend-domain/api
```

## Apps Script

Redeploy only when `google-apps-script/Code.gs` changes.

When redeploying:

1. Open the existing Apps Script project.
2. Paste the latest `google-apps-script/Code.gs`.
3. Confirm the spreadsheet ID is `19q6x5HPTrgcbH18wg2I1VoCrUdKLW98MFiQPO0ErPbI`.
4. Deploy as Web App.
5. Execute as: Me.
6. Access: Anyone or the backend-access option supported by the deployment.
7. Update `APPS_SCRIPT_URL` in Vercel if Google issues a new Web App URL.

## Production Verification

1. Open `/api/system/health` on the Vercel domain.
2. Open `/api/system/startup` on the Vercel domain.
3. Confirm Apps Script and spreadsheet connectivity.
4. Sign in as admin and verify Admin Dashboard.
5. Sign in as client and verify Client Portal.
6. Confirm client routes do not show admin layout.
7. Confirm admin routes do not show client layout.
8. Test profile photo upload and document upload.
9. Test withdrawals, transactions, referrals, notifications, and reports.
10. Test mobile and desktop layouts on the Vercel domain.
