# Data Classification

## 1. Levels

| Level | Definition | Examples | Handling |
| --- | --- | --- | --- |
| **Public** | Safe to disclose | Theme names, product copy, public client id | No restriction |
| **Internal** | Not sensitive but not for the public | API base URL, Firebase project id, scheduler names | No special handling |
| **Confidential** | Personal or business data | Names, emails, DOB, relationships, events, chat, email bodies | Mask on screen; access-controlled; no logging |
| **Restricted** | Secrets or security-sensitive data | Tokens, OTPs, passwords, IPs, sign-in locations, failed-login records | Never persisted by the client beyond tokens; never logged; admin-only where applicable |

## 2. Data inventory

| Data element | Source | Level | Client storage | Displayed |
| --- | --- | --- | --- | --- |
| User name | Backend | Confidential | No | Yes |
| Email address | Backend | Confidential | No | Masked by default |
| Password | User input | Restricted | No (sent over HTTPS) | Never |
| OTP code | User input / email | Restricted | No | In the form only |
| Access token | Auth response | Restricted | `localStorage`/`sessionStorage` | Never |
| Refresh token | Auth response | Restricted | Same | Never |
| Role | Auth response | Internal | Same | Implied by UI |
| Date of birth | Backend | Confidential | No | Admin screens |
| Gender | Backend | Confidential | No | Admin screens |
| Relationship | Backend | Confidential | No | Yes |
| Profile picture URL | Backend | Confidential | No | Yes |
| Wish settings | Backend | Internal | No | Own account |
| Birthday wishes URL | Backend | Confidential | No | Admin screens |
| MFA flag | Backend | Internal | No | Own account, admin editor |
| Concurrent-login flag | Backend | Internal | No | Own account, admin editor |
| Events (type, date, recurrence) | Backend | Confidential | No | Yes |
| Greeting media | Object storage | Confidential | No (object URLs only) | Yes |
| Festivals | Backend | Public/Internal | No | Yes |
| Festival wish note | Backend | Confidential | No | Admin, owner |
| Chat message text | Backend | Confidential | No | Participants |
| Chat attachments | Backend | Confidential | No (blob URLs) | Participants |
| Chat presence (online/last seen) | Backend | Confidential | No | Circle members |
| Email subject/body | Backend | Confidential | No | Email status viewers |
| Email image | Backend | Confidential | Blob URL, bounded cache | Email status viewers |
| Sign-in location/IP | Backend | Restricted | No | Admins |
| Failed sign-in email/IP | Backend | Restricted | No | Admins |
| Notification title/message | Backend | Internal | No | All signed-in users |
| Scheduler status/errors | Backend | Internal | No | Admins |
| Agent report | Backend | Internal | No | Admins |
| Theme preference | Backend + `localStorage` | Internal | `fw_theme` | Yes |
| Calendar view/kinds | `localStorage` | Internal | Yes | Yes |
| Google client id | Backend | Public | `fw_sso_token` (base64) | No |
| Impersonated user snapshot | `sessionStorage` | Confidential | `fw_impersonation` | Banner |
| Dismissed notification id | `sessionStorage` | Internal | Yes | No |
| Wish-preview seen token | `sessionStorage` | Restricted | Yes (the token itself) | No |

**Note:** `fw_wish_preview_seen_token` stores the access token in `sessionStorage` to remember that
the preview was shown. That is a second copy of a restricted value; it is cleared when the tab
closes. If this is considered too risky, replace it with a hash or a timestamp.

## 3. Handling rules by level

### Public
- May be cached, logged, embedded.
- Still avoid unnecessary exposure.

### Internal
- Do not display to guests.
- Safe in configuration files.
- No special masking needed.

### Confidential
- Mask on screen by default where it identifies a person (emails especially).
- Do not persist in browser storage.
- Do not log.
- Transmit only over HTTPS.
- Display only to the roles that need it.

### Restricted
- Never display in the UI (except inside a form the user is filling).
- Never persist except tokens in the designated stores.
- Never log, never include in error messages, never put in URLs.
- Access only through authenticated, authorised endpoints.
- Redact in screenshots, tickets and chat.

## 4. Where masking applies

| Screen | Masked values |
| --- | --- |
| Users list | Email |
| User editor | Email (where displayed) |
| Account | Email |
| Email status | Recipient email |
| Wish images | Owner email |
| Festival wishes | User email |
| Login locations | Email |
| Violated users | Email |
| Event editor | Selected user's email |
| Circles | Member email |

Masking is applied by `SensitiveEmailPipe`/`SensitiveValuePipe` and revealed by
`SensitiveInfoToggleComponent`. It is a shoulder-surfing control, not encryption.

## 5. Classification review triggers

Re-classify when:

- A new field is added to a model.
- A new screen displays personal data.
- A new third-party integration receives data.
- A new export (CSV, `.ics`) includes personal data.
- Storage keys change.

## 6. Summary for engineers

> If it identifies a person, treat it as Confidential. If it grants access, treat it as
> Restricted. Never log either. Mask what you must show.
