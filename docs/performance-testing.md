# Performance Testing

## 1. Scope

This document covers **client-side** performance: loading, rendering, interaction latency and the
effect of the app's own choices (bundle size, lazy routes, third-party scripts). Backend load and
capacity testing belong to the backend team.

## 2. Targets

| Metric | Target | Notes |
| --- | --- | --- |
| First Contentful Paint (FCP) | ≤ 1.8 s | Mobile, Slow 4G, 4× CPU throttle |
| Largest Contentful Paint (LCP) | ≤ 2.5 s | The login card and dashboard header are the LCP candidates |
| Total Blocking Time (TBT) | ≤ 200 ms | |
| Cumulative Layout Shift (CLS) | ≤ 0.1 | The Google button slot is reserved to avoid a shift |
| Speed Index | ≤ 3.4 s | |
| Initial bundle | ≤ 2 MB warn / 4 MB error | Enforced by `angular.json` budgets |
| Time to interactive on a list page | ≤ 3 s after navigation | Warm API |

## 3. Current optimisations

| Optimisation | Effect |
| --- | --- |
| Lazy `loadComponent` per route | Small initial bundle |
| `IdlePreloadingStrategy` | Other routes warm after first paint |
| `outputHashing: "all"` + immutable caching | Repeat visits download almost nothing |
| `defer` on the MDB script | Removes a render-blocking script |
| Font Awesome preload + `noscript` | Removes render-blocking CSS |
| CanvasJS injected on first chart | No chart library on non-chart pages |
| Email images fetched on demand | Lists stay small |
| Debounced search | Fewer requests |
| Server-side pagination | Bounded payloads |
| Zone event coalescing | Fewer change-detection cycles |
| Preconnects to fonts, CDN and `ipapi.co` | Earlier connections |
| Reserved Google button slot | Avoids CLS on login |

## 4. How to measure

### 4.1 Lighthouse (manual)

1. Build for production: `npm run build:prod`.
2. Serve the output (`firebase serve` or any static server) — never measure the dev server.
3. Open Chrome DevTools → Lighthouse.
4. Select **Mobile**, throttling **Simulated Slow 4G**, and run.
5. Record FCP, LCP, TBT, CLS and the bundle sizes.

Measure at least these pages:

- `/login` (public, LCP-critical).
- `/dashboard` (charts).
- `/events` (table).
- `/calendar` (heavy rendering).

### 4.2 Bundle analysis

```bash
npx ng build --stats-json
npx source-map-explorer dist/family-wishes-ui/browser/*.js
```

Watch for:

- A dependency pulled into the initial chunk by mistake.
- Duplicate library versions.
- Large icon fonts or CSS.

### 4.3 Runtime profiling

- DevTools Performance panel: record a navigation and an interaction; look for long tasks.
- DevTools Network: confirm CanvasJS and email images load only when needed.
- Coverage panel: find unused JS/CSS on first load.

## 5. Load and stress (client perspective)

The client is static; load testing focuses on what the backend sees because of it.

| Scenario | What to check |
| --- | --- |
| Many users opening the dashboard | Request volume per user (5–6 calls) |
| Rapid filter changes | Debounce prevents request storms (except list pages, which query on apply) |
| Large page sizes | 100-row pages on violated users |
| Bulk operations | Batch delete with many ids |
| Chat with many conversations | Message paging, socket reconnects |

Recommended tool for the API side: k6 or JMeter against a staging environment, with the client
open to generate realistic traffic patterns.

## 6. Regression watch list

| Change | Performance risk |
| --- | --- |
| Adding a dependency imported in the shell | Initial bundle growth |
| Importing a heavy library into a shared component | Every page pays |
| Removing `defer` or the preload swap | Render-blocking requests return |
| Loading charts or maps eagerly | Larger initial cost |
| Increasing page sizes by default | Slower lists |
| Adding a synchronous HTTP call in the shell | Blocks first interaction |
| Base64 images in lists | Huge payloads (already avoided for email images) |

## 7. Budget enforcement

`angular.json` fails the build when the initial bundle exceeds 4 MB and warns at 2 MB. Any change
that pushes past the warning must either be justified in review or lazy-loaded.

## 8. Reporting

Record per release:

| Field | Value |
| --- | --- |
| Commit | |
| Date | |
| Environment | Preview channel URL |
| FCP / LCP / TBT / CLS | |
| Initial bundle size | |
| Largest lazy chunk | |
| Regressions vs previous release | |
| Action taken | |

## 9. Known performance risks

| Risk | Mitigation |
| --- | --- |
| CDN availability (MDB, Font Awesome, fonts) | Preconnect; local fallback fonts |
| Large `ApiService` in the initial chunk | Consider splitting by domain and lazy-importing rarely used groups |
| Dashboard loads four endpoints on open | Acceptable; could be combined server-side |
| Calendar loads several months at once | Cache by year-month; `forkJoin` in parallel |
| Chat widget loaded in the shell | Consider lazy-loading it after first interaction |
| No image optimisation on uploads | Ask users for reasonable sizes; server may resize |

## 10. Commands

```bash
npm run build:prod
npx http-server dist/family-wishes-ui/browser -p 8080
# then run Lighthouse against http://localhost:8080
```
