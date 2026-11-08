# AGENTS.md

Repository notes for automated agents working on the EventManagement UI (Angular 17).

## Commands

- Install: `npm install`
- Dev server: `npx ng serve --host 0.0.0.0 --port 12000 --allowed-hosts all`
- Build: `npx ng build`
- Backend API base URL: `src/environments/environment.ts` (`environment.apiUrl`)

## Theming

- Themes are driven by a `data-theme` attribute on `<html>`; `src/themes.css` maps each theme code
  to design tokens. `src/styles.css` holds the `:root` tokens (the `default` look).
- `ThemeService` (`src/app/core/services/theme.service.ts`) loads the catalog and the signed-in
  user's preference, and falls back to a built-in catalog if the API is unavailable.
- Theme codes must stay in sync with the backend `UITheme` enum (see the backend repo).
- The mobile slide-down menu uses `--nav-panel-bg` / `--nav-panel-blur`, not `--nav-bg`. Themes
  whose `--nav-bg` is translucent (glassmorphism, liquid-glass, spatial-ui) must override
  `--nav-panel-bg` with a near-opaque colour, otherwise page content shows through behind the nav
  icons and they become unreadable.
- Active/hover nav icons paint `--nav-accent-fg` on a solid `--nav-accent` chip. Pick the glyph
  colour that contrasts with each theme's `--nav-accent` (dark glyphs for light accents such as
  maximalism/brutalism/claymorphism/bento-grid, white glyphs for the darker accents such as
  minimalism/glassmorphism/neomorphism).

## Media uploads

- Wish/event/festival uploads accept any supported media, not only images: image (PNG, JPEG, GIF,
  WebP, BMP, 5 MB), video (50 MB), audio (10 MB) and PDF (20 MB). The rules live in
  `src/app/core/utils/media.ts` and mirror the backend `MediaValidation`. Profile pictures stay
  image-only.
- Validate on the client first (`mediaError`; `imageError` where only an image is accepted, such as
  the profile picture) so a bad file is explained before it is sent, and use `MEDIA_ACCEPT` (or
  `IMAGE_ACCEPT`) for the file input's `accept` attribute and `MEDIA_HINT`/`IMAGE_HINT` for the help
  text. `accept` lists the exact accepted MIME types, so an unsupported `image/*` subtype such as
  SVG is never offered.
- A stored file's kind is worked out from its URL/extension with `previewKindFor`; use
  `MediaPreviewKind` to pick the right `<img>`/`<video>`/`<audio>`/`<iframe>` (or an icon when there
  is no inline preview). Chat attachments may be any file, so they fall back to a download chip.

## Circles (family & friends)

- A circle is a mutual, accepted link between two users. `CircleService`
  (`src/app/core/services/circle.service.ts`) talks to `/api/circles`: `GET` returns `circles`,
  `incomingRequests` and `outgoingRequests`; `POST /requests` sends a request (sending to someone
  who already asked accepts instead); `POST /requests/accept|reject` and `DELETE` act on a
  `circleId`. The UI is `features/circles`.
- Chat can be restricted to accepted circle members by the backend (`app.chat.circles-only`,
  default off). The chat widget enforces this on the client too: `CircleService.list()` feeds
  `circleUserIds`, and only accepted members appear in the new-chat picker and the conversation
  list. A conversation with anyone outside the circle stays read-only, and each member row/thread
  header offers "remove from circle" (same `DELETE /api/circles`). For server-side enforcement the
  backend flag must be on (`APP_CHAT_CIRCLES_ONLY=true`).

## Concurrent login

- `User.concurrentLoginAllowed` (default `true`) gates single-session sign-in. Admins set it in the
  user editor; a user sets their own on the account page (`PATCH /api/users/me/concurrent-login`,
  admin/self: `PATCH /api/users/{id}/concurrent-login`). When false, a new sign-in revokes the
  user's earlier refresh tokens and mints a fresh session id.
- A request from a superseded session is rejected by the backend with 401 and a body message
  beginning `CONCURRENT_LOGIN`. `auth.interceptor.ts` detects that marker (`isConcurrentLoginError`)
  before attempting a token refresh — refreshing would only fail again — and calls
  `AuthService.flagConcurrentLogin`. That drops the stored tokens and sets
  `AuthService.concurrentLoginNotice`, which raises `ConcurrentLoginOverlayComponent`, a full-screen
  notice whose only action is to sign out and sign in again. The user is deliberately not navigated
  away, so the reason is not missed.

## Offline handling

- `ConnectivityService` decides whether the backend is reachable. It starts from `navigator.onLine`,
  follows the `online`/`offline` events, and also probes the API host on a heartbeat. The heartbeat
  is required: the browser does not fire `offline` when the link is up but the uplink is dead, and an
  idle app makes no request that could fail. `navigator.onLine` alone never detects that case.
- The probe is a `no-cors` `HEAD` to the API origin, so any HTTP response (even 403) counts as
  reachable. A same-origin probe would wrongly report "online" when the backend is down, and would
  always succeed on a local dev server. A single failed heartbeat is treated as a blip; two in a row
  mark the app offline.
- The HTTP interceptor calls `reportRequestFailure()` on a status `0` response to a backend URL. It
  does not mark offline directly, because status `0` is ambiguous: it also covers a CORS rejection.
  The probe disambiguates. Non-backend URLs (e.g. `ipapi.co`) are ignored so a blocked third-party
  request never shows the offline screen.
- `OfflineOverlayComponent` renders a full-screen notice, then a short "You're back online" state
  that auto-dismisses so the user stays on the same route. It owns no polling; the service does.
- To test offline locally, note that the backend CORS allow-list does not include
  `localhost:12000`/`127.0.0.1:12000` (it does include `localhost:4200`), so API calls fail with
  status 0 there. That is a CORS rejection, not a connectivity loss, and must not show the overlay.

## Gotchas

- **Signal writes inside `effect()` throw NG0600.** Angular 17 does not allow writing signals in an
  effect unless `allowSignalWrites` is set. Loading data from an effect typically writes signals
  (and HTTP triggers the loading interceptor, which also writes a signal). Defer the work with
  `queueMicrotask(...)` inside the effect instead of enabling `allowSignalWrites` globally.
- The location guard restricts access to India/AP/Telangana. When testing locally from another
  region, temporarily bypass it and restore it before committing.
