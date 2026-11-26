# Test Coverage Report

> **Status:** baseline assessment of the repository as it stands. No coverage percentage has been
> measured because the Karma launcher is not configured (see [`unit-testing.md`](unit-testing.md)).
> This document records what is covered by source inspection and what is missing.

## 1. Summary

| Area | Files | Specs | Assessment |
| --- | --- | --- | --- |
| Core guards | 5 | 1 (`auth.guard`) | Partial — one guard of five |
| Core interceptors | 2 | 1 (`auth.interceptor`) | Good for auth; loading untested |
| Core services | 13 | 3 (`api`, `auth`, `circle`) | Partial |
| Core utilities | 7 | 4 (`api-error`, `circle-chat`, `media`, `notification-schedule`) | 3 untested (`csv`, `wishes-url`, `wishes-url.validator`) |
| Feature utilities | 6 | 3 (`calendar`, `dashboard`, `festival-mappings`) | 3 untested (`event`, `login-locations`, `violated-users`) |
| Components | 43 | 4 | Sparse |
| Pipes | 2 | 0 | Untested |
| Models | 4 | — | Type-only; no tests needed |

Existing spec count: **16**.

## 2. Covered behaviour

| Behaviour | Spec | Confidence |
| --- | --- | --- |
| Anonymous redirect preserves the target URL | `auth.guard.spec.ts` | High |
| One-time token routes to `/direct-login` | `auth.guard.spec.ts` | High |
| Signed-in user passes the guard | `auth.guard.spec.ts` | High |
| Concurrent login detected on the first 401 | `auth.interceptor.spec.ts` | High |
| Ordinary 401 refreshes and retries once | `auth.interceptor.spec.ts` | High |
| Refresh rejected for concurrent login shows the notice | `auth.interceptor.spec.ts` | High |
| Scheduled refresh rejection keeps the notice | `auth.interceptor.spec.ts` | High |
| No sign-out after the notice is set | `auth.interceptor.spec.ts` | High |
| API error message selection (429, marker) | `api-error.spec.ts` | High |
| Circle gating helpers | `circle-chat.spec.ts` | High |
| Media kinds, limits and previews | `media.spec.ts` | High |
| Schedule window rules | `notification-schedule.spec.ts` | High |
| Calendar recurrence, leap years, milestones, upcoming | `calendar.utils.spec.ts` | High |
| Delivery-health thresholds | `dashboard.utils.spec.ts` | High |
| Festival roll-forward, status, bulk message | `festival-mappings.utils.spec.ts` | High |
| Direct-login exchange and failure | `direct-login.component.spec.ts` | Medium |
| Festival wish panel admin vs user | `festival-wishes-panel.component.spec.ts` | Medium |
| Concurrent-login overlay | `concurrent-login-overlay.component.spec.ts` | Medium |
| Chat widget core interactions | `chat-widget.component.spec.ts` | Low/Medium |
| ApiService calls and normalisation | `api.service.spec.ts` | Partial |
| AuthService session handling | `auth.service.spec.ts` | Partial |
| CircleService calls | `circle.service.spec.ts` | Partial |

## 3. Untested behaviour (risk-ranked)

### 3.1 High risk

| Area | Why it matters | Suggested tests |
| --- | --- | --- |
| `AuthService.getSafeRedirectUrl` | Open-redirect and loop protection | External URL, `//evil`, auth pages, query strings |
| `AuthService` timer lifecycle | Silent session loss | Refresh scheduling, cancel on logout, no-op during notice |
| `wishes-url.ts` | User-supplied links are rendered in emails | Every rule, plus whitespace/control characters |
| `ConnectivityService` | Decides whether users see the offline screen | Two-failure rule, conclusive probe, third-party URLs ignored |
| `csv.ts` | Spreadsheet formula injection | `=`, `+`, `-`, `@`, quotes, newlines |
| Event editor save path | Wrong endpoint = lost media | With/without file, create/update |
| Role-based route access | Non-admins reaching admin pages | `adminGuard` spec |

### 3.2 Medium risk

| Area | Suggested tests |
| --- | --- |
| `ThemeService` | Catalog merge, API failure fallback, reset on logout |
| `SensitiveDataService` | Masking shapes, reveal toggle affecting pipes |
| `event.utils.ts` | Recurring/one-time/leap-day/next occurrence |
| List pages (events, users, email status, notifications, seeds, wish images) | Load, filter, sort, page, bulk selection, error state |
| Notification editor | Schedule validation and payload |
| Festival wish mappings page | Bulk link, filter, summary |
| `NotificationRealtimeService` | STOMP frame parsing for published/unpublished |
| Chat service | Message paging, send payload, edit/delete |

### 3.3 Low risk

| Area | Suggested tests |
| --- | --- |
| `login-locations.utils.ts` | KPIs, sorting, pagination, CSV |
| `violated-users.utils.ts` | Presets, suspicion thresholds, chart bars |
| `LocationService` | GPS success, GPS denial + IP, both fail |
| `LoadingService` / `ToastService` | Count and dismissal |
| `ImpersonationService` | Storage round-trip and corrupt JSON |
| Pipes | Masked output, impure re-evaluation |
| Static pages (`restricted-region`, `email-preview`) | Render only |

## 4. Coverage by requirement group

| Requirement group | Coverage |
| --- | --- |
| FR-AUTH | Good for guards and interceptor; weak for timers and SSO |
| FR-ACCT | None |
| FR-USER | None |
| FR-DASH | Utility only |
| FR-EVT | Utility only |
| FR-CAL | Good (utilities) |
| FR-FEST | Good (utilities + panel) |
| FR-CIR | Service only |
| FR-CHAT | Widget partial |
| FR-EMAIL | None |
| FR-NOTIF | Schedule utility only |
| FR-SCHED | None |
| FR-AGENT | None |
| FR-WISHIMG | None |
| FR-SEED | None |
| FR-SEC | None |
| FR-SYS | None |

## 5. How to produce a real report

1. Add `karma.conf.js` (see [`unit-testing.md`](unit-testing.md)).
2. Enable the coverage reporter.
3. Run:

```bash
npx ng test --watch=false --browsers=ChromeHeadless --code-coverage
```

4. Open `coverage/index.html` and record the statement/branch/function/line percentages here.

## 6. Target coverage

| Scope | Current | Target |
| --- | --- | --- |
| Overall statements | Not measured | 60% |
| `core/utils` | ~55% by file count (4 of 7) | 90% |
| `core/services` | ~23% by file count (3 of 13) | 80% |
| Guards + interceptors | ~29% by file count (2 of 7) | 100% |
| Feature utilities | 50% by file count (3 of 6) | 90% |
| Components | ~9% by file count (4 of 43) | 50% for pages with logic |

## 7. Gaps that cannot be closed by unit tests

| Gap | Needs |
| --- | --- |
| Real backend contract | Contract tests or E2E against a test environment |
| WebSocket behaviour | Integration test with a stub STOMP server |
| File upload limits enforced by the server | API tests |
| Visual regressions across 11 themes | Screenshot testing |
| Accessibility | axe + manual screen-reader passes |
