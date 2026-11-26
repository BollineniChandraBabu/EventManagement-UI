# Non-Functional Requirements

Quality attributes are grouped by ISO/IEC 25010 characteristics. Each requirement is stated so
it can be verified. Where the repository already implements a control, the implementation is
named; where it does not, the gap is called out and tracked in
[`known-issues.md`](known-issues.md).

---

## 1. Performance and efficiency

| ID | Requirement | Target | Verification | Status |
| --- | --- | --- | --- | --- |
| NFR-P-01 | Largest Contentful Paint on a mid-range mobile profile | ≤ 2.5 s | Lighthouse mobile, throttled (Slow 4G, 4× CPU) | Budgets and idle preloading in place; measure per release |
| NFR-P-02 | First Contentful Paint | ≤ 1.8 s | Lighthouse | Measure per release |
| NFR-P-03 | Cumulative Layout Shift | ≤ 0.1 | Lighthouse | Login card reserves the Google button slot |
| NFR-P-04 | Total Blocking Time | ≤ 200 ms | Lighthouse | Charts and third-party scripts are deferred |
| NFR-P-05 | Initial bundle size | ≤ 2 MB warn / 4 MB error | `angular.json` budgets | Enforced at build |
| NFR-P-06 | Route chunks are lazy | All feature routes use `loadComponent` | Code review / build output | Enforced |
| NFR-P-07 | Non-critical routes are preloaded only when idle | Idle callback, 3 s timeout | `IdlePreloadingStrategy` | Enforced |
| NFR-P-08 | CanvasJS is downloaded only when a chart renders | Zero requests on non-chart pages | Network trace | Enforced |
| NFR-P-09 | List pages respond to filter changes within 1 s on a normal connection | ≤ 1 s | Manual timing | Backend-dependent |
| NFR-P-10 | Directory search is debounced | 300 ms | `circles.component.ts` | Enforced |
| NFR-P-11 | Email images are fetched only for the open record and cached for at most 20 records | ≤ 20 cached | `MAX_CACHED_IMAGES` | Enforced |
| NFR-P-12 | Hashed static assets cached for one year, entry HTML for one hour | `max-age=31536000, immutable` / `max-age=3600` | `firebase.json` | Enforced |

## 2. Security

| ID | Requirement | Implementation / control | Status |
| --- | --- | --- | --- |
| NFR-S-01 | All API and WebSocket traffic shall use TLS | HTTPS API base; `wss` derived from `https` | Enforced by environment |
| NFR-S-02 | No credentials, API keys or secrets shall be committed or bundled | Only a public Google client id (fetched at runtime) and the API URL exist | Enforced |
| NFR-S-03 | Every API request shall carry a bearer token except explicitly public calls | `auth.interceptor.ts` | Enforced |
| NFR-S-04 | Tokens shall not be written to logs | No token logging in the client | Enforced by review |
| NFR-S-05 | Authorisation shall be enforced by the backend; the client hides UI but never relies on hiding | Guards + backend | Partially verifiable from this repo |
| NFR-S-06 | A superseded session shall be explained and terminated, not silently redirected | Concurrent-login notice | Enforced |
| NFR-S-07 | Personal data shall be masked on screen by default | `SensitiveDataService`, pipes | Enforced |
| NFR-S-08 | Uploaded files shall be validated for type and size before sending | `media.ts` | Enforced |
| NFR-S-09 | User-supplied URLs shall be validated to `http(s)` with no credentials | `wishes-url.ts` | Enforced |
| NFR-S-10 | CSV exports shall not allow spreadsheet formula injection | `csv.ts` | Enforced |
| NFR-S-11 | Rendered HTML from the backend (email bodies, chat formatting, wish preview) shall be sanitised | Angular sanitises `[innerHTML]`; chat uses `SafeHtml` through Angular's sanitiser | Enforced by framework; review on change |
| NFR-S-12 | Access shall be geo-restricted | Client location guard | Client-only; backend control recommended |
| NFR-S-13 | Optional MFA and single-session shall be available per account | Account page, user editor | Enforced (backend executes) |
| NFR-S-14 | Rate limiting shall be communicated clearly | 429 handling in `apiErrorMessage` | Enforced |

