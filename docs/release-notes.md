# Release Notes

## Unreleased

### Added

- Full project documentation set under `docs/` covering business, architecture, frontend, testing,
  deployment, security, operations and project management.
- Root `README.md` describing features, prerequisites, run, build and deploy steps.

### Changed

- Documentation now reflects the actual application (Golden Greetings), replacing the older
  minimal README.

### Known issues

- `ng test` requires a `karma.conf.js` (see [`unit-testing.md`](unit-testing.md)).
- `npm run lint` requires an ESLint configuration.
- `environment.prod.ts` still contains a placeholder API URL.
- The location guard is client-side only.
- No client error reporting.

---

## 1.0.0

Initial documented baseline of the Golden Greetings front end.

### Features

- **Authentication:** password sign-in, Google SSO, OTP sign-in, one-time direct links, password
  reset and change, optional MFA, optional single-session, refresh, auto sign-out, concurrent-login
  notice.
- **Dashboard:** users, upcoming events, sent/failed mail, delivery health, OTP and
  forgot-password flow cards, CanvasJS charts with a date range and presets.
- **Events:** list, search, filters, sort, create/edit with greeting media, recurring or one-time,
  wishes links, next-occurrence preview, single and bulk delete, media lightbox.
- **Calendar:** month/week/day/agenda views, kind filters, year jump, upcoming strip, `.ics`
  download, Google Calendar link, copy summary, festival wish panel, persisted preferences.
- **Festival wishes:** admin mapping list with filters and summary, bulk linking, notes, wishes
  links, images, active state, failure tracking.
- **Family & Friends:** mutual circles with directory search, request lifecycle and presence.
- **Chat:** conversations, attachments, replies, edits, reactions, multi-delete, in-thread search,
  starred messages, typing/seen, presence, circle-only gating.
- **Email status:** delivery log by type, desktop/mobile preview, on-demand images, retry, delete,
  bulk delete, test email.
- **Notifications:** admin authoring with scheduling, publish/unpublish, live banner and toast.
- **Administration:** users and impersonation, login locations, violated users, schedulers, AI
  agents (delivery-ops and copilot), wish images, relationship and event-type seeds.
- **Account:** profile, wish settings, MFA, single-session, theme picker, password change, profile
  picture, AI balance (admin).
- **Platform:** 11 themes, responsive layout, offline overlay, global loading, toasts,
  confirmations, sensitive-data masking, media validation, CSV safety, idle preloading, Firebase
  hosting configuration and CI workflows.

### Security

- Bearer JWT with refresh and proactive renewal.
- Route guards for authentication, role, location and reset links.
- Masking of personal data by default.
- URL validation for user-supplied links.
- CSV formula-injection protection.
- No secrets in the bundle.

### Known limitations

See [`known-issues.md`](known-issues.md) for the full list, including the missing Karma config,
missing lint config, placeholder production API URL, client-only region guard and absent error
reporting.
