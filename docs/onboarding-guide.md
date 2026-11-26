# Onboarding Guide

A guided path from "I have repository access" to "I can ship a change confidently".

## 1. Day 1 — Get it running

### Setup

- [ ] Node 18 or 20 installed (`node -v`).
- [ ] `npm ci` completes.
- [ ] Dev account from the team.
- [ ] Editor with the Angular Language Service.

### Run

```bash
npx ng serve --host 0.0.0.0 --port 12000 --allowed-hosts all
```

- [ ] The login page renders with styling.
- [ ] You can sign in.
- [ ] The dashboard shows data.

### If something fails

| Problem | See |
| --- | --- |
| Redirected to `/restricted-region` | [`troubleshooting-guide.md`](troubleshooting-guide.md) §1 |
| API calls fail with status 0 | [`troubleshooting-guide.md`](troubleshooting-guide.md) §1 (CORS) |
| `ng test` fails | [`unit-testing.md`](unit-testing.md) |
| `npm run lint` fails | Expected; no ESLint yet |

## 2. Day 2 — Understand the product

Read, in this order:

1. [`project-overview.md`](project-overview.md) — what the product does and for whom.
2. [`glossary.md`](glossary.md) — the domain vocabulary (circle, festival, mapping, occurrence…).
3. [`functional-requirements.md`](functional-requirements.md) — the feature list with IDs.
4. [`ui-ux-design.md`](ui-ux-design.md) — layout, tokens, themes.

Then use the app as a user:

- [ ] Create an event for yourself.
- [ ] Look at the calendar and jump a year.
- [ ] Send a circle request to a second account and chat.
- [ ] Open your account page and change the theme.

## 3. Day 3 — Understand the code

1. [`system-architecture.md`](system-architecture.md) — the big picture.
2. [`frontend-design.md`](frontend-design.md) — structure and conventions.
3. [`routing-and-navigation.md`](routing-and-navigation.md) — every route and guard.
4. [`state-management.md`](state-management.md) — where state lives.
5. [`component-documentation.md`](component-documentation.md) — the shared components.

Then trace two flows in the code:

**Flow A — sign-in**

`login.component.ts` → `AuthService.login` → `setSession` → `authInterceptor` →
`AuthService.refreshToken` (later) → `concurrent-login-overlay` (if superseded).

**Flow B — event with media**

`event-editor.component.ts` → `media.ts` (`mediaError`) → `ApiService.saveEventWithImage` →
`eventFormData` → backend → toast → `/events` list.

## 4. Day 4 — Read the rules

1. [`coding-standards.md`](coding-standards.md)
2. [`secure-coding-guidelines.md`](secure-coding-guidelines.md)
3. [`contribution-guide.md`](contribution-guide.md)
4. `AGENTS.md` — repository-specific notes (theming, media, circles/chat, concurrent login,
   calendar, offline, performance).

Pay special attention to:

- Never write signals inside `effect()`; use `queueMicrotask`.
- Never call `HttpClient` from a component.
- Always mask personal data with the pipes.
- Always confirm destructive actions.
- A translucent `--nav-bg` theme must set `--nav-panel-bg`.

## 5. Week 1 — First change

Good first tasks:

- Add a unit test for an untested utility (`wishes-url.ts`, `csv.ts`, `event.utils.ts`).
- Fix a known S3/S4 issue from [`known-issues.md`](known-issues.md).
- Improve an empty state or error message.
- Add `aria-label` where missing.

Process:

1. Branch `feature/<name>` from `main`.
2. Make the change; add tests if logic changed.
3. `npx ng build` and, if possible, `npx ng test`.
4. Open a PR using the template.
5. Address review comments.
6. Verify on the Firebase preview URL.
7. Merge after approval.

## 6. Week 2–4 — Own an area

Pick one area and become its owner:

| Area | Start here |
| --- | --- |
| Calendar | `calendar.component.ts`, `calendar.utils.ts`, `festival-wishes-panel.component.ts` |
| Events | `events.component.ts`, `event-editor.component.ts`, `event.utils.ts` |
| Chat | `chat-widget.component.ts`, `chat.service.ts`, `circle-chat.ts` |
| Admin | `users`, `login-locations`, `violated-users`, `schedulers`, `agents` |
| Platform | `app.component.ts`, services, interceptors, `styles.css`/`themes.css` |

For your area:

- [ ] Read every file in the folder.
- [ ] Run its flows end to end.
- [ ] Read its tests.
- [ ] Identify one improvement and ship it.

## 7. Key concepts to internalise

| Concept | Why it matters |
| --- | --- |
| Backend is the security boundary | Client guards are UX, not authorisation |
| Tokens live in web storage | XSS discipline and no token logging |
| Concurrent login | Single-session accounts get a blocking notice |
| Circle gating | Chat may be limited to accepted members |
| Per-year festivals | The calendar requests the viewed year |
| Recurrence rules | Feb 29 → Feb 28; only non-recurring anniversaries are exact |
| Published notifications are immutable | Unpublish before editing |
| Masking by default | Emails and sensitive values are hidden |
| Media limits | Image 5 MB, video 50 MB, audio 10 MB, PDF 20 MB |
| Theme tokens | Never hardcode colours |
| NG0600 | No signal writes inside effects |

## 8. Where to find things

| I need… | Look in |
| --- | --- |
| A route | `app.routes.ts`, [`routing-and-navigation.md`](routing-and-navigation.md) |
| An API call | `core/services/api.service.ts`, [`frontend-api-integration.md`](frontend-api-integration.md) |
| A data shape | `core/models/` |
| A guard or interceptor | `core/guards/`, `core/interceptors/` |
| A validation rule | `core/utils/`, [`form-validation.md`](form-validation.md) |
| A design token | `styles.css`, `themes.css`, [`ui-ux-design.md`](ui-ux-design.md) |
| A test example | Any `*.spec.ts`; [`unit-testing.md`](unit-testing.md) |
| A process | [`contribution-guide.md`](contribution-guide.md), [`release-management.md`](release-management.md) |
| A decision | [`decision-log.md`](decision-log.md), ADRs |

## 9. People and contacts

| Need | Who |
| --- | --- |
| Product questions | Product owner |
| Backend contract | Backend team |
| Access and secrets | Operations |
| Security review | Security lead |
| Release approval | Tech lead |

(Fill in names in your local copy; do not commit personal contact details if the repository is
public.)

## 10. First-week checklist

- [ ] App runs locally and you can sign in.
- [ ] You have read the overview, glossary and functional requirements.
- [ ] You have traced the sign-in and event-save flows.
- [ ] You have read the coding and security standards.
- [ ] You have opened and merged one small PR.
- [ ] You know where the documentation lives.

## 11. Common beginner mistakes

| Mistake | Consequence | Fix |
| --- | --- | --- |
| Writing signals in `effect()` | NG0600 error | `queueMicrotask` |
| Calling `HttpClient` directly | Inconsistent auth/loading/error handling | Use `ApiService` |
| Forgetting `takeUntilDestroyed` | Leaked subscriptions | Add it |
| Hardcoding a colour | Theme breaks | Use a token |
| Rendering user text with `[innerHTML]` | XSS risk | Interpolate |
| Using `new Date('2026-03-01')` in tests | Time-zone flakiness | `new Date(2026, 2, 1)` |
| Not masking an email | Privacy issue | Use `sensitiveEmail` |
| Adding a CDN script without pinning | Supply-chain risk | Pin the version |
