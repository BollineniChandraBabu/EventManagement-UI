# Changelog

All notable changes to this project. The format follows *Keep a Changelog* and the project aims to
use Semantic Versioning.

## [Unreleased]

### Added

- `docs/` documentation set (business, architecture, frontend, testing, deployment, security,
  operations, project management) and `docs/README.md` index.
- Expanded root `README.md`.

### Changed

- Root `README.md` rewritten to describe the actual product, prerequisites and commands.

### Fixed

- (none)

### Removed

- (none)

---

## [1.0.0] — Baseline

The baseline release captured by this documentation set.

### Added

- JWT authentication: password, Google SSO, OTP, direct login, reset/change password, optional MFA,
  optional single-session, refresh, auto sign-out.
- Concurrent-login detection and blocking notice.
- Role-based navigation and route guards, including the region guard.
- Dashboard with KPIs, mail-flow cards and CanvasJS charts.
- Events management with media upload, wishes links, recurrence and bulk delete.
- Calendar with four views, kind filters, year navigation, exports and the festival wish panel.
- Festival wish mappings with bulk linking, notes, images and failure tracking.
- Family & Friends circles with directory search and request lifecycle.
- Chat widget with attachments, replies, reactions, edits, deletes, search, stars, presence and
  circle gating.
- Email status with type-specific views, previews, on-demand images, retry and delete.
- Notifications with scheduling, publish/unpublish and a live banner.
- Admin console: users, impersonation, login locations, violated users, schedulers, AI agents,
  wish images, seeds.
- Account page with wish settings, security settings, theme picker, password change and profile
  picture.
- Eleven themes with per-theme tokens.
- Offline detection overlay, global loading overlay, toasts and confirmation dialogs.
- Sensitive-data masking with a reveal toggle.
- Client-side media validation mirroring the backend.
- Idle route preloading, deferred third-party scripts, on-demand charts.
- Firebase Hosting configuration and GitHub Actions preview/live deployments.

### Security

- Tokens in browser storage with both stores cleared on logout.
- 401 refresh-and-retry; 403 sign-out.
- URL validation, CSV injection protection, sanitised HTML rendering.

### Known issues

- No `karma.conf.js`; `ng test` cannot run as configured.
- No ESLint configuration.
- Placeholder production API URL.
- Client-only region restriction.
- No client error reporting.
- Unrouted placeholder components (`templates`, `ai-wishes`, `change-password`).

---

## Versioning policy

| Change | Version |
| --- | --- |
| Breaking change | Major |
| New feature | Minor |
| Fix or internal | Patch |

## How to update this file

Add entries under **Unreleased** as changes merge. On release:

1. Move the entries under a new version heading with the date.
2. Update [`release-notes.md`](release-notes.md) with user-facing highlights.
3. Tag the commit.
