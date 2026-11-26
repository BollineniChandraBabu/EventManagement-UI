# Deployment Architecture

## 1. Current deployment

Golden Greetings is deployed as a **static site on Firebase Hosting**. There is no application
server in this repository and no container runtime.

| Item | Value |
| --- | --- |
| Hosting provider | Firebase Hosting |
| Firebase project | `chandu-goldengreetings` (`.firebaserc`) |
| Framework backend region | `asia-east1` (`firebase.json`) |
| Build output | `dist/family-wishes-ui/browser` |
| Build command (CI) | `npm ci && npm run build` |
| Live channel | `live`, deployed on push to `main` |
| Preview channels | One per pull request |
| API backend | External host; dev default `https://eventmanagement-backend-m9qy.onrender.com/api` |
| WebSocket | `wss://<api-host>/ws-chat/websocket` |

## 2. Topology

```
        ┌──────────────┐
        │   Browser    │
        └──────┬───────┘
               │ HTTPS
   ┌───────────▼─────────────┐
   │ Firebase Hosting CDN    │  index.html (max-age=3600)
   │ project:                │  hashed js/css/img (max-age=31536000, immutable)
   │ chandu-goldengreetings  │  region: asia-east1
   └───────────┬─────────────┘
               │ API calls (CORS)
   ┌───────────▼─────────────┐      ┌──────────────────────┐
   │ Backend host            │─────▶│ Database             │
   │ (Render / other)        │      └──────────────────────┘
   │  REST /api/**           │      ┌──────────────────────┐
   │  STOMP /ws-chat/…       │─────▶│ Mail provider        │
   └─────────────────────────┘      └──────────────────────┘
                                    ┌──────────────────────┐
                                    │ Object storage       │
                                    └──────────────────────┘
```

## 3. Environments

| Environment | URL | API base | Purpose |
| --- | --- | --- | --- |
| Local | `http://localhost:12000` | `environment.ts` (dev API) | Development |
| PR preview | Firebase-generated preview URL | `environment.ts` (dev API) | Review before merge |
| Production | Firebase live domain | `environment.prod.ts` (must be set) | Live service |

**Important:** `environment.prod.ts` currently contains the placeholder
`https://your-backend-domain/api`. A production build made without editing it will point at a
non-existent API. Confirm the value in the release checklist.

There is no separate QA or UAT environment configured. See
[`environment-configuration.md`](environment-configuration.md) for a proposed scheme.

## 4. Hosting configuration

`firebase.json`:

| Setting | Value | Why |
| --- | --- | --- |
| `hosting.source` | `.` | Serve the built site |
| `ignore` | `firebase.json`, `**/.*`, `**/node_modules/**` | Do not upload tooling |
| `frameworksBackend.region` | `asia-east1` | Closest region for the primary audience |
| Cache for js/css/fonts/images | `public, max-age=31536000, immutable` | Hashed filenames never change |
| Cache for html/txt/xml/json | `public, max-age=3600` | Redeploy must be picked up within an hour |

Hashed assets can be cached forever because the Angular build uses `outputHashing: "all"` in the
production configuration. The entry document must not be cached for long, or users would keep an
old bundle after a release.

## 5. Build pipeline

```
pull_request  ──▶ GitHub Actions (firebase-hosting-pull-request.yml)
                    npm ci
                    npm run build
                    FirebaseExtended/action-hosting-deploy (preview channel)

push to main  ──▶ GitHub Actions (firebase-hosting-merge.yml)
                    npm ci
                    npm run build
                    FirebaseExtended/action-hosting-deploy (live channel)
```

Notes:

- Both workflows authenticate with the `FIREBASE_SERVICE_ACCOUNT_CHANDU_GOLDENGREETINGS` secret.
- The preview workflow is skipped for pull requests from forks.
- **No test or lint step runs in CI.** The build is the only gate.
- `npm run build` uses the default configuration, which is `production` (`angular.json`), so the
  deployed bundle is production-optimised.

## 6. Release and rollback

| Action | How |
| --- | --- |
| Release | Merge to `main` (automatic) |
| Manual release | `npm run build:prod && firebase deploy --only hosting` |
| Preview | Open a pull request |
| Rollback | Firebase console → Hosting → Release history → Roll back, or redeploy the previous commit |

See [`rollback-plan.md`](rollback-plan.md) and [`release-management.md`](release-management.md).

## 7. Dependencies outside the hosting platform

| Dependency | Failure impact | Mitigation |
| --- | --- | --- |
| Backend API | App unusable | Backend uptime monitoring; offline overlay explains outages |
| `ipapi.co` | Location gate denies access if GPS also unavailable | Server-side region control recommended |
| Google Identity Services | SSO unavailable; password/OTP still work | Button hidden when the client id is absent |
| MDB UI Kit / Font Awesome / Google Fonts | Visual degradation | Preconnect hints; Font Awesome preload with `noscript` fallback |
| CanvasJS | Charts do not render | Only loaded on chart pages |

## 8. Security posture of the deployment

- HTTPS only; Firebase provides the certificate.
- No secrets in the bundle; the only runtime-fetched credential is the public Google client id.
- API authorisation is enforced by the backend; CORS restricts browser origins.
- Hosting headers currently set caching only. Recommended additions: `Content-Security-Policy`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`,
  `Permissions-Policy`. See [`security-design.md`](security-design.md).
- The SPA needs a rewrite of unknown paths to `index.html`. Firebase Hosting serves `index.html`
  for unmatched paths by default when a single-page app is deployed; verify after any change to
  `firebase.json`.

## 9. Capacity and limits

| Resource | Consideration |
| --- | --- |
| CDN bandwidth | Firebase Hosting scales automatically; monitor quotas |
| Build minutes | GitHub Actions free minutes are sufficient for one build per PR and merge |
| Bundle size | 2 MB warning / 4 MB error budget keeps the initial download reasonable |
| API capacity | Owned by the backend; the client paginates and debounces to reduce load |

## 10. What is not deployed from this repository

- No server, container, Kubernetes manifest or database migration.
- No background jobs; schedulers run in the backend.
- No secrets other than the CI service-account credential stored in GitHub.

## 11. Related documents

- [`ci-cd-pipeline.md`](ci-cd-pipeline.md)
- [`deployment-guide.md`](deployment-guide.md)
- [`environment-configuration.md`](environment-configuration.md)
- [`infrastructure-requirements.md`](infrastructure-requirements.md)
- [`rollback-plan.md`](rollback-plan.md)
