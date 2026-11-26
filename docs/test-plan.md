# Test Plan

## 1. Purpose

Defines the scope, approach, resources, schedule and responsibilities for testing a release of the
Golden Greetings front end.

## 2. Scope

### In scope

- All screens and routes listed in [`routing-and-navigation.md`](routing-and-navigation.md).
- Authentication paths: password, Google SSO, OTP, MFA, direct login, reset, refresh, logout,
  concurrent login.
- Role-based access and impersonation.
- Client-side validation and error messages.
- Responsive layout (360 px, 768 px, 1280 px).
- Accessibility (keyboard, screen reader, contrast).
- Performance (Lighthouse budgets).
- Supported browsers (last two versions of Chrome, Edge, Firefox, Safari).

### Out of scope

- Backend business logic and database correctness (owned by the backend team).
- Mail transport behaviour.
- Third-party provider internals (Google, ipapi.co, AI providers).
- Load testing of the backend (see [`performance-testing.md`](performance-testing.md) for the
  client-side view).

## 3. Test levels and types

| Level | Owner | When | Artefact |
| --- | --- | --- | --- |
| Unit | Developer | Per change | Jasmine specs |
| Component | Developer | Per change | Jasmine specs |
| Integration | Developer/QA | Per sprint | Manual + planned automated |
| API | QA | Per backend release | Postman/curl collection |
| E2E | QA | Per release candidate | Playwright suite (planned) |
| Performance | QA | Per release | Lighthouse report |
| Security | QA/security | Per release | Checklist + scan |
| Accessibility | QA | Per release | axe + manual |
| Regression | QA | Per release | Full test-case set |
| UAT | Product owner | Before release | Acceptance criteria sign-off |

## 4. Environments

| Environment | Purpose | API | Data |
| --- | --- | --- | --- |
| Local | Development testing | Dev backend | Synthetic |
| PR preview | Review builds | Dev backend | Synthetic |
| Production | Smoke and verification | Production backend | Real (read-only checks) |

The backend CORS allow-list excludes `localhost:12000`; local API testing may need a different
origin or a backend change. See [`troubleshooting-guide.md`](troubleshooting-guide.md).

## 5. Schedule

| Phase | Duration | Activities |
| --- | --- | --- |
| Sprint testing | Continuous | Unit/component tests, exploratory testing of new work |
| Code freeze | Day 0 | Feature complete; regression suite starts |
| Regression | 1–2 days | Full test-case set on desktop and mobile |
| Performance & accessibility | 0.5 day | Lighthouse, axe, keyboard pass |
| Security pass | 0.5 day | Checklist, dependency audit |
| UAT | 1 day | Product owner verifies acceptance criteria |
| Release | 0.5 day | Deploy, smoke test, monitor |

## 6. Entry criteria

- Build passes and is deployed to a preview channel.
- Test data is prepared.
- Acceptance criteria are written and agreed.
- No blocking defect from the previous release.

## 7. Exit criteria

- All must-have acceptance criteria pass.
- No open severity 1 or 2 defect.
- Regression suite executed with a recorded result.
- Performance and accessibility checks recorded.
- Rollback procedure verified.

## 8. Resources

| Resource | Needed |
| --- | --- |
| Browsers | Chrome, Edge, Firefox, Safari (desktop); Chrome and Safari on mobile |
| Devices | Desktop, a 375 px phone, a tablet |
| Accounts | One admin, two standard users, one inactive user, one single-session user, one MFA user |
| Tools | DevTools, Lighthouse, axe, a screen reader (NVDA/VoiceOver), a CSV viewer |
| Test data | Synthetic users, events, festivals, emails, notifications (see [`test-data.md`](test-data.md)) |

## 9. Responsibilities

| Role | Responsibilities |
| --- | --- |
| Developer | Unit/component tests, fix defects, provide test notes |
| QA engineer | Test cases, execution, defect logging, regression |
| Tech lead | Approve strategy, review high-risk areas, sign off technical readiness |
| Product owner | UAT, acceptance sign-off |
| Operations | Verify deployment, monitoring and rollback |

## 10. Risk-based prioritisation

| Priority | Areas |
| --- | --- |
| P1 | Authentication, session refresh, concurrent login, role guards, impersonation |
| P2 | Event creation with media, calendar recurrence, festival wishes, notification publishing |
| P3 | Circles and chat, email status and retry, user management |
| P4 | Seeds, wish images, schedulers, agents, analytics exports |
| P5 | Static pages, theming, copy |

## 11. Defect management

See [`defect-tracking.md`](defect-tracking.md). Defects are logged with severity, priority, steps,
expected/actual, environment, browser and evidence.

## 12. Reporting

A release test report contains:

1. Build/commit under test and preview URL.
2. Test cases executed and pass/fail counts.
3. Defects by severity with links.
4. Coverage summary.
5. Performance and accessibility results.
6. Risks and known issues.
7. Recommendation (release / release with known issues / do not release).

## 13. Suspension and resumption

Suspend testing if the build cannot authenticate, the API is unavailable for more than 30 minutes,
or a P1 defect blocks most flows. Resume when a fixed build is deployed and smoke tests pass.
