# Known Issues

Current limitations and defects in the front end, with impact and workaround. Severity uses the
scale in [`defect-tracking.md`](defect-tracking.md).

## 1. Release blockers / high priority

| ID | Issue | Severity | Impact | Workaround |
| --- | --- | --- | --- | --- |
| KI-01 | `environment.prod.ts` contains the placeholder `https://your-backend-domain/api` | S2 | A production build cannot reach the API | Set the real URL before releasing |
| KI-02 | `ng test` cannot run: `angular.json` names `ChromeHeadlessNoSandbox`, no `karma.conf.js` | S3 | No automated test gate | Add `karma.conf.js` (see [`unit-testing.md`](unit-testing.md)) |

## 2. Functional limitations

| ID | Issue | Severity | Impact | Workaround |
| --- | --- | --- | --- | --- |
| KI-03 | The template editor (`features/templates`) is an empty, unrouted component | S4 | No in-browser template editing | Edit templates outside the app |
| KI-04 | `features/ai-wishes` is not routed | S4 | No standalone wish generator | Use the backend pipeline or the copilot |
| KI-05 | `features/auth/change-password` is an empty, unrouted component | S4 | Dead code | Use Account → Change password |
| KI-06 | The location guard is client-side only | S3 (security) | Bypassable | Enforce server-side |
| KI-07 | If geolocation and `ipapi.co` both fail, access is denied | S3 | Some legitimate users are blocked | Allow the API host / add server-side control |
| KI-08 | Bulk actions only cover the current page | S4 | Cannot act across pages | Repeat per page or raise the page size |
| KI-09 | The notification banner shows only the newest active notification | S4 | Older announcements hidden | Unpublish or shorten schedules |
| KI-10 | Festival data is per year; an unsynced year may have no festivals | S3 | Empty calendar for that year | Backend sync |
| KI-11 | The wish-preview modal shows once per session per token | S4 | Not repeatable | Sign in again |
| KI-12 | Impersonation keeps the admin token | S3 (accepted) | An impersonating admin could call admin APIs | Trusted-admin tool; backend should scope |
| KI-13 | Chat live updates depend on the WebSocket | S3 | No instant messages if the socket fails | Refresh to load over REST |
| KI-14 | `NotificationRealtimeService` does not retry on its own | S3 | A dropped notification socket stays down until the next sign-in transition | Reload the page |
| KI-15 | UI is English-only | S4 | No localisation | — |

## 3. Engineering limitations

| ID | Issue | Severity | Impact | Workaround |
| --- | --- | --- | --- | --- |
| KI-16 | No ESLint configuration; `npm run lint` fails | S4 | No lint gate | Rely on TypeScript strictness and review |
| KI-17 | No end-to-end tests | S3 | Flow regressions caught manually | Manual smoke script |
| KI-18 | CI builds but does not run tests | S3 | Failing tests cannot block a merge | Run tests locally |
| KI-19 | No client error reporting | S3 | Production errors invisible | User reports |
| KI-20 | No HTTP timeout | S3 | A hung request keeps the loading overlay up | Reload the page |
| KI-21 | List loads are not cancelled; a slow earlier response can overwrite a newer one | S3 | Brief stale data after rapid filter changes | Wait or refresh |
| KI-22 | `ApiService` is a single ~1 000-line class | S4 | Harder to navigate and test | Split by domain over time |
| KI-23 | `ChangeDetectionStrategy.OnPush` is not used | S4 | Slightly more change detection | — |
| KI-24 | Mixed styling systems (MDB/Bootstrap + Angular Material) | S4 | Inconsistent component behaviour | Standardise over time |
| KI-25 | No route-level `data.preload` opt-outs | S4 | All routes preload when idle | Add for heavy routes |
| KI-26 | `fw_wish_preview_seen_token` stores a copy of the access token | S3 (privacy) | A second copy of a restricted value in `sessionStorage` | Replace with a hash/timestamp |
| KI-27 | No self-service data export or account deletion | S3 (privacy) | User rights depend on support | Backend feature |
| KI-28 | No service worker / offline write queue | S4 | Writes fail while offline | Retry when online |

## 4. Environment limitations

| ID | Issue | Severity | Impact | Workaround |
| --- | --- | --- | --- | --- |
| KI-29 | Backend CORS does not allow `localhost:12000` | S3 (dev) | Local API calls fail with status 0 | Use port 4200 or update the allow-list |
| KI-30 | No QA or UAT environment configuration | S3 | No separate pre-production environment | Use PR previews |
| KI-31 | Security headers (CSP/HSTS/Referrer-Policy) are not set | S3 (security) | Reduced defence in depth | Add to `firebase.json` |
| KI-32 | No monitoring or alerting | S3 (operations) | Outages are noticed by users | Add uptime and error monitoring |

## 5. Behaviour that looks like a bug but is intentional

| Behaviour | Why |
| --- | --- |
| Redirected to `/restricted-region` | The app is limited to India/AP/Telangana |
| Signed out with a "signed in elsewhere" notice | The account has single-session enabled |
| A festival from last year still shows as upcoming | Festivals repeat; timing is relative to the next occurrence |
| A published notification cannot be edited | Published announcements are immutable |
| A stale-schedule draft cannot be published | The backend would stamp a back-dated publish time |
| Admin menus disappear while impersonating | The admin sees what the user sees |
| Security settings are read-only while impersonating | Prevent accidental changes |
| Email addresses appear masked | Sensitive data is hidden by default |
| The offline overlay does not appear on a CORS failure | Status 0 is ambiguous; the probe confirms reachability |

## 6. Issue reporting

When reporting a new issue:

1. Check this list first.
2. Follow the defect template in [`defect-tracking.md`](defect-tracking.md).
3. Include the browser, the exact steps and any console output (redact tokens and personal data).

## 7. Review cadence

Review this list each release; remove fixed items and add new ones. Items that are accepted
long-term should be linked from [`vulnerability-management.md`](vulnerability-management.md) (for
security) or [`decision-log.md`](decision-log.md) (for product decisions).
