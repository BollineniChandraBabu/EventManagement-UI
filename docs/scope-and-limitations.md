# Scope and Limitations

This document records what the delivered application includes, what it deliberately excludes,
and the limitations that are known today.

## 1. In scope

### 1.1 Delivered capabilities

| Area | Included |
| --- | --- |
| Identity | Password sign-in, Google SSO, OTP sign-in, one-time direct links, forgot/reset password, change password, optional MFA, optional single-session, refresh, auto sign-out, concurrent-login notice |
| Access control | Role-based routes (`ROLE_ADMIN`, `ROLE_USER`), location gate, impersonation with admin-section hiding |
| Users | Admin list/search/filter/sort, create/edit, activate/deactivate, bulk deactivate, wish toggles, relationship, birthday wishes link, MFA and concurrent-login settings |
| Events | List/search/filter, create/edit, recurring or one-time, event types, greeting media upload, wishes link, next-occurrence preview, single and bulk delete, media lightbox |
| Calendar | Month/week/day/agenda views, kind filters, year jump, upcoming strip, per-day `.ics`, Google Calendar link, copy summary, festival wish panel, persisted preferences |
| Festivals | Per-year festival data, festival wish mappings (list, bulk link, note, wishes link, image, active state, status filter, summary) |
| Social | Mutual circles with directory search, request lifecycle, presence; chat with attachments, replies, edits, reactions, multi-delete, search, stars, typing/seen, presence, circle-only gating |
| Delivery | Dashboard KPIs and charts, email status by type, desktop/mobile preview, on-demand images, retry, delete, bulk delete, test email |
| Operations | Notifications with scheduling and publish/unpublish, scheduler console with manual trigger, AI delivery-ops triage, admin copilot, wish images, relationship/event-type seeds |
| Security analytics | Login locations with map links and CSV, failed sign-ins with suspicion scoring and CSV |
| Platform | Eleven themes, responsive layout, offline notice, global loading overlay, toasts, confirmations, sensitive-data masking, media validation, CSV safety, idle preloading, Firebase hosting configuration |

### 1.2 Supported roles

- **Guest** — sign-in, OTP, password reset, direct login, restricted-region notice.
- **User** — everything except the Admin section.
- **Admin** — everything, plus administration and security analytics.

## 2. Out of scope

| Excluded | Reason |
| --- | --- |
| Backend implementation, database schema, migrations | Separate repository and team |
| Mail transport, server-side template rendering, scheduler engine | Backend |
| AI model integration and prompt design | Backend/third party |
| In-browser email template authoring | `GrapesJS` is a dependency and `features/templates` exists, but the component is an empty placeholder and **no route is registered** |
| A dedicated AI wish page | `features/ai-wishes` exists but is **not routed**; only the admin copilot and backend-generated wishes are reachable |
| Self-service registration | Accounts are created by admins |
| Payments, billing, subscriptions | Not part of the product |
| Multi-tenancy / per-organisation branding | Single shared deployment |
| Native iOS/Android apps | Web only |
| Server-side rendering, prerendering, i18n routing | Browser-only SPA, English UI |
| Offline data entry | The app detects offline and blocks work; it does not queue writes |
| Push notifications (web push) | Only in-app banner + WebSocket |

## 3. Known limitations

### 3.1 Functional

