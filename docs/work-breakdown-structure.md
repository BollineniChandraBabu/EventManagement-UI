# Work Breakdown Structure

A decomposition of the work required to reach the objectives in [`project-plan.md`](project-plan.md).
Estimates are indicative (S ≤ 1 day, M 2–3 days, L 4–5 days, XL > 1 week).

## 1. Level 1 — Workstreams

```
1. Engineering baseline
2. Quality and testing
3. Security hardening
4. Reliability and observability
5. Performance
6. Accessibility
7. Feature delivery
8. Documentation and knowledge
9. Operations and release
```

## 2. Level 2 — Tasks

### 1. Engineering baseline

| ID | Task | Est. | Depends on |
| --- | --- | --- | --- |
| 1.1 | Add `karma.conf.js` with `ChromeHeadlessNoSandbox` | S | — |
| 1.2 | Enable coverage reporting | S | 1.1 |
| 1.3 | Add ESLint + Prettier configuration | M | — |
| 1.4 | Fix `npm run lint` | S | 1.3 |
| 1.5 | Set the production `apiUrl` in `environment.prod.ts` | S | Backend prod URL |
| 1.6 | Remove unrouted placeholder components (`templates`, `ai-wishes`, `change-password`) | S | Product decision |
| 1.7 | Split `ApiService` by domain (optional) | XL | — |
| 1.8 | Adopt `OnPush` on list pages (optional) | L | — |

### 2. Quality and testing

| ID | Task | Est. | Depends on |
| --- | --- | --- | --- |
| 2.1 | Add tests for `wishes-url` | S | 1.1 |
| 2.2 | Add tests for `csv` | S | 1.1 |
| 2.3 | Add tests for `event.utils` | S | 1.1 |
| 2.4 | Add tests for `login-locations.utils` and `violated-users.utils` | M | 1.1 |
| 2.5 | Add `ThemeService` and `ConnectivityService` tests | M | 1.1 |
| 2.6 | Add `AuthService` safe-redirect and timer tests | M | 1.1 |
| 2.7 | Add component tests for five list pages | L | 1.1 |
| 2.8 | Add Playwright with seven critical journeys | XL | 1.1, CI |
| 2.9 | Add axe checks to E2E | M | 2.8 |
| 2.10 | Add CI quality job (lint, test, audit, build) | M | 1.1, 1.4 |

### 3. Security hardening

| ID | Task | Est. | Depends on |
| --- | --- | --- | --- |
| 3.1 | Add `X-Content-Type-Options`, `Referrer-Policy`, HSTS to `firebase.json` | S | — |
| 3.2 | Draft CSP in report-only; fix violations | L | 3.1 |
| 3.3 | Enforce CSP | M | 3.2 |
| 3.4 | Self-host MDB and Font Awesome (or add SRI) | L | — |
| 3.5 | Replace `fw_wish_preview_seen_token` with a non-token marker | S | — |
| 3.6 | Backend/edge region enforcement | L | Backend team |
| 3.7 | Review email retry/delete permissions for standard users | S | Product |

### 4. Reliability and observability

| ID | Task | Est. | Depends on |
| --- | --- | --- | --- |
| 4.1 | Add an HTTP timeout to the interceptors | M | — |
| 4.2 | Add client error reporting with PII scrubbing | M | — |
| 4.3 | Add uptime monitoring for the app shell and API | S | — |
| 4.4 | Add a synthetic sign-in journey | M | 4.3 |
| 4.5 | Add `NotificationRealtimeService` reconnect | S | — |
| 4.6 | Cancel superseded list requests (`switchMap`/request token) | M | — |

### 5. Performance

| ID | Task | Est. | Depends on |
| --- | --- | --- | --- |
| 5.1 | Baseline Lighthouse report for four pages | S | — |
| 5.2 | Lazy-load the chat widget after first interaction (evaluate) | L | — |
| 5.3 | Evaluate splitting `ApiService` out of the initial chunk | M | 1.7 |
| 5.4 | Add Lighthouse CI budgets | M | CI |
| 5.5 | Re-measure after each release | S | — |

### 6. Accessibility

| ID | Task | Est. | Depends on |
| --- | --- | --- | --- |
| 6.1 | Per-route document titles | S | — |
| 6.2 | Focus management on route change and dialogs | M | — |
| 6.3 | Announce new chat messages and toasts in a live region | M | — |
| 6.4 | Add text alternatives/summaries for charts | M | — |
| 6.5 | `prefers-reduced-motion` support | S | — |
| 6.6 | Table semantics (`scope`, captions) | M | — |
| 6.7 | Per-theme contrast audit | M | — |

### 7. Feature delivery

| ID | Task | Est. | Depends on |
| --- | --- | --- | --- |
| 7.1 | Saved filter sets on list pages | L | — |
| 7.2 | Week-start preference in the calendar | S | — |
| 7.3 | Cross-thread chat search | L | — |
| 7.4 | Data-export request flow (backend dependent) | L | Backend |
| 7.5 | Account deletion request flow (backend dependent) | L | Backend |
| 7.6 | Event bulk import | XL | Backend |
| 7.7 | Audit view for admins | L | Backend |

### 8. Documentation and knowledge

| ID | Task | Est. | Depends on |
| --- | --- | --- | --- |
| 8.1 | Maintain this documentation set | Ongoing | — |
| 8.2 | Update docs in the same PR as changes | Ongoing | — |
| 8.3 | Record architectural decisions as ADRs | Ongoing | — |
| 8.4 | Onboarding walkthrough for new developers | S | — |

### 9. Operations and release

| ID | Task | Est. | Depends on |
| --- | --- | --- | --- |
| 9.1 | Rollback drill | S | — |
| 9.2 | Add the release checklist to the PR template | S | — |
| 9.3 | Version tagging per release | S | — |
| 9.4 | QA/UAT environment configuration | M | Backend |
| 9.5 | Rotate the Firebase service-account key | S | — |

## 3. Suggested sequence

1. **Sprint 1:** 1.1, 1.3, 1.4, 1.5, 2.10, 3.1, 4.3
2. **Sprint 2:** 2.1–2.6, 4.1, 4.5, 5.1, 6.1
3. **Sprint 3:** 2.7, 3.2, 4.2, 6.2–6.5
4. **Sprint 4:** 2.8, 3.3, 5.4, 6.6–6.7
5. **Then:** feature delivery and modernisation

## 4. Definition of done (per task)

- Code reviewed and merged.
- Tests added or updated (where logic changed).
- Build and lint green.
- Documentation updated.
- Deployed to a preview and verified.
- Changelog entry for user-visible changes.
