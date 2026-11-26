# End-to-End Testing

## 1. Status

There is **no end-to-end suite** in the repository (no Playwright, Cypress or Protractor
configuration). This document defines the suite to build and the manual equivalents that should be
run today.

## 2. Why E2E matters here

Unit tests cover date maths, validation and session rules, but they cannot catch:

- A guard redirect that breaks a real navigation.
- A form that sends the wrong payload shape.
- A WebSocket message that never reaches the UI.
- A theme or layout regression that hides a control.
- A backend contract change.

A small, stable E2E suite focused on critical journeys gives the highest confidence per minute.

## 3. Recommended stack

| Concern | Choice | Reason |
| --- | --- | --- |
| Runner | Playwright | Fast, reliable auto-waiting, built-in trace viewer, multi-browser |
| Language | TypeScript | Same as the app |
| Assertions | Playwright `expect` | Auto-retrying |
| Test data | Seeded via API before each journey | Deterministic |
| Auth | Storage-state reuse per role | Avoid signing in for every test |
| CI | Run on PR against a preview channel | Catches integration breakage |

## 4. Critical journeys

| ID | Journey | Steps | Assertions |
| --- | --- | --- | --- |
| E2E-01 | Sign in and land on dashboard | Open `/login`, sign in | Dashboard heading, KPI cards, no console errors |
| E2E-02 | Create an event with media | `/events/new`, fill, attach a PNG, save | Success toast; row in `/events` with a thumbnail |
| E2E-03 | Calendar shows next year's festivals | `/calendar`, jump a year | A known festival appears on its month/day |
| E2E-04 | Circle request and chat | Send a request, accept as the other user, send a message | Message visible to both |
| E2E-05 | Publish a notification | Admin publishes; user reloads | Banner shows the title and message |
| E2E-06 | Retry a failed email | Filter failed, retry | Status changes; toast |
| E2E-07 | Concurrent login notice | Sign in twice with single-session on | Notice visible; sign-in again works |
| E2E-08 | Role restriction | User opens `/users` | Redirected to `/dashboard` |
| E2E-09 | Region restriction | Mock location outside AP/Telangana | `/restricted-region` |
| E2E-10 | Offline and recovery | Go offline, wait, go online | Offline overlay, then "back online", same route |

## 5. Example structure

```
e2e/
  fixtures/
    users.ts            # test accounts and roles
    media.ts            # paths to fixture files
  support/
    auth.setup.ts       # sign in once per role, save storage state
    api.ts              # seed and clean data through the API
  tests/
    auth.spec.ts
    events.spec.ts
    calendar.spec.ts
    circles-chat.spec.ts
    notifications.spec.ts
    email-status.spec.ts
    access.spec.ts
    resilience.spec.ts
  playwright.config.ts
```

`playwright.config.ts` essentials:

- `use.baseURL` from an environment variable.
- Projects for `chromium`, `firefox`, `webkit` and one mobile viewport.
- `storageState` per role project.
- `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`.
- One worker in CI for data stability; parallel locally with isolated data.

## 6. Data strategy

1. **Seed through the API**, not the UI, so setup is fast and independent of UI changes.
2. **Unique prefixes** per run (e.g. `e2e-<timestamp>-event`) so parallel runs do not collide.
3. **Clean up** created records in an `afterEach` or via a nightly reset.
4. **Never depend on production data.**
5. **Avoid real emails**: use reserved domains and a mail sink, or disable sends on the test
   environment.

## 7. Flakiness controls

| Risk | Control |
| --- | --- |
| Slow backend cold start | Retry the first navigation with a generous timeout |
| WebSocket timing | Assert on UI state with auto-waiting, not fixed sleeps |
| Date-dependent assertions | Seed dates relative to "today" computed in the test |
| Animation | Disable animations in the test build or wait for stable state |
| Toast timing | Assert immediately; toasts auto-dismiss |
| Theme/layout | Fix the theme to `default` for E2E |
| Shared accounts | One account per role per run, or serialise tests |

## 8. Manual E2E script (current practice)

Until the suite exists, run this before each release:

1. Sign in as admin → dashboard loads with values.
2. Create an event with an image → appears with a thumbnail.
3. Open the calendar → jump a year → festival appears.
4. Open a festival → link a user → bulk message confirms.
5. Send a circle request → accept with the second account → send a chat message → receive it.
6. Publish a notification → reload as a user → banner appears.
7. Filter failed emails → retry one → status changes.
8. Deactivate a user → the user can no longer sign in.
9. Sign in with a single-session account on two browsers → the older one shows the notice.
10. Sign in as a user → open `/users` → redirected.
11. Go offline → overlay → online → "back online".
12. Check the console for errors after each step.

## 9. CI integration

```yaml
- name: E2E
  run: npx playwright test
  env:
    BASE_URL: ${{ steps.deploy.outputs.preview_url }}
    E2E_USER: ${{ secrets.E2E_USER }}
    E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
```

Publish the HTML report as an artefact and the trace on failure.

## 10. Exit criteria

- All ten journeys pass on the preview channel.
- No uncaught console errors.
- No flaky retries needed on a clean run.
