# Troubleshooting Guide

Symptom → likely cause → resolution.

## 1. Local development

### Redirected to `/restricted-region`

**Cause:** the location guard resolved a country other than India, or a region other than Andhra
Pradesh/Telangana. It uses browser geolocation first, then `https://ipapi.co/json`.

**Resolve:**
1. Allow precise location in the browser and reload.
2. Use a network/VPN in an allowed region.
3. For local development only, temporarily bypass the guard (remove it from `app.routes.ts`), then
   **restore it before committing**.

### API calls fail with status 0

**Cause:** the backend CORS allow-list does not include the UI origin. It includes
`http://localhost:4200` but **not** `http://localhost:12000`.

**Resolve:**
1. Serve on port 4200 (`npm start`) to use an allowed origin, or
2. Ask the backend team to add `http://localhost:12000` and `http://127.0.0.1:12000`, or
3. Proxy the API through the dev server.

The offline overlay should **not** appear in this case: the connectivity probe reaches the API host,
so the app knows it is online.

### `ng test` fails

**Cause:** `angular.json` sets `"browsers": "ChromeHeadlessNoSandbox"` but there is no
`karma.conf.js` defining that launcher.

**Resolve:** add the `karma.conf.js` from [`unit-testing.md`](unit-testing.md), or change `browsers`
to `ChromeHeadless`.

### `npm run lint` fails

**Cause:** there is no ESLint configuration.

**Resolve:** add ESLint (`ng add @angular-eslint/schematics`) or remove the script until it exists.

### Charts do not render

**Cause:** CanvasJS is fetched from a CDN on first chart render; a blocked CDN or an ad-blocker
prevents it.

**Resolve:** allow the CDN, or self-host CanvasJS.

### Google button does not appear

**Cause:** `GET /auth/sso/token` returned an empty client id, or the Google script was blocked.

**Resolve:** configure the client id in the backend; allow `accounts.google.com`.

### Login succeeds but the app immediately redirects to login

**Cause:** the token was not stored (storage blocked) or the role is missing.

**Resolve:** allow storage for the origin; check the login response in the Network tab.

### Theme looks broken after a release

**Cause:** a theme code changed or `themes.css` was not rebuilt.

**Resolve:** clear `fw_theme` or pick the theme again; rebuild.

### Mobile nav icons are unreadable

**Cause:** a theme with a translucent `--nav-bg` did not override `--nav-panel-bg`.

**Resolve:** set `--nav-panel-bg` to a near-opaque colour and check `--nav-accent-fg` contrast.

## 2. Authentication and session

### "Signed in on another device" notice

**Cause:** the account has `concurrentLoginAllowed = false` and was signed in elsewhere.

**Resolve:** press "Sign out & sign in again", or turn single-session off on the account page.

### Repeated sign-outs

**Cause:** refresh failing (backend, clock skew, revoked token) or 403 responses.

**Resolve:** check the Network tab for `/auth/refresh`; confirm the backend accepts the refresh
token; check for 403s.

### MFA loop

**Cause:** the OTP page did not receive the email in navigation state, or the code expired.

**Resolve:** restart from `/login`; request a new code.

### Reset link does nothing

**Cause:** the link lacks `token`/`email`, or the token expired.

**Resolve:** request a new reset email; confirm the link format
`/reset-password?token=…&email=…`.

## 3. Features

### Event save fails with a media file

**Cause:** the file exceeds the limit or the type is unsupported.

**Resolve:** check the message; image ≤ 5 MB, video ≤ 50 MB, audio ≤ 10 MB, PDF ≤ 20 MB. SVG is not
supported.

### Event save fails without media

**Cause:** missing required fields or an invalid wishes link.

**Resolve:** check the field errors; the wishes link must be absolute `http(s)`.

### Calendar empty for a future year

**Cause:** festivals are stored per year and the backend may not have synced that year.

**Resolve:** confirm the backend sync; birthdays and anniversaries should still appear.

### Festival shows as "past"

**Cause:** timing is computed relative to the next occurrence. If it still shows past, the festival
date is invalid.

**Resolve:** check the festival record.

### Cannot message someone

**Cause:** circle-only chat is enabled and the person is not in the circle, or the account is
inactive.

**Resolve:** add them from Family & Friends; the composer explains the reason.

### Chat does not update live

**Cause:** the WebSocket failed to connect (blocked, wrong host, backend down).

**Resolve:** check the console and Network → WS; confirm `wss://<api-host>/ws-chat/websocket`;
refresh to load messages over REST.

### Email image does not load

**Cause:** the image endpoint failed or the record has no image.

**Resolve:** use the retry action; confirm `hasImage`.

### Cannot publish a notification

**Cause:** the schedule start is in the past.

**Resolve:** edit the schedule to a future window, then publish.

### Cannot edit or delete a notification

**Cause:** it is published.

**Resolve:** unpublish first.

### Impersonation does not hide admin menus

**Cause:** the impersonation state was lost (`sessionStorage` cleared) or the role is still admin.

**Resolve:** return to admin and impersonate again; check `fw_impersonation`.

## 4. Deployment

### Deep link returns 404

**Cause:** the host is not rewriting unknown paths to `index.html`.

**Resolve:** configure the SPA fallback (Firebase does this by default; verify after config changes).

### Old version after deploy

**Cause:** the HTML is cached for up to one hour.

**Resolve:** hard refresh; or roll back/redeploy to refresh the CDN.

### API errors only in production

**Cause:** `environment.prod.ts` still contains the placeholder API URL, or CORS does not allow the
production origin.

**Resolve:** set the real URL; update the backend allow-list.

### Blank page after deploy

**Cause:** the wrong directory was deployed, or the base href is wrong.

**Resolve:** deploy `dist/family-wishes-ui/browser`; keep `<base href="/">`.

## 5. Quick diagnostic table

| Symptom | First check |
| --- | --- |
| Redirected to restricted region | Geolocation / IP region |
| Status 0 on every API call | CORS allow-list |
| Offline overlay appears | Backend reachability, then the probe |
| Overlay appears but the API works | A third-party host blocked? Check the probe URL |
| Signed out repeatedly | `/auth/refresh` responses |
| Empty lists | Backend response shape, permissions |
| Images missing | Image endpoint, CDN, object URLs |
| Charts blank | CanvasJS script |
| Icons missing | Font Awesome CDN |
| Styling broken | MDB CDN |
