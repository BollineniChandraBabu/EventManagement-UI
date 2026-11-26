# Test Strategy

## 1. Current state (honest baseline)

| Level | Status |
| --- | --- |
| Unit tests | 16 Jasmine specs exist, covering guards, interceptors, services, pure utilities and a few components |
| Component tests | Partial: chat widget, concurrent-login overlay, festival wish panel, direct login |
| Integration tests | None |
| API contract tests | None |
| End-to-end tests | None |
| Performance tests | Manual Lighthouse only |
| Security tests | Manual review only |
| CI execution | **None** — CI builds but does not run tests |
| Test runner health | `angular.json` names `ChromeHeadlessNoSandbox`, but no `karma.conf.js` defines it |

This document defines the strategy the team should follow, and marks what already exists.

## 2. Objectives

1. Catch regressions in business rules that are easy to get wrong (date maths, session handling,
   validation, masking).
2. Protect the security-relevant paths (token refresh, concurrent login, guards).
3. Keep the feedback loop fast: unit tests in seconds, no browser needed for pure logic.
4. Make the release gate meaningful: tests run in CI and block a merge on failure.

## 3. Test pyramid

```
            ┌──────────────────────┐
            │  E2E (few)           │  Playwright/Cypress — critical journeys
            ├──────────────────────┤
            │  Integration (some)  │  Component + HttpTestingController, service + real parser
            ├──────────────────────┤
            │  Unit (many)         │  Pure utilities, services, guards, interceptors
            └──────────────────────┘
```

Target ratio by count: ~70% unit, ~25% integration/component, ~5% E2E. By risk, the security and
date-logic paths must be covered at the unit level regardless of the ratio.

## 4. What to test at each level

### 4.1 Unit (highest value, cheapest)

| Target | Why |
| --- | --- |
| `calendar.utils.ts` | Recurrence, leap years, month boundaries, milestones, upcoming window |
| `event.utils.ts` | Next occurrence for recurring and one-time events |
| `festival-mappings.utils.ts` | Festival roll-forward, status derivation, bulk message |
| `media.ts` | Type/size rules, preview kind |
| `wishes-url.ts` | URL validation rules |
| `api-error.ts` | 429 and concurrent-login messages |
| `notification-schedule.ts` | Past/inverted windows |
| `csv.ts` | Escaping and formula injection |
| `circle-chat.ts` | Circle gating |
| `dashboard.utils.ts` | Delivery health thresholds |
| `login-locations.utils.ts` | KPIs, summaries, sorting, pagination |
| `violated-users.utils.ts` | Presets, chart scaling, suspicion |
| `AuthService` | Storage choice, timers, logout, notice, safe redirect |
| `authInterceptor` | Refresh/retry, concurrent login, 403, status 0 |
| `ThemeService` | Catalog merge, fallback, apply/reset |

### 4.2 Integration / component

| Target | Approach |
| --- | --- |
| `ApiService` | `HttpTestingController`: URL, params, headers, multipart bodies, normalisation, fallbacks |
| Guards | Router testing harness; redirect targets |
| List pages | Render with mocked service; assert loading, rows, empty, error, selection |
| Forms | Set values, submit, assert request payload and validation messages |
| Chat widget | Mock `ChatService` streams; assert gating, send, edit, delete |
| Overlays | Assert visibility driven by the service signal |
| WebSocket parsers | Feed sample STOMP frames |

### 4.3 End-to-end

Critical journeys only:

1. Password sign-in → dashboard.
2. Create an event with an image → appears in the list.
3. Calendar: view next year → festival appears.
4. Circle request → accept → chat message.
5. Admin publishes a notification → user sees the banner.
6. Failed email → retry → status changes.
7. Concurrent login → notice appears and the user can sign in again.

## 5. Environments and data

| Environment | Use |
| --- | --- |
| Local (Karma/Jasmine) | Unit and component tests |
| Local + dev backend | Manual integration |
| PR preview | Smoke test after deploy |
| Production | Read-only smoke after release |

Test data must be synthetic. Never use real personal data in tests or fixtures. See
[`test-data.md`](test-data.md).

## 6. Tooling

| Purpose | Tool | Status |
| --- | --- | --- |
| Unit/component runner | Karma + Jasmine | Present |
| Browser | ChromeHeadless | Launcher must be defined in `karma.conf.js` |
| Coverage | `karma-coverage` | Present as a dependency; not configured in a report target |
| Mocking HTTP | `provideHttpClientTesting` | Used in existing specs |
| E2E | Playwright or Cypress | Not installed |
| Accessibility | axe DevTools / Lighthouse | Manual |
| Performance | Lighthouse | Manual |

## 7. Entry and exit criteria

**Entry (per story)**

- Acceptance criteria written.
- Test data identified.
- Code merged to a feature branch.

**Exit (per release)**

- All unit tests pass in CI.
- New pure logic has unit tests.
- Every must-have acceptance criterion has a recorded pass.
- No open severity 1 or 2 defect.
- Lighthouse and accessibility checks recorded.

## 8. Roles

| Role | Responsibility |
| --- | --- |
| Developer | Unit and component tests for their change |
| QA | Test cases, exploratory testing, E2E scenarios, release verification |
| Tech lead | Test strategy, review of coverage gaps, CI gate |
| Product owner | Acceptance sign-off |

## 9. Metrics

| Metric | Target |
| --- | --- |
| Statement coverage (overall) | ≥ 60% (realistic first target) |
| Coverage of `core/utils` and `core/services` | ≥ 80% |
| Escaped defects per release | ≤ 2 |
| Test suite runtime | < 2 minutes |
| Flaky test rate | < 2% |

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| No CI test gate | Add `npm test -- --watch=false --browsers=ChromeHeadless` to workflows |
| Broken Karma launcher | Commit `karma.conf.js` with `ChromeHeadlessNoSandbox` |
| Backend unavailable in tests | Use `HttpTestingController`; never call the real API in unit tests |
| Date-dependent tests | Inject or pass `today`; never rely on the system clock where avoidable |
| Time-zone flakiness | Use local date constructors, not UTC strings |
| Large untested page components | Extract logic into utilities and test those first |

## 11. Improvement roadmap

| Phase | Action |
| --- | --- |
| 1 | Add `karma.conf.js`; make `ng test` work; add coverage reporting |
| 2 | Add tests for `wishes-url`, `csv`, `event.utils`, `login-locations.utils`, `violated-users.utils` |
| 3 | Add CI step to run tests and publish coverage |
| 4 | Add component tests for the five main list pages |
| 5 | Add Playwright with the seven critical journeys |
| 6 | Add axe checks to the E2E suite |

## 12. Related documents

- [`test-plan.md`](test-plan.md)
- [`test-cases.md`](test-cases.md)
- [`unit-testing.md`](unit-testing.md)
- [`integration-testing.md`](integration-testing.md)
- [`api-testing.md`](api-testing.md)
- [`e2e-testing.md`](e2e-testing.md)
- [`test-coverage-report.md`](test-coverage-report.md)