See [`security-requirements.md`](security-requirements.md) and
[`threat-model.md`](threat-model.md) for the full analysis.

## 3. Reliability and availability

| ID | Requirement | Target | Implementation |
| --- | --- | --- | --- |
| NFR-R-01 | The UI shall remain interactive when an individual API call fails | 100% of handled calls | Each page shows a toast and keeps its previous data |
| NFR-R-02 | Connectivity loss shall be detected without user action | Within ~20 s (2 × 10 s heartbeat) | `ConnectivityService` |
| NFR-R-03 | A single failed probe shall not declare the app offline | 2 consecutive failures required | `FAILURES_BEFORE_OFFLINE = 2` |
| NFR-R-04 | The app shall recover automatically when connectivity returns | Immediate | Probe success clears the overlay |
| NFR-R-05 | Real-time features shall reconnect after a dropped socket | Automatic retry with backoff in `ChatService` | Partial: `NotificationRealtimeService` reconnects only on next `connect()` |
| NFR-R-06 | A refresh failure shall not leave a half-authenticated state | Tokens cleared, notice or login shown | `AuthService` |
| NFR-R-07 | Service availability target (backend + hosting) | 99.5% monthly | Firebase Hosting SLA + backend host |
| NFR-R-08 | A deployment shall not break an open session | Tokens survive a redeploy (client-side) | Hashed assets + hourly HTML revalidation |

## 4. Scalability

| ID | Requirement | Approach |
| --- | --- | --- |
| NFR-SC-01 | The client shall scale horizontally without server state | Static SPA on a CDN; no server session |
| NFR-SC-02 | Lists shall be paginated, never fully loaded | Every list endpoint takes `page`/`size`; a 1000-item cap is used only for pickers |
| NFR-SC-03 | Filter options shall be fetched from dedicated endpoints | `*/filter-values` endpoints |
| NFR-SC-04 | Bulk operations shall be batched | `ids` repeated query parameters / bulk endpoints |
| NFR-SC-05 | The number of WebSocket subscriptions shall be bounded | One socket, fixed topic set |
| NFR-SC-06 | The app shall tolerate a backend that returns arrays instead of paged objects | `normalizePaged` / `normalizeCollection` |

## 5. Usability

| ID | Requirement | Implementation |
| --- | --- | --- |
| NFR-U-01 | Every destructive action shall require explicit confirmation | `ConfirmDialogService` |
| NFR-U-02 | Every action shall produce feedback (toast, inline error, or overlay) | `ToastService` |
| NFR-U-03 | Forms shall show field-level errors after the field is touched or dirty | `showError` pattern |
| NFR-U-04 | Long-running work shall be indicated without blocking unrelated work | Global overlay excludes chat/agent/image calls; agents show their own progress |
| NFR-U-05 | The user's view and filter preferences shall persist where useful | Calendar view/kinds, theme |
| NFR-U-06 | The interface language shall be consistent (English) | UI copy |
| NFR-U-07 | Dates shall be displayed in the user's local time zone and locale format | `Intl.DateTimeFormat`, local date parsing |
| NFR-U-08 | Empty states shall explain what to do next | List and panel templates |

## 6. Accessibility

| ID | Requirement | Target | Status |
| --- | --- | --- | --- |
| NFR-A-01 | All interactive controls reachable and operable by keyboard | WCAG 2.1 AA (2.1.1) | Partial — verify each release |
| NFR-A-02 | Visible focus indicator | AA (2.4.7) | Provided by design tokens |
| NFR-A-03 | Icon-only buttons have an accessible name | AA (4.1.2) | `aria-label` on toggles and close buttons |
| NFR-A-04 | Dialogs trap focus and expose `role="dialog"`/`aria-modal` | AA | Wish preview, offline and concurrent-login overlays set these; confirm dialog uses Material CDK |
| NFR-A-05 | Escape closes overlays and sheets | AA | Calendar, multi-select, chat |
| NFR-A-06 | Colour contrast ≥ 4.5:1 for text | AA (1.4.3) | Themes define their own palettes — verify per theme |
| NFR-A-07 | Content reflows at 320 px width and 200% zoom | AA (1.4.10) | Responsive layout; verify |
| NFR-A-08 | Motion respects reduced-motion preference | AAA (nice to have) | Not implemented — tracked |

