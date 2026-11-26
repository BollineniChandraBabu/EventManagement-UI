# Build and Run

## 1. Prerequisites

| Requirement | Version |
| --- | --- |
| Node.js | 18.x or 20.x |
| npm | 9+ |
| Angular CLI | Local (`npx ng`); global install not required |
| Backend API | Reachable at the URL in `src/environments/environment.ts` |
| Browser | Evergreen Chrome/Edge/Firefox/Safari |

## 2. Install

```bash
npm ci        # clean, lockfile-exact install (use in CI)
npm install   # when changing dependencies
```

`npm ci` is preferred because `package-lock.json` is committed and reproducible.

## 3. Run the development server

```bash
npx ng serve --host 0.0.0.0 --port 12000 --allowed-hosts all
```

| Flag | Why |
| --- | --- |
| `--host 0.0.0.0` | Reachable from containers and remote previews |
| `--port 12000` | The workspace's assigned port |
| `--allowed-hosts all` | Avoids the Angular dev-server host check behind a proxy |

Open <http://localhost:12000>. You will be redirected to `/login`, or to `/restricted-region` if
the location guard rejects your region.

`npm start` also works (`ng serve` with defaults, port 4200).

## 4. Build

```bash
npx ng build                      # production (default configuration)
npx ng build --configuration development
npm run build                     # same as npx ng build
npm run build:prod                # same as npx ng build
```

Output: `dist/family-wishes-ui/browser/`.

| Configuration | Optimisation | Source maps | Hashed assets |
| --- | --- | --- | --- |
| production (default) | Yes | No | Yes |
| development | No | Yes | No |

Budgets: 2 MB warning, 4 MB error for the initial bundle. A breach of the error budget fails the
build.

## 5. Serve the built output locally

```bash
npx http-server dist/family-wishes-ui/browser -p 8080 -c-1
```

A static server is required (not `file://`) because the app uses absolute routes. Any server that
falls back to `index.html` for unknown paths works.

## 6. Tests

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

**This currently fails** because `angular.json` names `ChromeHeadlessNoSandbox` and no
`karma.conf.js` defines it. Add the config from [`unit-testing.md`](unit-testing.md) or change the
`browsers` option.

## 7. Lint

```bash
npm run lint
```

**This currently fails** because there is no ESLint configuration. Until one is added, rely on
`npx tsc --noEmit` (via the build) and code review.

## 8. Common commands

| Task | Command |
| --- | --- |
| Install | `npm ci` |
| Dev server | `npx ng serve --host 0.0.0.0 --port 12000 --allowed-hosts all` |
| Build | `npm run build` |
| Build + analyse | `npx ng build --stats-json` |
| Test | `npx ng test --watch=false --browsers=ChromeHeadless` |
| Preview build | `npx http-server dist/family-wishes-ui/browser -p 8080` |
| Deploy (manual) | `firebase deploy --only hosting` |

## 9. Troubleshooting the build

| Symptom | Cause | Fix |
| --- | --- | --- |
| `NG6002` / template type errors | `strictTemplates` violation | Fix the template binding |
| Budget exceeded | A large dependency in the initial chunk | Lazy-load it or raise the budget with justification |
| `Cannot find module` | Missing install | `npm ci` |
| `EADDRINUSE` | Port already in use | Use another port or stop the other process |
| Blank page after build | Served without an SPA fallback | Use a server that rewrites to `index.html` |
| API calls fail with status 0 | CORS or wrong `apiUrl` | See [`troubleshooting-guide.md`](troubleshooting-guide.md) |

## 10. Run checklist

- [ ] Node 18/20 active
- [ ] `npm ci` completed
- [ ] `environment.ts` points at a reachable API
- [ ] Dev server running on the expected port
- [ ] Location guard satisfied (or temporarily bypassed for local work)
- [ ] No console errors on the login page
