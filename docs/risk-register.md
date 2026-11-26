# Risk Register

Likelihood (L) and impact (I) are rated 1–5. Score = L × I. Bands: ≥ 15 high, 8–14 medium, ≤ 7 low.

## 1. Active risks

| ID | Risk | L | I | Score | Mitigation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-01 | No automated test gate in CI (missing `karma.conf.js`, no test step) | 5 | 4 | 20 | Add the Karma config, run tests in CI, add coverage | Front-end lead | Open |
| R-02 | Production environment file contains a placeholder API URL | 3 | 5 | 15 | Set the real URL; add a release checklist item | Ops | Open |
| R-03 | No client error reporting; production faults are invisible | 4 | 4 | 16 | Add Sentry with PII scrubbing | Front-end | Open |
| R-04 | Region restriction is client-side only | 4 | 4 | 16 | Enforce on backend/edge | Backend lead | Open |
| R-05 | Third-party CDN scripts without CSP/SRI | 3 | 4 | 12 | CSP, self-host or SRI | Front-end | Open |
| R-06 | Tokens in web storage (XSS impact) | 3 | 4 | 12 | CSP, sanitisation, short lifetime | Front-end | Accepted |
| R-07 | Backend contract change breaks a screen | 3 | 4 | 12 | Contract tests, tolerant normalisation, coordination | Both teams | Open |
| R-08 | CORS misconfiguration blocks a new environment | 3 | 4 | 12 | Checklist per environment; coordinate with backend | Ops | Open |
| R-09 | No E2E coverage of critical journeys | 4 | 3 | 12 | Add Playwright suite | QA | Open |
| R-10 | Location lookup unavailable blocks legitimate users | 3 | 3 | 9 | Server-side control; operational override | Product | Open |
| R-11 | WebSocket unavailable disables live chat/notifications | 3 | 3 | 9 | REST fallback; reconnect logic | Front-end | Partly mitigated |
| R-12 | No HTTP timeout; hung requests block the UI | 3 | 3 | 9 | Add a timeout with a user-facing error | Front-end | Open |
| R-13 | Bundle grows past the budget | 3 | 3 | 9 | Budgets, lazy loading, review | Front-end | Controlled |
| R-14 | Theme contrast/readability regressions | 3 | 2 | 6 | Per-theme audit | QA | Open |
| R-15 | Unrouted placeholder components confuse maintenance | 3 | 2 | 6 | Remove or implement | Front-end | Open |
| R-16 | Test data leaks into production | 2 | 4 | 8 | Explicit environments; cleanup | QA | Controlled |
| R-17 | Key-person dependency on one front-end engineer | 3 | 4 | 12 | Documentation, pairing, onboarding guide | Lead | Open |
| R-18 | Firebase project access lost | 2 | 5 | 10 | Two owners; documented recovery | Ops | Open |
| R-19 | Accessibility regressions | 3 | 3 | 9 | Per-release axe + keyboard pass | QA | Open |
| R-20 | AI provider quota exhaustion disables wish/copilot | 3 | 3 | 9 | Balance monitoring; graceful errors | Ops | Open |

## 2. Detail for high risks

### R-01 No automated test gate

- **Why it matters:** regressions reach production; the existing 16 specs provide no protection if
  they never run.
- **Trigger:** a merge that breaks a guard, interceptor or date calculation.
- **Mitigation:** add `karma.conf.js`, a CI quality job, coverage reporting, then grow the suite.
- **Residual:** low once implemented.

### R-02 Placeholder production API URL

- **Why it matters:** a production deploy would be non-functional.
- **Detection:** the release checklist and a post-deploy smoke test.
- **Mitigation:** set the URL; add an assertion in the build/release process (e.g. fail the release
  if `your-backend-domain` is present).

### R-03 No client error reporting

- **Why it matters:** the team learns about faults from users, often late.
- **Mitigation:** Sentry (or equivalent) with strict scrubbing; alert on error spikes.
- **Constraint:** never send tokens, request bodies or personal data.

### R-04 Client-only region restriction

- **Why it matters:** a stated business constraint is not enforced.
- **Mitigation:** backend or edge geofencing; the client guard remains a UX aid.
- **Accepted interim:** documented in [`threat-model.md`](threat-model.md).

### R-17 Key-person dependency

- **Why it matters:** one engineer holds most of the context.
- **Mitigation:** this documentation set, [`onboarding-guide.md`](onboarding-guide.md), pairing,
  code review rotation.

## 3. Closed risks

| ID | Risk | Closed because |
| --- | --- | --- |
| — | — | — |

## 4. Review process

| Cadence | Action |
| --- | --- |
| Monthly | Review scores, owners and statuses |
| Per release | Check whether any risk materialised |
| Per incident | Add a risk if a new failure mode was found |

## 5. Escalation

A risk becomes an incident when it materialises. Follow
[`incident-management.md`](incident-management.md). A risk that cannot be mitigated within the
current plan must be escalated to the product owner with a recommendation (accept, defer, or
change scope).