| ID | Limitation | Impact | Workaround |
| --- | --- | --- | --- |
| L-01 | `features/templates` (template editor) is an empty component and is not routed | No in-app template editing despite the `GrapesJS` dependency | Edit templates outside the app |
| L-02 | `features/ai-wishes` is not routed | Users cannot open the standalone wish generator | Use the backend pipeline; admins can ask the copilot |
| L-03 | `features/auth/change-password` is an empty, unrouted component; password change lives on the account page | Dead file | Use Account → Change password |
| L-04 | Chat presence and instant delivery depend on the backend WebSocket; without it the widget still works over REST but without live updates | Stale presence, no instant messages | Refresh the page |
| L-05 | The location gate is client-side only | A determined user can bypass it | Enforce on the backend/edge |
| L-06 | If both browser geolocation and `ipapi.co` fail, the guard denies access | Users behind restrictive networks may be locked out | Allow-list the API host or add a server-side check |
| L-07 | Festival data is per year; if a year has not been synced by the backend, festivals for that year may be missing | Empty calendar for future years | Backend sync job |
| L-08 | Bulk actions apply only to the current page | Cannot delete across pages in one action | Repeat per page or raise the page size |
| L-09 | The notification banner shows one notification at a time (the newest active) | Older active announcements are not shown | Unpublish or shorten schedules |
| L-10 | Impersonation keeps the admin token; the UI only hides admin sections | An impersonating admin could still call admin APIs | Acceptable for a trusted admin tool |
| L-11 | The wish-preview modal is shown once per session per access token | A user who closes it will not see it again that session | Sign in again |
| L-12 | Tokens are held in `localStorage`/`sessionStorage` | Any XSS can read them | Strict CSP, dependency hygiene, short token lifetime |
| L-13 | No independent dark mode | Users must pick a theme | Choose a dark-friendly theme |
| L-14 | UI is English-only | No localisation | — |

### 3.2 Engineering

| ID | Limitation | Impact | Reference |
| --- | --- | --- | --- |
| E-01 | No `karma.conf.js`, but the test target requests `ChromeHeadlessNoSandbox` | `ng test` fails until the launcher is defined | [`unit-testing.md`](unit-testing.md) |
| E-02 | No ESLint configuration | `npm run lint` fails; style relies on review | [`coding-standards.md`](coding-standards.md) |
| E-03 | No end-to-end test suite | Flow regressions are caught manually | [`e2e-testing.md`](e2e-testing.md) |
| E-04 | CI runs build only, no tests | A failing test cannot block a merge | [`ci-cd-pipeline.md`](ci-cd-pipeline.md) |
| E-05 | `environment.prod.ts` still contains `https://your-backend-domain/api` | A production build points at a non-existent API unless overridden | [`environment-configuration.md`](environment-configuration.md) |
| E-06 | No client error reporting | Production errors are invisible to the team | [`monitoring-and-alerting.md`](monitoring-and-alerting.md) |
| E-07 | No route uses `data.preload: false` yet | All routes preload when idle | [`frontend-design.md`](frontend-design.md) |
| E-08 | Angular Material is used only by email-preview; MDB/Bootstrap CSS does most styling | Mixed styling systems | [`ui-ux-design.md`](ui-ux-design.md) |
| E-09 | `ChangeDetectionStrategy.OnPush` is not used consistently | Slightly more change-detection work | [`frontend-design.md`](frontend-design.md) |
| E-10 | Several list pages load up to 1000 users/seeds for pickers | Heavier payloads on slow connections | Use server-side search |

### 3.3 Operational

| ID | Limitation | Impact |
| --- | --- | --- |
| O-01 | Only one hosting target (Firebase) is configured | No long-lived staging environment beyond PR previews |
| O-02 | No client-side feature flags | Behaviour changes require a deploy |
| O-03 | The backend CORS allow-list excludes `localhost:12000` | Local API calls fail with status 0 |
| O-04 | No container or Kubernetes manifests | Deployment is static hosting only |
| O-05 | Rollback relies on Firebase release history | No application-level blue/green |

## 4. Assumptions that could invalidate the scope

- The backend contract stays backward compatible. The client tolerates arrays, paged objects,
  wrapped `{data}` responses and missing optional fields, but a renamed field breaks a screen.
- Administrators are trusted; impersonation and security analytics are powerful tools.
- The region restriction is acceptable to the business.
- Users have a modern browser and a stable connection for chat and calendar use.

## 5. Change control

Any change to this scope must be recorded in [`change-management.md`](change-management.md)
and, for architectural changes, in an ADR under
[`architecture-decision-records/`](architecture-decision-records/).
