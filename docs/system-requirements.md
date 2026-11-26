# System Requirements

## 1. Purpose

This document lists the requirements for the **system as a whole** — the Angular client plus
the backend services it depends on — at a level above individual features. Detailed functional
behaviour is in [`functional-requirements.md`](functional-requirements.md); quality attributes
are in [`non-functional-requirements.md`](non-functional-requirements.md).

## 2. System context

Golden Greetings is delivered as:

| Component | Technology | Owner |
| --- | --- | --- |
| Web client | Angular 17.3 standalone SPA, TypeScript 5.4, RxJS 7.8 | This repository |
| API | Spring Boot REST service (`/api/**`) | Backend repository |
| Real-time | STOMP over WebSocket at `/ws-chat/websocket` | Backend repository |
| Database | Relational store behind JPA | Backend repository |
| Mail | SMTP/provider used by the backend scheduler | Backend/operations |
| Object storage | Presigned uploads for profile pictures and media | Backend/cloud |
| AI providers | Wish generation and admin copilot | Backend/third party |
| Hosting | Firebase Hosting (`chandu-goldengreetings`, region `asia-east1`) | This repository |
| Geolocation | Browser geolocation + `https://ipapi.co/json` | Third party |

## 3. Functional system requirements

| ID | Requirement |
| --- | --- |
| SR-F-01 | The system shall authenticate users with email/password and issue an access token and a refresh token. |
| SR-F-02 | The system shall support Google SSO, email OTP sign-in and one-time direct-login links. |
| SR-F-03 | The system shall support password reset by emailed link and password change while signed in. |
| SR-F-04 | The system shall support optional email OTP as a second factor (MFA). |
| SR-F-05 | The system shall support optional single-session enforcement per account. |
| SR-F-06 | The system shall restrict the client to India (Andhra Pradesh, Telangana). |
| SR-F-07 | The system shall record and display events, birthdays, anniversaries and festivals per user. |
| SR-F-08 | The system shall generate greeting emails from schedules and record each attempt. |
| SR-F-09 | The system shall expose email status by type with retry for failures. |
| SR-F-10 | The system shall let users form mutual circles and chat within them. |
| SR-F-11 | The system shall let administrators manage users, notifications, schedulers, seeds, wish images and festival mappings. |
| SR-F-12 | The system shall publish announcements in real time to signed-in users. |
| SR-F-13 | The system shall provide dashboards for mail delivery and sign-in security analytics. |
| SR-F-14 | The system shall provide AI assistance for delivery triage and administrator questions. |
| SR-F-15 | The system shall support eleven selectable visual themes per user. |
| SR-F-16 | The system shall mask personal data on screen until explicitly revealed. |

## 4. Non-functional system requirements (summary)

| ID | Requirement |
| --- | --- |
| SR-N-01 | First contentful paint ≤ 1.8 s and largest contentful paint ≤ 2.5 s on a mid-range mobile connection. |
| SR-N-02 | Initial JS bundle ≤ 2 MB warning / 4 MB error (Angular budget in `angular.json`). |
| SR-N-03 | All API traffic over HTTPS; no secrets in the bundle. |
| SR-N-04 | UI remains usable from 360 px to 1920 px width. |
| SR-N-05 | Keyboard-operable dialogs, filters and menus; visible focus; ARIA labelling on icon buttons. |
| SR-N-06 | Offline state detected within ~20 s and communicated to the user. |
| SR-N-07 | Static assets cached immutably; entry HTML revalidated hourly. |
| SR-N-08 | No unhandled runtime exception leaves the user on a blank screen; a toast or overlay explains the failure. |

## 5. Interfaces

### 5.1 User interfaces

- Desktop: persistent collapsible sidebar, content area, floating chat widget, banners.
- Tablet: sidebar collapses; tables become cards where implemented (login locations).
- Mobile: slide-down navigation panel, stacked cards, touch gestures in the calendar and chat.

### 5.2 Software interfaces

| Interface | Direction | Protocol | Notes |
| --- | --- | --- | --- |
| REST API | Outbound | HTTPS/JSON | Base URL from `environment.apiUrl` |
| STOMP WebSocket | Outbound | `ws(s)://<api-host>/ws-chat/websocket` | Chat events and notification topics |
| Google Identity Services | Outbound | HTTPS/JS | Loaded on demand on the login page |
| `ipapi.co` | Outbound | HTTPS/JSON | IP geolocation fallback for the location guard |
| CanvasJS | Outbound | Script injected on first chart render | Dashboard only |
| MDB UI Kit / Font Awesome / Google Fonts | Outbound | CDN CSS/JS | Styling and icons |
| Object storage | Outbound | Presigned `PUT`/`POST` | Profile picture upload URL flow |

### 5.3 Communication interfaces

- Bearer JWT in the `Authorization` header on every API call except `ipinfo.io` requests.
- `Content-Type: multipart/form-data` for media uploads and chat attachments.
- WebSocket STOMP frames: `CONNECT`, `SUBSCRIBE`, `SEND`, `MESSAGE`.

## 6. Data requirements

| Data | Sensitivity | Retention (business policy) |
| --- | --- | --- |
| Account identity (name, email, role) | Personal | While the account is active |
| Date of birth | Personal | While the account is active |
| Relationship, wish settings | Personal | While the account is active |
| Events and festivals | Personal | While the account/event is active |
| Chat messages and attachments | Personal/confidential | Backend policy; deletable by the sender |
| Email delivery records (including body and image) | Personal | Backend policy |
| Sign-in location and IP | Personal/security | Backend policy; analytics window in UI is date-bounded |
| Failed sign-in attempts | Security | Backend policy |

See [`data-classification.md`](data-classification.md) and
[`privacy-and-data-retention.md`](privacy-and-data-retention.md).

## 7. Environmental requirements

| Environment | Purpose | API base | Notes |
| --- | --- | --- | --- |
| Local development | Engineering | `https://eventmanagement-backend-m9qy.onrender.com/api` | CORS does not allow `localhost:12000` — see troubleshooting |
| Preview (PR) | Review | Build uses `environment.ts` (dev) unless overridden | Firebase preview channel per PR |
| Production | Live | `environment.prod.ts` placeholder — must be set | Firebase live channel, project `chandu-goldengreetings` |

No separate QA/UAT configuration files exist today; see
[`environment-configuration.md`](environment-configuration.md) for the recommended approach.

## 8. Constraints and dependencies

- Node 18/20 and npm are required to build; Angular CLI is used through `npx`.
- Chrome is required for the Karma test runner as configured.
- The app depends on the backend for every rule that matters for security; the client cannot
  be trusted to enforce authorisation.
- The app depends on `ipapi.co` and browser geolocation for the location gate. If both fail,
  the guard denies access (`getUserLocation()` returns `null`).
- CDN availability affects styling and icons, not core function.

## 9. Acceptance of the system

The system is accepted when every requirement in this document is demonstrably met in
production-like conditions, the test evidence in [`test-coverage-report.md`](test-coverage-report.md)
is current, and the operational runbooks in [`operations-runbook.md`](operations-runbook.md)
have been exercised at least once.
