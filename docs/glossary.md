# Glossary

## Business and domain terms

| Term | Meaning |
| --- | --- |
| **Anniversary** | An event that repeats yearly on the same month/day, unless marked non-recurring. Shows a milestone ("10th anniversary") when the year difference is plausible. |
| **Birthday** | A recurring yearly celebration derived from a user's date of birth; drives birthday emails and calendar entries. |
| **Celebration** | Umbrella term for a festival, birthday, anniversary or other event shown on the calendar. |
| **Circle** | A mutual, accepted link between two users ("Family & Friends"). It exists only after the recipient accepts. |
| **Circle request** | A pending invitation in one direction. Sending to someone who already invited you accepts theirs instead. |
| **Concurrent login / single-session** | An account setting (`concurrentLoginAllowed`). When off, a new sign-in revokes earlier refresh tokens and the superseded session is told why. |
| **Delivery health** | Percentage of today's mail sent rather than failed. ≥ 98% good, ≥ 90% warn, else bad. |
| **Direct login** | Signing in with a one-time token from an email link instead of a password. |
| **Event** | A dated celebration belonging to a user, with an event type and optional recurrence, media and wishes link. |
| **Event type** | A classification of an event (Birthday, Anniversary, Engagement, Festival), sourced from event-type seeds. |
| **Festival** | A recurring cultural celebration stored per year by the backend (e.g. Diwali). Drives festival wish emails. |
| **Festival wish mapping** | The link between one festival and one user, carrying note, image, wishes link, active state and last-send result. |
| **Good morning / good night wish** | Optional daily greeting emails enabled in wish settings. |
| **Greeting media** | An image, video, audio file or PDF attached to an event (or a wish image in the admin library) and used in the greeting email. |
| **Impersonation** | An admin "logging in as" a non-admin user to see the product as they do, while keeping the admin token. |
| **Mapping status** | Derived state of a festival wish mapping: `active`, `inactive` (turned off) or `failed` (last send failed). |
| **MFA** | Multi-factor authentication: after the password, the backend emails a one-time code. |
| **Milestone** | The ordinal year count shown for a birthday or anniversary ("25th"). |
| **Notification** | An announcement authored by an admin, optionally scheduled, shown as an in-app banner and possibly emailed. |
| **Occurrence** | The date on which a celebration next falls, on or after today. |
| **Recurring** | Repeats every year on the same month/day. Feb 29 falls on Feb 28 in non-leap years. |
| **Relationship seed** | A configurable relationship label (Mother, Friend) used when creating users and in wish prompts. |
| **Scheduler** | A backend job (birthday sender, festival sender) that the admin console can list and trigger. |
| **Seed** | Reference data managed by admins: relationship seeds and event-type seeds. |
| **Sensitive data** | Personal values masked on screen until explicitly revealed (emails, codes). |
| **Suspicion level** | Failed-sign-in risk score for an IP or email: high, medium or low. |
| **Theme** | One of eleven visual skins selected per user and applied via `data-theme` on `<html>`. |
| **Violated user** | A record of a failed sign-in attempt (email, IP, location, time) used for abuse detection. |
| **Wish image** | An admin-uploaded greeting image used as a fallback for a generated wish, optionally scoped to a user. |
| **Wish preview** | A once-per-session modal showing the signed-in user a sample of the wish they would receive. |
| **Wishes link / wishes URL** | An optional absolute `http(s)` URL added to a greeting email, pointing at a custom wishes page. |

## Roles and access

| Term | Meaning |
| --- | --- |
| **Guest** | A visitor without a session. |
| **User** | An account with `ROLE_USER`. |
| **Admin** | An account with `ROLE_ADMIN`; sees the Admin section and security analytics. |
| **Guard** | An Angular route guard that allows, redirects or blocks navigation. |
| **Location guard** | Allows only India → Andhra Pradesh or Telangana. |

## Technical terms

| Term | Meaning |
| --- | --- |
| **Access token** | Short-lived JWT sent as `Authorization: Bearer …`. |
| **ADR** | Architecture Decision Record — a short document capturing a decision and its rationale. |
| **API base URL** | `environment.apiUrl`; all REST paths are appended to it. |
| **BulkSelection** | Helper that tracks ticked rows for batch actions and drops ids that leave the page. |
| **CanvasJS** | Charting library injected on first chart render. |
| **Connectivity probe** | A `no-cors` `HEAD` request to the API origin used to decide whether the app is offline. |
| **CORS** | Cross-Origin Resource Sharing; a browser rule the backend must allow for the UI origin. |
| **Email status record** | One row in the delivery log: recipient, subject, body, status, type, sent time, optional image. |
| **Idle preloading** | Loading lazy route chunks only when the browser is idle. |
| **Interceptor** | Angular HTTP middleware; here `loadingInterceptor` and `authInterceptor`. |
| **JWT** | JSON Web Token; the format of the access token. |
| **Karma / Jasmine** | Test runner and assertion library used by `ng test`. |
| **LCP / CLS / TBT** | Largest Contentful Paint, Cumulative Layout Shift, Total Blocking Time — Lighthouse metrics. |
| **Lazy route** | A route whose component is loaded on demand with `loadComponent`. |
| **Local/session storage** | Browser stores used for tokens and preferences; "remember me" chooses which. |
| **MDB UI Kit** | Bootstrap-based CSS/JS kit loaded from a CDN. |
| **MediaValidation** | Backend rules for accepted file types and sizes, mirrored in `media.ts`. |
| **NG0600** | Angular error raised when a signal is written inside an `effect()` without `allowSignalWrites`. |
| **normalizePaged / normalizeCollection** | Helpers that accept arrays, paged objects or wrapped responses. |
| **Refresh token** | Long-lived token used to obtain a new access token. |
| **ROLE_ADMIN / ROLE_USER** | The two role constants in `roles.constants.ts`. |
| **SensitiveEmailPipe / SensitiveValuePipe** | Impure pipes that mask values based on the shared reveal toggle. |
| **Signal** | Angular reactive primitive used for shared state (`signal`, `computed`). |
| **Standalone component** | Angular component that declares its own imports and needs no NgModule. |
| **STOMP** | Simple Text Oriented Messaging Protocol, spoken over the WebSocket for chat and notifications. |
| **Toast** | Transient on-screen message (success, error, warning, info). |
| **Topic** | A STOMP destination such as `/topic/notifications`. |
| **`data-theme`** | Attribute on `<html>` that selects the active theme in `themes.css`. |

## Abbreviations

| Abbreviation | Expansion |
| --- | --- |
| AC | Acceptance criteria |
| ADR | Architecture Decision Record |
| API | Application Programming Interface |
| CDN | Content Delivery Network |
| CI/CD | Continuous Integration / Continuous Delivery |
| CLS | Cumulative Layout Shift |
| CORS | Cross-Origin Resource Sharing |
| CSV | Comma-Separated Values |
| DOB | Date of birth |
| E2E | End-to-end |
| FR | Functional requirement |
| ICS | iCalendar file format (`.ics`) |
| JWT | JSON Web Token |
| KPI | Key Performance Indicator |
| LCP | Largest Contentful Paint |
| MFA | Multi-Factor Authentication |
| NFR | Non-functional requirement |
| OTP | One-Time Password |
| RBAC | Role-Based Access Control |
| REST | Representational State Transfer |
| SPA | Single-Page Application |
| SSO | Single Sign-On |
| STOMP | Simple Text Oriented Messaging Protocol |
| TBT | Total Blocking Time |
| TLS | Transport Layer Security |
| UC | Use case |
| US | User story |
| WCAG | Web Content Accessibility Guidelines |
| WS | WebSocket |
