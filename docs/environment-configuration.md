# Environment Configuration

## 1. What differs between environments

The Angular build is identical in structure; only the compiled `environment.ts` values change.

| Setting | DEV | QA | UAT | PROD |
| --- | --- | --- | --- | --- |
| `production` | `false` | `false` | `true` | `true` |
| `apiUrl` | Dev backend | QA backend | UAT backend | Production backend |
| Optimisation | Off | Off | On | On |
| Source maps | On | On | Off | Off |
| Output hashing | Off | Off | On | On |
| Firebase target | Preview channel | — | — | Live channel |
| Error verbosity | Console | Console | Toasts | Toasts |

## 2. Current repository reality

The repository contains **two** environment files:

| File | Used by | `apiUrl` |
| --- | --- | --- |
| `src/environments/environment.ts` | `ng serve`, non-production builds | `https://eventmanagement-backend-m9qy.onrender.com/api` |
| `src/environments/environment.prod.ts` | production builds | `https://your-backend-domain/api` (placeholder) |

There is **no QA or UAT configuration**. `environment.prod.ts` also declares `googleClientId: ''`,
which is unused because the login page fetches the client id from the backend.

**Action required before any production release:** replace the placeholder `apiUrl`. A build with
the placeholder deploys an app that cannot reach its API.

## 3. Recommended structure

```
src/environments/
  environment.ts             # local development (default)
  environment.qa.ts          # QA backend
  environment.uat.ts         # UAT backend
  environment.prod.ts        # production
```

Add build configurations in `angular.json`:

```json
"configurations": {
  "production": { "fileReplacements": [{ "replace": "src/environments/environment.ts", "with": "src/environments/environment.prod.ts" }] },
  "qa":  { "fileReplacements": [{ "replace": "src/environments/environment.ts", "with": "src/environments/environment.qa.ts" }] },
  "uat": { "fileReplacements": [{ "replace": "src/environments/environment.ts", "with": "src/environments/environment.uat.ts" }] }
}
```

Then build with `npx ng build --configuration qa`.

## 4. Value checklist per environment

| Key | Rule |
| --- | --- |
| `apiUrl` | Must include the `/api` suffix; must be HTTPS outside local development |
| API origin | Must be added to the backend CORS allow-list as the UI origin |
| WebSocket host | Derived from `apiUrl`; verify `wss://<host>/ws-chat/websocket` is reachable |
| `production` | `true` only for UAT/PROD |
| `googleClientId` | Optional; the runtime value comes from the backend |

## 5. CORS

The backend must allow the **UI origin**, not the API origin:

| Environment | UI origin to allow |
| --- | --- |
| Local (port 4200) | `http://localhost:4200` (already allowed) |
| Local (port 12000) | `http://localhost:12000` — **not currently allowed** |
| PR preview | The Firebase preview domain (varies per PR) |
| Production | The production hosting domain |

A missing origin produces status 0 in the browser and no offline overlay (the probe succeeds).

## 6. Build and deploy matrix

| Environment | Command | Deploy target |
| --- | --- | --- |
| Local | `ng serve` | — |
| PR preview | `npm run build` | Firebase preview channel |
| Production | `npm run build` | Firebase live channel |

Because `npm run build` uses the default production configuration, both CI workflows build the
same way. If QA/UAT are added, update the workflows to pass `--configuration`.

## 7. Configuration anti-patterns

| Anti-pattern | Problem |
| --- | --- |
| Editing the service files to change a URL | Scattered configuration |
| Putting secrets in `environment*.ts` | The bundle is public |
| Different code paths per environment | Behaviour drift |
| Forgetting the `/api` suffix | Every request 404s |
| Forgetting the WebSocket host derivation | Chat and notifications silently stop working |
| Long-caching `index.html` | Users keep an old bundle after a release |

## 8. Verification after a configuration change

- [ ] App loads and the login page renders.
- [ ] Sign-in reaches the intended backend (check the Network tab host).
- [ ] Dashboard data loads.
- [ ] WebSocket connects (chat opens without errors).
- [ ] Location guard behaves as expected.
- [ ] No mixed-content warnings (all HTTPS in UAT/PROD).
