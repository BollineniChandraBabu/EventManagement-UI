# Deployment Guide

## 1. Deployment model

The app is a static bundle deployed to Firebase Hosting. There is no server process to start.

## 2. Pre-deployment checklist

- [ ] `environment.prod.ts` `apiUrl` is the real production API (not the placeholder).
- [ ] The production UI origin is allowed by backend CORS.
- [ ] The backend WebSocket endpoint is reachable over `wss`.
- [ ] `npm ci` and `npm run build` succeed locally.
- [ ] No `console.log` debugging left in the change.
- [ ] Tests pass locally (once `karma.conf.js` exists).
- [ ] The changelog and release notes are updated.
- [ ] The rollback plan is understood.

## 3. Automatic deployment (recommended)

### 3.1 Pull request

1. Push a branch and open a pull request.
2. `.github/workflows/firebase-hosting-pull-request.yml` runs:
   - `npm ci`
   - `npm run build`
   - deploys a preview channel.
3. The action posts the preview URL on the pull request.
4. Review the preview build.

### 3.2 Merge to `main`

1. Merge the approved pull request.
2. `.github/workflows/firebase-hosting-merge.yml` runs the same build and deploys to the **live**
   channel.
3. The action reports the live URL.

Required repository secret: `FIREBASE_SERVICE_ACCOUNT_CHANDU_GOLDENGREETINGS`.

## 4. Manual deployment

```bash
# 1. Install the Firebase CLI (once)
npm install -g firebase-tools

# 2. Authenticate
firebase login

# 3. Build
npm ci
npm run build

# 4. Deploy
firebase deploy --only hosting --project chandu-goldengreetings
```

Preview channel manually:

```bash
firebase hosting:channel:deploy staging --expires 7d
```

## 5. What gets uploaded

`firebase.json` ignores `firebase.json`, dotfiles and `node_modules`. The hosting source is `.`,
and the Angular build writes to `dist/family-wishes-ui/browser`. Confirm the deploy output lists
`index.html`, the hashed JS/CSS chunks and the `public/` assets (favicon, robots, sitemap).

If the deploy uploads the whole repository instead of the built bundle, check the Firebase
framework-aware hosting configuration (`frameworksBackend`) and the build output path.

## 6. Post-deployment verification

| Check | Expected |
| --- | --- |
| Open the production URL | Login page renders with styling |
| Sign in | Dashboard loads with real data |
| Network tab | Requests go to the production API over HTTPS |
| Console | No errors, no mixed content |
| Chat widget | Connects; no socket errors |
| Calendar | Loads the current month |
| Admin page (admin account) | Loads; emails masked |
| Hard refresh | New bundle served (check the hashed filename) |
| Cache headers | Assets `immutable`, HTML `max-age=3600` |

## 7. Cache behaviour

| Asset | Header | Effect |
| --- | --- | --- |
| Hashed JS/CSS/images/fonts | `public, max-age=31536000, immutable` | Cached for a year; new hashes on release |
| HTML/TXT/XML/JSON | `public, max-age=3600` | A release is picked up within an hour |

Users may hold the old HTML for up to an hour. If an immediate rollout is required, use Firebase's
release rollback/redeploy, which updates the CDN promptly; otherwise advise a hard refresh.

## 8. Troubleshooting a deployment

| Symptom | Cause | Fix |
| --- | --- | --- |
| 404 on deep links | SPA rewrite missing | Ensure Firebase serves `index.html` for unknown paths |
| Blank page | Wrong output directory deployed | Check the hosting source and build path |
| API errors after deploy | Placeholder `apiUrl` or CORS | Fix the environment file or backend allow-list |
| Old version after deploy | Cached HTML | Wait for the hour TTL or hard refresh |
| Assets 404 | Base href mismatch | `<base href="/">` must remain |
| Preview deploy skipped | PR from a fork | Expected; the workflow skips forks |

## 9. Rollback

See [`rollback-plan.md`](rollback-plan.md).

## 10. Communication

Announce a release in the team channel with: version/commit, what changed, the verification result,
and any known issues. For user-visible changes, publish an in-app notification.
