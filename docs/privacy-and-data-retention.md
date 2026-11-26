# Privacy and Data Retention

## 1. Scope

This document covers personal data processed through the Golden Greetings web client: what is
collected, why, where it goes, how long it is kept, and how it is deleted. Retention is ultimately
executed by the backend; the client must not create additional copies.

## 2. Personal data processed

| Data | Purpose | Lawful basis (proposed) | Recipient |
| --- | --- | --- | --- |
| Name | Identify the person, personalise greetings | Contract | Backend, other users (circle, admin) |
| Email address | Account identity, deliver greetings and OTPs | Contract | Backend, mail provider |
| Date of birth | Birthday greetings, milestones | Consent (user-provided) | Backend |
| Gender | Personalisation (optional) | Consent | Backend |
| Relationship | Personalise greetings | Consent | Backend |
| Profile picture | Identification in chat and circles | Consent | Backend, object storage, circle members |
| Events and celebrations | The core service | Contract | Backend |
| Greeting media | Personalise greetings | Consent | Backend, object storage |
| Wishes link | Personalise greetings | Consent | Backend |
| Chat messages and attachments | Private communication | Consent | Backend, chat participants |
| Email delivery records | Operate and troubleshoot delivery | Legitimate interest | Backend, admins |
| IP address and approximate location at sign-in | Security and region restriction | Legitimate interest | Backend, admins, `ipapi.co` |
| Failed sign-in attempts | Security | Legitimate interest | Backend, admins |
| Theme and view preferences | Usability | Consent | Backend, local storage |

## 3. Third parties

| Third party | Data received | Purpose | Notes |
| --- | --- | --- | --- |
| Mail provider | Email address, greeting content | Delivery | Contracted processor |
| `ipapi.co` | User IP | Country/region lookup | Only on first load; no account data |
| Google Identity | Browser context and Google account | SSO | Only if the user chooses Google sign-in |
| cdnjs / Google Fonts | IP, referrer, user agent | Serve CSS/JS/fonts | Recommend a Referrer-Policy |
| AI providers (via backend) | Wish prompts derived from names and events | Generate text | Backend controls what is sent |
| Firebase Hosting | IP, request metadata | Serve the app | Standard hosting logs |

The client does **not** send tokens or personal data to third parties. The IP lookup is the only
personal-data transfer initiated directly by the browser.

## 4. What the client stores locally

| Key | Content | Level | Lifetime | Cleared by |
| --- | --- | --- | --- | --- |
| `fw_access_token` | JWT | Restricted | Token lifetime | Logout, expiry, notice |
| `fw_refresh_token` | Refresh token | Restricted | Session | Logout, notice |
| `fw_role` | Role string | Internal | Session | Logout |
| `fw_theme` | Theme code | Internal | Persistent | Manual clear / reset |
| `fw_impersonation` | Impersonated user object | Confidential | Tab session | Return to admin |
| `fw_sso_token` | Base64 Google client id | Public | Persistent | Manual clear |
| `fw_wish_preview_seen_token` | Access token copy | Restricted | Tab session | Tab close |
| `fw_published_notification_dismissed_id` | Notification id | Internal | Tab session | Tab close |
| `fw_calendar_view`, `fw_calendar_kinds` | Preferences | Internal | Persistent | Manual clear |

**Recommendation:** replace `fw_wish_preview_seen_token` with a non-sensitive marker (a timestamp
or a hash) to avoid a second copy of the token.

## 5. Retention (proposed)

Retention is executed by the backend. These are the business expectations the client assumes.

| Data | Retention | Rationale |
| --- | --- | --- |
| Account profile | While active, then deleted on request | Contract |
| Events and media | While the event is active | Service |
| Chat messages | Backend policy; deletable by the sender | User control |
| Email delivery records | 90 days, then purged | Troubleshooting window |
| Sign-in location history | 90 days | Security investigation |
| Failed sign-in records | 90 days | Abuse detection |
| Notifications (unpublished) | Until deleted | Admin control |
| Logs | 30–90 days | Operations |
| Local browser storage | Session or until cleared | Client |

## 6. User rights and how the client supports them

| Right | Support |
| --- | --- |
| Access | Account page shows profile; events and chat are visible in-app |
| Rectification | Admin edits the profile; the user can change their picture and settings |
| Erasure | Backend deletes the account; the client clears local storage on logout |
| Restriction | Admin deactivates the account; the user stops receiving mail |
| Portability | Not implemented (no export of one's own data) — gap |
| Objection | Wish settings can be turned off; chat is optional |
| Withdraw consent | Disable wishes, remove the profile picture, leave circles |

**Gaps:** no self-service data export; no self-service account deletion. These are backend
features the client would need to surface.

## 7. Data minimisation in the client

- The client requests only the fields the screen needs (though some list endpoints return full
  objects).
- Email images are fetched only on demand.
- Chat attachments are fetched only when opened.
- No analytics or tracking scripts are included.
- No cookies are set by the application itself.

## 8. Security measures supporting privacy

| Measure | Effect |
| --- | --- |
| Masking by default | Reduces accidental disclosure |
| No PII logging | Prevents leakage into logs |
| HTTPS only | Prevents interception |
| Tokens cleared on logout | Limits exposure on shared devices |
| Bounded image cache | Limits retained personal content in memory |
| Object URLs revoked | Releases media promptly |
| `Referrer-Policy` (recommended) | Limits URL leakage to CDNs |

## 9. Privacy notice requirements

The public privacy notice should state:

1. What is collected and why.
2. That IP geolocation uses a third party (`ipapi.co`) and the browser's location permission.
3. That emails are delivered through a mail provider.
4. That Google sign-in is optional.
5. Retention periods.
6. How to request access, correction or deletion.
7. Who to contact.

## 10. Incident and breach

If personal data is exposed (e.g. a misconfigured endpoint, a leaked token), follow
[`incident-management.md`](incident-management.md): contain, assess, notify per policy, and record.

## 11. Review

Review this document when:

- A new personal-data field is added.
- A new third-party integration is added.
- Retention periods change.
- A privacy regulation applicable to the user base changes.