See [`accessibility-guidelines.md`](accessibility-guidelines.md).

## 7. Compatibility

| ID | Requirement |
| --- | --- |
| NFR-C-01 | Support the last two major versions of Chrome, Edge, Firefox and Safari |
| NFR-C-02 | Support viewport widths from 360 px to 1920 px |
| NFR-C-03 | Support touch, mouse and keyboard input |
| NFR-C-04 | Degrade gracefully when `requestIdleCallback` is unavailable (fallback timer) |
| NFR-C-05 | Degrade gracefully when browser geolocation is denied (IP lookup) |
| NFR-C-06 | Function without CDN styling only in the sense of appearance, not behaviour |

## 8. Maintainability

| ID | Requirement | Implementation |
| --- | --- | --- |
| NFR-M-01 | TypeScript strict mode and strict templates | `tsconfig.json` |
| NFR-M-02 | One responsibility per service; pure logic extracted to testable utilities | `*.utils.ts` files with unit tests |
| NFR-M-03 | Standalone components only; no NgModules | All components are `standalone: true` |
| NFR-M-04 | Signals for local/shared state; RxJS for async streams | `signal`/`computed` + observables |
| NFR-M-05 | No `any` in new code where a model exists | `core/models` |
| NFR-M-06 | Comments explain intent and non-obvious constraints only | Repository convention (see `AGENTS.md`) |
| NFR-M-07 | No lint configuration exists | **Gap** — add ESLint |
| NFR-M-08 | No `karma.conf.js` although the test target names a custom launcher | **Gap** — see [`unit-testing.md`](unit-testing.md) |

## 9. Portability and deployability

| ID | Requirement | Implementation |
| --- | --- | --- |
| NFR-PT-01 | Build output shall be a static bundle deployable to any static host | `dist/family-wishes-ui/browser` |
| NFR-PT-02 | Environment differences shall be configuration only | `environments/*.ts` |
| NFR-PT-03 | Deployment shall be automated on merge to `main` | GitHub Actions |
| NFR-PT-04 | A previous version shall be restorable | Firebase Hosting release history (see [`rollback-plan.md`](rollback-plan.md)) |
| NFR-PT-05 | No container or cluster runtime is required | Not applicable; see [`containerization.md`](containerization.md) |

## 10. Observability

| ID | Requirement | Status |
| --- | --- | --- |
| NFR-O-01 | Client errors shall be visible to the team | **Gap** — only `console.error`; no error reporting service |
| NFR-O-02 | Delivery health shall be visible to operators in-app | Dashboard |
| NFR-O-03 | Scheduler runs and failures shall be visible in-app | Schedulers page |
| NFR-O-04 | Security events (failed sign-ins, locations) shall be visible in-app | Login locations, violated users |
| NFR-O-05 | Real-user performance shall be measured | **Gap** — Lighthouse only |

## 11. Compliance and privacy

| ID | Requirement |
| --- | --- |
| NFR-CP-01 | Personal data shall be classified and handled per [`data-classification.md`](data-classification.md) |
| NFR-CP-02 | Retention and deletion shall follow [`privacy-and-data-retention.md`](privacy-and-data-retention.md) |
| NFR-CP-03 | Least privilege shall be enforced by role and by screen |
| NFR-CP-04 | Audit-relevant actions (publish, delete, impersonate) shall be attributable to a user (backend logs) |
| NFR-CP-05 | Consent for geolocation shall be requested by the browser and denial shall not block sign-in |

## 12. Verification summary

| Attribute | How verified | Frequency |
| --- | --- | --- |
| Performance | Lighthouse CI / manual trace | Each release |
| Accessibility | Keyboard pass + axe scan | Each release |
| Security | Dependency audit, code review, threat-model review | Each release |
| Reliability | Offline/online simulation, token-expiry simulation | Each release |
| Compatibility | Browser matrix smoke test | Each release |
