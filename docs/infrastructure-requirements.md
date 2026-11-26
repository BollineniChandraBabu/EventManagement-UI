# Infrastructure Requirements

## 1. Summary

The front end requires only **static hosting**. There is no application server, database, message
broker or background worker in this repository. Requirements below cover the hosting, the build
environment, the network and the client devices.

## 2. Hosting (production)

| Requirement | Value |
| --- | --- |
| Hosting type | Static site with an SPA fallback to `index.html` |
| Provider (current) | Firebase Hosting |
| Project | `chandu-goldengreetings` |
| Region | `asia-east1` |
| TLS | Required (HTTPS only) |
| HTTP/2 or HTTP/3 | Recommended |
| Compression | Brotli/gzip for text assets |
| Cache — hashed assets | `public, max-age=31536000, immutable` |
| Cache — HTML/text/XML/JSON | `public, max-age=3600` |
| Bandwidth | Scales with the CDN; monitor quotas |
| Storage | A few MB per release (JS/CSS/HTML/assets) |

## 3. Build environment

| Requirement | Value |
| --- | --- |
| OS | Linux (CI: `ubuntu-latest`) |
| Node.js | 18.x or 20.x |
| npm | 9+ |
| Memory | 2 GB minimum; 4 GB recommended for a production build |
| Disk | ~1 GB for `node_modules` and the build output |
| Network | Access to the npm registry and (at runtime) the CDNs |
| Build time | A few minutes on a standard CI runner |

## 4. Network requirements (runtime)

| Destination | Purpose | Required |
| --- | --- | --- |
| Backend API origin | All data operations | Yes |
| Backend WebSocket origin | Chat and notifications | Yes for real-time |
| `https://accounts.google.com` | Google SSO | Optional |
| `https://ipapi.co` | IP geolocation for the location guard | Yes (fallback to GPS) |
| `https://cdnjs.cloudflare.com` | Font Awesome, MDB | Styling only |
| `https://fonts.googleapis.com`, `https://fonts.gstatic.com` | Plus Jakarta Sans | Styling only |
| CanvasJS CDN | Charts | Dashboard only |
| `https://www.google.com/maps` | Map links | Optional (opens a new tab) |

All destinations must be reachable over HTTPS. A restrictive corporate proxy that blocks
`ipapi.co` will cause the location guard to deny access unless browser geolocation succeeds.

## 5. Client device requirements

| Requirement | Minimum |
| --- | --- |
| Browser | Last two major versions of Chrome, Edge, Firefox, Safari |
| JavaScript | Enabled |
| Screen | 360 px width |
| Memory | ~200 MB available to the browser |
| Network | 3G or better for a usable experience; chat needs a stable connection |
| Storage | `localStorage` and `sessionStorage` enabled (not blocked by policy) |
| Location | Permission for precise location is optional but recommended |

## 6. Backend dependencies

Although owned elsewhere, the client's availability depends on:

| Dependency | Requirement |
| --- | --- |
| API availability | 99.5% monthly target |
| API latency | < 500 ms p95 for list endpoints |
| CORS | Must allow every UI origin (dev, preview, production) |
| WebSocket | Must be reachable over `wss` with STOMP 1.2 |
| Rate limiting | Must return 429 with a message the UI can show |
| Token lifetime | `expiresIn` in seconds; the client refreshes 30 s before expiry |

## 7. Environment sizing

| Environment | Instances | Notes |
| --- | --- | --- |
| Production hosting | CDN (managed) | No sizing required |
| Preview hosting | CDN (managed) | One channel per PR; expires automatically |
| Build runners | GitHub-hosted | Standard runner is sufficient |
| Backend | Owned by the backend team | Not specified here |

## 8. Availability and recovery

| Aspect | Approach |
| --- | --- |
| Hosting availability | Firebase Hosting SLA |
| Static asset failure | Retried by the browser; hashed assets immutable |
| Backend outage | The app shows the offline overlay and recovers automatically |
| Bad release | Firebase release rollback (seconds) |
| Region outage | Firebase's global CDN; no client-side action |

## 9. Security infrastructure

| Requirement | Status |
| --- | --- |
| HTTPS everywhere | Yes (Firebase) |
| Security headers (CSP, HSTS, nosniff, referrer policy) | **Not configured** — recommended |
| Secrets in the bundle | None |
| CI credentials | GitHub secret for the Firebase service account |
| WAF / DDoS protection | Provided by the hosting/CDN layer; verify |

## 10. Monitoring infrastructure (recommended)

| Need | Current | Recommended |
| --- | --- | --- |
| Uptime | None | External synthetic check on the login page and API |
| Client errors | None | Sentry or equivalent |
| Performance | Manual Lighthouse | Lighthouse CI budgets |
| Deploy status | GitHub Actions | Notifications to the team channel |
| API health | Backend-owned | Shared dashboard |

## 11. Scaling considerations

- The client scales horizontally by nature (static files on a CDN).
- The number of concurrent users affects the backend, not the hosting.
- Bundle size affects every user's first load; keep the budget.
- The number of preview channels is bounded by Firebase quotas.

## 12. Cost drivers

| Driver | Notes |
| --- | --- |
| Hosting bandwidth | Dominated by the initial bundle; caching reduces repeat cost |
| Build minutes | One build per PR and merge |
| Backend compute | Owned elsewhere |
| Third-party AI | Per-request; monitor the Pollinations balance shown to admins |
| Geolocation | `ipapi.co` free tier limits; monitor |
