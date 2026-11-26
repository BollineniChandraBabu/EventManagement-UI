# Business Requirements

## 1. Purpose

This document states the business problems Golden Greetings addresses, the goals the product
must achieve, the outcomes expected, and the constraints the business imposes. It is the basis
for [`functional-requirements.md`](functional-requirements.md) and
[`acceptance-criteria.md`](acceptance-criteria.md).

## 2. Problem statements

| ID | Problem | Who feels it | Current consequence |
| --- | --- | --- | --- |
| BP-1 | Family celebrations are scattered across notebooks, phone calendars and memory | Individual users | Missed birthdays and anniversaries; last-minute, impersonal greetings |
| BP-2 | Sending a personal greeting to many people is repetitive | Users and the operations team | Generic messages, or hours spent writing and sending |
| BP-3 | Festival dates move every year and differ by region | Users | Reminders fire on the wrong day, or not at all |
| BP-4 | Users want to share celebrations and talk privately with family, not on a public social network | Users | Over-sharing, or staying on public platforms to stay in touch |
| BP-5 | The operations team cannot see whether greetings were actually delivered | Operations | Silent failures; users lose trust |
| BP-6 | Account takeovers and credential-guessing go unnoticed | Operations and users | Compromised accounts, spam, reputational damage |
| BP-7 | Administrative work (users, announcements, retries) is spread across tools | Operations | Slow response, inconsistent data, manual errors |

## 3. Business goals

| ID | Goal | Linked problems | Measure of success |
| --- | --- | --- | --- |
| BG-1 | Capture every celebration a user cares about in one place | BP-1, BP-3 | ≥ 90% of active users have at least one event recorded |
| BG-2 | Deliver greetings automatically and on time | BP-1, BP-2, BP-3 | ≥ 98% daily delivery success; zero missed scheduled sends |
| BG-3 | Make every greeting feel personal | BP-2 | Most greetings carry a custom image, note or wishes link |
| BG-4 | Provide a private social space for family and friends | BP-4 | Circles used by the majority of active users; chat limited to circle members |
| BG-5 | Make delivery transparent and recoverable | BP-5 | Every failed email visible and retryable within one day |
| BG-6 | Detect and contain account abuse | BP-6 | Failed sign-ins from suspicious IPs surfaced; single-session option available |
| BG-7 | Consolidate operations into one console | BP-7 | Admins complete routine tasks without leaving the product |

## 4. Expected outcomes

1. **For users**
   - A single, trustworthy record of birthdays, anniversaries, festivals and events.
   - Greetings that arrive on the right day, addressed to the right person, with personal touches.
   - Control over which categories of greeting are sent.
   - A private circle and a chat that does not leak outside it.
   - Confidence that the account is protected (MFA, single-session, masking of personal data on screen).

2. **For the operations team**
   - A live view of delivery health and every individual send.
   - The ability to retry failures, trigger schedulers, publish announcements and correct user data.
   - Visibility of where users sign in from and which IPs/emails are being guessed.
   - AI assistance for triage and ad-hoc questions, reducing manual reporting.

3. **For the business**
   - Higher engagement through reliable, personal greetings.
   - Lower support cost through self-service and observability.
   - Reduced risk through auditable access controls and visible abuse signals.

## 5. Business rules

These rules are business policy. Some are enforced by the backend; the front end mirrors them
so the user is told before a request is sent.

| ID | Rule | Enforced in |
| --- | --- | --- |
| BR-01 | A circle link is mutual and exists only after acceptance | Backend; UI reflects it |
| BR-02 | Sending a request to a user who already requested you accepts their request | Backend; UI shows "accept" affordance |
| BR-03 | Chat is restricted to accepted circle members when the platform flag is on | Backend flag `app.chat.circles-only`; client filters and locks the composer |
| BR-04 | Festivals are recorded per year and repeat on their month/day in later years | Backend (year-scoped fetch); calendar utilities |
| BR-05 | A non-recurring anniversary occurs only on its exact date | Calendar utilities and backend |
| BR-06 | Feb 29 celebrations fall on Feb 28 in non-leap years | Calendar utilities |
| BR-07 | A published notification cannot be edited or deleted until unpublished | Backend; UI blocks the actions |
| BR-08 | A notification schedule must start and end in the future, with end after start | Backend; `notification-schedule.ts` |
| BR-09 | Security settings cannot be changed while impersonating | Client blocks; backend must also enforce |
| BR-10 | Admins cannot impersonate another admin | Client blocks (`canImpersonate`) |
| BR-11 | Only images are accepted for profile pictures; other media follow per-kind limits | Backend `MediaValidation`; `media.ts` |
| BR-12 | Custom wishes links must be absolute `http(s)` URLs, ≤ 500 characters, no credentials | Backend `WishesUrls`; `wishes-url.ts` |
| BR-13 | Access is limited to India (Andhra Pradesh, Telangana) | Client location guard; server-side control recommended |
| BR-14 | One session per account when the user/admin turns single-session on | Backend revokes earlier refresh tokens; client shows the notice |
| BR-15 | Bulk actions apply only to rows currently on screen | Client `BulkSelection` |

## 6. Stakeholders and responsibilities

| Stakeholder | Interest | Responsibility |
| --- | --- | --- |
| End user | Celebrations tracked, greetings delivered, private chat | Maintain their events and circle, choose wish settings |
| Administrator | Operate the service reliably | Manage users, monitor delivery, retry failures, publish announcements, audit abuse |
| Product owner | Adoption and engagement | Prioritise features, define success measures |
| Backend engineer | Contract stability | Provide and version the REST/WebSocket contract |
| Front-end engineer | Correct, accessible, fast UI | Implement the screens and client rules |
| Security/compliance | Personal data protection | Approve access controls, retention and masking |
| Support | Resolve user issues | Use the operations console and runbooks |

## 7. Constraints

| Type | Constraint | Impact |
| --- | --- | --- |
| Technical | Angular 17 SPA only; no server rendering | Initial bundle must stay small; SEO limited to static `index.html` metadata |
| Technical | Backend contract is fixed by another team | Front end must tolerate optional/missing fields (defensive normalisation in `ApiService`) |
| Technical | Browser-only token storage | Requires XSS discipline; tokens are in `localStorage`/`sessionStorage` |
| Legal | Personal data (email, DOB, location, chat) is processed | Needs masking, least privilege, retention policy |
| Operational | Firebase Hosting only | No custom server logic; all server work belongs to the API |
| Geographic | Access restricted to two Indian states | Users outside must be supported operationally, not technically |
| Budget | Third-party AI and geolocation services | Availability and quota must be monitored (Pollinations balance is shown to admins) |

## 8. Assumptions

- Users have a valid email address; it is the account identifier.
- The backend scheduler is the only thing that sends greetings; the UI never sends a greeting directly.
- Administrators are trusted staff and are created by the backend/seed process, not self-service.
- The mail provider reports delivery status back to the backend so the UI can display it.
- Users accept that the product is region-restricted.

## 9. Business acceptance

The product is acceptable to the business when:

1. A new user can sign in, record an event, join a circle and chat without administrator help.
2. A scheduled birthday produces exactly one email on the right date, visible in Email Status.
3. A failed email can be found, understood and retried by an administrator in under two minutes.
4. A published announcement appears for signed-in users without a page reload.
5. An administrator can see failed sign-in attempts and identify a guessing IP.
6. No screen displays a full email address or sensitive value unless the viewer explicitly reveals it.
7. The product passes the accessibility and performance targets in
   [`non-functional-requirements.md`](non-functional-requirements.md).
