# Kalpavruksha Mobile App and PWA

Kalpavruksha Wealth Portal is one unified platform. The desktop portal, mobile browser, installed PWA, and future Capacitor Android app use the same React client, Express backend, Google Apps Script, and Google Spreadsheet.

## Architecture

```text
Desktop Web Portal
Mobile Browser
Installed Android PWA
Future iOS PWA
Future Capacitor Android App
        |
        v
Express Backend /api
        |
        v
Google Apps Script Web App
        |
        v
Google Spreadsheet
```

Google Spreadsheet remains the only business database. The service worker never caches `/api` responses, investments, transactions, withdrawals, profiles, KYC, documents, referrals, notifications, or reports.

## PWA Configuration

- Manifest: `client/public/manifest.webmanifest`
- Service worker: `client/public/sw.js`
- Offline page: `client/public/offline.html`
- App icons: `client/public/icons/`
- Registration: `client/src/pwa/registerServiceWorker.ts`
- Install/update/sync UI: `client/src/pwa/PwaStatus.tsx`
- Launch screen: `client/src/pwa/LaunchScreen.tsx`
- Capacitor source assets: `resources/`

## Branded Icon Assets

The icon set is generated from the official logo at:

```text
client/src/assets/kalpav-logo.png
```

Generated PWA icons:

- `icon-48x48.png`
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `apple-touch-icon.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`
- `icon-maskable-192x192.png`
- `icon-maskable-512x512.png`
- `favicon.ico`
- `favicon-16x16.png`
- `favicon-32x32.png`

Capacitor-ready source assets:

- `resources/icon.png`
- `resources/adaptive-icon-foreground.png`
- `resources/adaptive-icon-background.png`
- `resources/splash.png`

## Launch Screen

The in-app launch screen appears during a fresh app/browser start while the existing session check completes. It is not replayed during normal route changes.

Behavior:

- Minimum visible duration is approximately 1.5 seconds.
- If authentication/session loading takes longer, the launch screen stays visible with a subtle loader.
- Authenticated users entering `/`, `/login`, or `/admin-login` are moved to the correct dashboard after session readiness.
- Logged-out users continue to the existing login page.
- Reduced-motion users receive a simple, shorter fade.

## Synchronization

- TanStack Query refetches live reads in the background.
- Dashboard queries refresh more frequently than ordinary records.
- Queries refetch on browser focus and reconnect.
- Mutations invalidate affected resource caches and dashboard summaries.
- Pull-to-refresh invalidates active queries on mobile.
- Offline mode shows sync status and last synced time.
- Writes are not stored offline because the spreadsheet is the single source of truth.

## Mobile Installation

1. Deploy the portal to HTTPS through Vercel.
2. Open the production URL on Android Chrome.
3. Use the in-app `Install Kalpavruksha App` banner or Chrome menu `Install app`.
4. The app opens in standalone mode from the phone home screen.

To see a changed PWA icon after deployment, remove the old installed app first:

1. Long-press the old Kalpavruksha app icon.
2. Remove/uninstall it from the device.
3. Open the production URL in Chrome or Safari.
4. Install/Add to Home Screen again.

Installation URL:

```text
https://<your-vercel-domain>/
```

Replace the placeholder with the active production Vercel or custom domain.

## Capacitor Readiness

The project includes `capacitor.config.json` and uses `client/dist` as the web build output. Capacitor should wrap the same Vite build; do not create a separate mobile UI.

Recommended future commands after approving Capacitor dependencies:

```bash
npm install --save-dev @capacitor/cli
npm install @capacitor/core @capacitor/android
npm run build --workspace client
npx cap add android
npx cap sync android
npx cap open android
```

Android Studio can then generate:

- Debug APK
- Release APK
- Release AAB for Google Play

## Google Play Readiness

Before Play Store release:

- Confirm production domain and HTTPS.
- Confirm production `VITE_API_BASE_URL` points to the same backend `/api`.
- Confirm Vercel environment variables are configured.
- Replace temporary app icons with final Play Store icon assets if required.
- Generate a signed AAB in Android Studio.
- Complete Play Console app content, privacy policy, data safety, and financial-service declarations.

## Manual Verification

1. Open desktop portal and installed PWA simultaneously.
2. Login as the same client on both.
3. Update profile from one interface and confirm refresh on the other.
4. Create withdrawal from mobile and confirm admin web sees it.
5. Approve/reject withdrawal from admin web and confirm client mobile refreshes.
6. Add/edit investment or transaction from admin web and confirm dashboard values refresh.
7. Toggle airplane mode and confirm offline status appears.
8. Restore internet and confirm sync status clears and data refetches.
9. Deploy a new build and confirm the update banner appears.
