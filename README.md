# Golden Greetings — Event Management UI

Golden Greetings is a celebration-management web application for families and small
organisations. It helps people record the dates that matter (birthdays, anniversaries,
festivals and one-off events), generate and deliver greeting emails, keep a private
"family & friends" circle, chat with that circle, and — for administrators — operate the
delivery pipeline from a single console.

This repository is the **Angular 17 single-page front end**. It talks to a separate
Spring Boot backend over a REST API and a STOMP-over-WebSocket endpoint. The backend,
database and mail infrastructure live in another repository.

> Project name in source: the Angular project is `family-wishes-ui` and the package is
> `family-wishes-ui@1.0.0`; the product shown to users is **Golden Greetings**.

---

## Features

### Everyone (signed in)

| Area | What it does |
| --- | --- |
| Dashboard | Mail and Instagram KPIs, delivery-health rate, OTP / forgot-password mail flow cards and CanvasJS line charts over a selectable date range |
| Events | Browse and search events; admins create, edit, bulk-delete and upload greeting media |
| Calendar | Month / week / day / agenda views for festivals, birthdays, anniversaries and other events; year jump; per-day `.ics` download, "Add to Google Calendar" and copy-day-summary; festival wish panel |
| Family & Friends | Mutual circle requests (send, accept, reject, cancel, remove) with directory search and presence |
| Chat | Floating chat widget with conversations, attachments, replies, reactions, edit/delete, in-thread search, starred messages, typing/seen indicators and presence |
| Email Status | Delivered/failed email log with desktop/mobile preview, on-demand image fetch, retry of failed sends and deletion |
| Account | Profile, wish settings, two-step sign-in (MFA), single-session setting, theme picker, password change and profile picture |
| Notifications | Live banner for published announcements (pushed over WebSocket) |

### Administrators only

Users and impersonation, user editor (role, relationship, wish toggles, birthday wishes link, MFA, concurrent login),
login-location analytics, violated-user (failed sign-in) analytics, notification authoring and scheduling,
scheduler console with manual triggers, AI agents (delivery-ops triage and an admin copilot),
wish-image library, festival wish mappings, relationship seeds and event-type seeds.

### Cross-cutting

- JWT authentication with access + refresh tokens, "remember me", proactive refresh and auto sign-out.
- Google SSO, OTP sign-in, one-time direct-login links and password reset.
- Role-based UI and route guards; impersonation ("view as user") that hides admin-only sections.
- 11 selectable themes driven by a `data-theme` attribute.
- Offline detection with a full-screen notice, and a concurrent-login notice for single-session accounts.
- Sensitive-data masking (emails and values) behind an explicit reveal toggle.
- Client-side media validation shared with the backend rules.
- Firebase Hosting deployment with long-lived immutable caching for hashed assets.

---

## Prerequisites

| Requirement | Version / note |
| --- | --- |
| Node.js | 18.x or 20.x (Angular 17 supported line) |
| npm | 9+ (ships with Node 18/20) |
| Angular CLI | Installed locally via `devDependencies` — use `npx ng` |
| Backend API | Reachable Spring Boot service; base URL is configured in `src/environments/environment.ts` |
| Browser | Evergreen Chrome, Edge, Firefox or Safari. The test runner expects Chrome |
| Network | The app calls `ipapi.co` for IP geolocation and loads MDB / Font Awesome / Google Fonts from CDNs |

The location guard restricts the application to India (Andhra Pradesh and Telangana). See
[`docs/troubleshooting-guide.md`](docs/troubleshooting-guide.md) for how to work from another region.

---

## Run the application

```bash
npm install
npx ng serve --host 0.0.0.0 --port 12000 --allowed-hosts all
```

Then open <http://localhost:12000>. The app redirects to `/login` (or `/restricted-region`
when the location check fails).

### Build

```bash
npx ng build                                # production build -> dist/family-wishes-ui/browser
npx ng build --configuration development    # unoptimised build with source maps
```

### Tests

```bash
npx ng test
```

The Karma target expects a `ChromeHeadlessNoSandbox` launcher. No `karma.conf.js` is
committed, so add one (or switch the `browsers` option) before relying on the test target.
See [`docs/test-strategy.md`](docs/test-strategy.md).

### Lint

`npm run lint` is declared but there is no ESLint configuration in the repository yet; the
script will fail until one is added. TypeScript strictness (`strict`, `strictTemplates`,
`noImplicitReturns`, `noPropertyAccessFromIndexSignature`) is the current quality gate.

---

## Configuration

| Setting | File | Notes |
| --- | --- | --- |
| API base URL (dev) | `src/environments/environment.ts` | Defaults to `https://eventmanagement-backend-m9qy.onrender.com/api` |
| API base URL (prod) | `src/environments/environment.prod.ts` | Placeholder `https://your-backend-domain/api` — must be set before release |
| Google client id (prod) | `src/environments/environment.prod.ts` | `googleClientId` is present but the login page fetches the id from `GET /api/auth/sso/token` |
| Firebase project | `.firebaserc`, `firebase.json` | Project `chandu-goldengreetings`, hosting region `asia-east1` |

The backend CORS allow-list does not include `localhost:12000`; API calls from that origin
fail with status 0. See [`docs/troubleshooting-guide.md`](docs/troubleshooting-guide.md).

---

## Deploy

Pushing to `main` runs `.github/workflows/firebase-hosting-merge.yml`, which builds and
deploys to the live Firebase Hosting channel. Pull requests get a preview channel from
`.github/workflows/firebase-hosting-pull-request.yml`. Both require the
`FIREBASE_SERVICE_ACCOUNT_CHANDU_GOLDENGREETINGS` secret.

Manual deploy:

```bash
npm run build:prod
firebase deploy --only hosting
```

---

## Documentation

All project documentation lives in [`docs/`](docs/README.md). Start with
[`docs/project-overview.md`](docs/project-overview.md), then
[`docs/system-architecture.md`](docs/system-architecture.md) and
[`docs/onboarding-guide.md`](docs/onboarding-guide.md).

## Repository layout

```
src/
  app/
    app.component.*          Shell: sidebar, banners, overlays, chat widget
    app.routes.ts            All routes (lazy `loadComponent`, guards)
    core/
      constants/             Role constants
      guards/                auth, guest, admin, location-access, reset-link
      interceptors/          auth (JWT/refresh) and loading
      models/                API, auth, chat and circle contracts
      pipes/                 Sensitive email/value masking pipes
      services/              ApiService, AuthService, ChatService, ThemeService, …
      strategies/            Idle route preloading
      utils/                 Media rules, API errors, CSV, schedule, wishes URL
    features/                One folder per screen
    shared/                  Reusable UI (toast, confirm, overlays, chat widget, filters)
  environments/              Dev / prod API configuration
  styles.css, themes.css     Design tokens and per-theme overrides
public/                      favicon, robots.txt, sitemap.xml
```
