# Project Plan

## 1. Context

Golden Greetings UI is an existing Angular 17 application in production on Firebase Hosting. This
plan therefore covers **continuing delivery**: stabilising the engineering baseline, closing known
gaps, and adding features on a predictable cadence.

## 2. Objectives for the planning horizon

| # | Objective | Success measure |
| --- | --- | --- |
| O1 | Restore a working automated test gate | `ng test` runs in CI; coverage reported |
| O2 | Remove release-blocking configuration gaps | Production API URL set; lint configured |
| O3 | Improve reliability | No client-error blind spot; HTTP timeouts |
| O4 | Improve security posture | CSP and security headers live; region enforcement server-side |
| O5 | Improve performance | LCP ≤ 2.5 s maintained; bundle under budget |
| O6 | Improve accessibility | No critical axe issues on five key screens |
| O7 | Deliver planned features | Per the roadmap |

## 3. Phases

### Phase 0 — Baseline (2 weeks)

| Activity | Output |
| --- | --- |
| Fix `karma.conf.js`; enable coverage | `ng test` green locally and in CI |
| Add ESLint + Prettier | `npm run lint` green |
| Set the production `apiUrl` | Correct release configuration |
| Remove unrouted placeholder components | Smaller surface, less confusion |
| Add `npm audit` to CI | Supply-chain gate |
| Document the current state | This documentation set |

### Phase 1 — Hardening (3–4 weeks)

| Activity | Output |
| --- | --- |
| Client error reporting (Sentry) with PII scrubbing | Production visibility |
| HTTP timeout + consistent error handling | No infinite loading |
| Security headers (CSP report-only, then enforced) | Defence in depth |
| Self-host MDB/Font Awesome or add SRI | Supply-chain resilience |
| Uptime monitoring + synthetic journey | Faster detection |
| E2E suite for seven critical journeys | Regression safety |

### Phase 2 — Feature delivery (ongoing)

| Theme | Candidate work |
| --- | --- |
| Calendar | Saved filter sets, week-start preference, richer agenda |
| Chat | Read receipts polish, message search across threads, attachment previews |
| Events | Bulk import, recurring exceptions |
| Admin | Saved views, audit view, richer agent reports |
| Account | Data export request, account deletion request |
| Accessibility | Per-route titles, focus management, live regions |

### Phase 3 — Modernisation (next major cycle)

| Activity | Output |
| --- | --- |
| Angular major upgrade | Supported version |
| Adopt `@if`/`@for`, `OnPush` | Smaller bundles, less change detection |
| Split `ApiService` by domain | Maintainability |
| Consider a design-system consolidation | One styling approach |

## 4. Milestones

| Milestone | Criteria | Target |
| --- | --- | --- |
| M1 Baseline restored | Tests and lint run in CI; prod URL set | End of Phase 0 |
| M2 Observability | Error reporting + uptime monitor live | Mid Phase 1 |
| M3 Security headers | CSP enforced without breakage | End of Phase 1 |
| M4 E2E gate | Seven journeys green in CI | End of Phase 1 |
| M5 Feature release | Planned features shipped | Per quarter |
| M6 Framework upgrade | Angular next major | Per annual plan |

## 5. Team and capacity

| Role | Allocation | Responsibilities |
| --- | --- | --- |
| Front-end lead | 1 FTE | Architecture, review, releases |
| Front-end developer(s) | 1–2 FTE | Features, tests, fixes |
| QA | 0.5 FTE | Test cases, regression, accessibility |
| Product owner | 0.3 FTE | Priorities, acceptance |
| Backend liaison | As needed | Contract changes, CORS, data |

## 6. Cadence

| Ceremony | Frequency | Purpose |
| --- | --- | --- |
| Planning | Every 2 weeks | Select and size work |
| Stand-up | Daily | Progress and blockers |
| Review | Every 2 weeks | Demonstrate on a preview channel |
| Retrospective | Every 2 weeks | Improve process |
| Release | Weekly or per sprint | Deploy to live |
| Triage | Weekly | Defects and known issues |

## 7. Dependencies

| Dependency | Impact if late |
| --- | --- |
| Backend contract changes | Blocks feature work |
| CORS updates for new origins | Blocks preview/local testing |
| Backend region enforcement | Security objective O4 |
| Firebase project access | Blocks deploys |
| Design decisions on themes | Blocks UI work |

## 8. Risks (summary)

See [`risk-register.md`](risk-register.md). Top risks: no test gate, placeholder production config,
no error visibility, client-only region enforcement.

## 9. Assumptions

- The backend remains backward compatible within a release.
- The team can add CI steps (tests, lint, audit).
- Firebase remains the hosting platform for the horizon.
- The region restriction remains a requirement.

## 10. Reporting

| Report | Frequency | Content |
| --- | --- | --- |
| Sprint status | Every 2 weeks | Done, in progress, blocked, risks |
| Release notes | Per release | Features, fixes, known issues |
| Quality dashboard | Monthly | Coverage, audit findings, Lighthouse, open defects |
| Risk review | Monthly | Register updates |
