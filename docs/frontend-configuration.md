# Frontend Configuration

## 1. Configuration surface

The client has very little runtime configuration. Everything is compiled in through environment
files, except the Google client id which is fetched at runtime.

| Setting | Where | Consumed by |
| --- | --- | --- |
| `apiUrl` | `src/environments/environment.ts` / `environment.prod.ts` | `ApiService`, `AuthService`, `ChatService`, `CircleService`, `NotificationRealtimeService`, `ConnectivityService` |
| `production` | both environment files | Angular build optimisations |
| `googleClientId` | `environment.prod.ts` (declared) | Not used directly; the login page fetches the id from `GET /auth/sso/token` |
| Angular budgets | `angular.json` | Build |
| Output hashing | `angular.json` production config | Build |
| Hosting headers | `firebase.json` | Firebase Hosting |
| Test browser | `angular.json` `test.options.browsers` | Karma |

## 2. Environment files

`src/environments/environment.ts` (development):

```ts
export const environment = {
  production: false,
  apiUrl: 'https://eventmanagement-backend-m9qy.onrender.com/api'
};
```

`src/environments/environment.prod.ts` (production):

```ts
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-domain/api',
  googleClientId: ''
};
```

**Before a production release, `apiUrl` must be set to the real backend.** The current value is a
placeholder. `googleClientId` is declared but unused; the client id comes from the backend.

## 3. How the API URL is used

| Consumer | Derivation |
| --- | --- |
| REST calls | `${environment.apiUrl}/<path>` |
| WebSocket (chat, notifications) | `environment.apiUrl` with `http`→`ws` and a trailing `/api` removed, plus `/ws-chat/websocket` |
| Connectivity probe | The API **origin** only, as a `no-cors` `HEAD` (10 s heartbeat, 8 s timeout) |
| CORS decision on the backend | Must allow the UI origin (not the API origin) |

Example: `https://api.example.com/api` → WebSocket `wss://api.example.com/ws-chat/websocket`,
probe `https://api.example.com/?_=<ts>`.

## 4. Build configurations

| Configuration | Command | Optimisation | Source maps | Output hashing |
| --- | --- | --- | --- | --- |
| Production (default) | `npx ng build` | Yes | No | All |
| Development | `npx ng build --configuration development` | No | Yes | No |
| Serve (dev) | `npx ng serve` | No | Yes | No |

`angular.json` sets `defaultConfiguration: "production"` for `build`, so `npm run build` in CI
produces a production bundle.

## 5. Angular budgets

| Budget | Warning | Error |
| --- | --- | --- |
| Initial bundle | 2 MB | 4 MB |

Exceeding the error budget fails the build; exceeding the warning prints a warning. Any new
dependency that inflates the initial bundle must be lazy-loaded.

## 6. Browser support

| Browser | Supported |
| --- | --- |
| Chrome / Edge | Last two major versions |
| Firefox | Last two major versions |
| Safari (macOS/iOS) | Last two major versions |
| Internet Explorer | Not supported |

Required platform features: ES2022, `fetch`, `AbortController`, `Intl.DateTimeFormat`,
`URL`, WebSocket, `localStorage`/`sessionStorage`, `requestIdleCallback` (with a fallback).

## 7. Storage keys (configuration-adjacent)

| Key | Purpose |
| --- | --- |
| `fw_access_token`, `fw_refresh_token`, `fw_role` | Session |
| `fw_theme` | Active theme |
| `fw_impersonation` | Impersonated user |
| `fw_sso_token` | Cached Google client id |
| `fw_wish_preview_seen_token` | Wish preview shown for this token |
| `fw_published_notification_dismissed_id` | Dismissed banner |
| `fw_calendar_view`, `fw_calendar_kinds` | Calendar preferences |

Changing a key name is a breaking change for existing sessions; document it in the changelog.

## 8. Third-party URLs

| Purpose | URL |
| --- | --- |
| Google Identity | `https://accounts.google.com/gsi/client` |
| IP geolocation | `https://ipapi.co/json` |
| Font Awesome | `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css` |
| MDB CSS | `https://cdnjs.cloudflare.com/ajax/libs/mdb-ui-kit/8.2.0/mdb.min.css` |
| MDB JS | `https://cdnjs.cloudflare.com/ajax/libs/mdb-ui-kit/8.2.0/mdb.umd.min.js` |
| Google Fonts | `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap` |
| CanvasJS | Injected by `canvasjs-line-chart.component.ts` |
| Google Maps | `https://www.google.com/maps?q=<lat>,<lng>` |

Preconnects are declared in `index.html` for `fonts.googleapis.com`, `fonts.gstatic.com`,
`cdnjs.cloudflare.com` and `ipapi.co`.

## 9. Static assets

| File | Purpose |
| --- | --- |
| `public/favicon.svg` | Favicon |
| `public/robots.txt` | Crawler policy |
| `public/sitemap.xml` | Sitemap |

These are copied to the site root by the build (`angular.json` assets).

## 10. Metadata

`src/index.html`:

| Tag | Value |
| --- | --- |
| `<title>` | Golden Greetings \| Event Planning & Celebration Management |
| `description` | "Golden Greetings helps families plan events, manage celebrations, and coordinate memorable moments." |
| `theme-color` | `#1e3a8a` |
| `viewport` | `width=device-width, initial-scale=1` |
| `lang` | `en` |

## 11. Changing configuration safely

1. Edit the environment file, not the services.
2. Keep both environment files in sync for any new key.
3. Never put secrets in `environment*.ts`; the bundle is public.
4. Rebuild and redeploy; there is no runtime configuration endpoint.
5. Verify the WebSocket URL derivation still matches the API host.
6. Confirm the backend CORS allow-list includes the new UI origin.

## 12. Missing configuration (recommended additions)

| Setting | Why |
| --- | --- |
| `appVersion` | Show the release in the footer and error reports |
| `sentryDsn` | Client error reporting |
| `featureFlags` | Disable risky features without a deploy |
| `supportEmail` | A "contact support" link on error screens |
| `requestTimeoutMs` | Bound hung requests |
