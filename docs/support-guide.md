# Support Guide

How to investigate and resolve user-reported issues with the Golden Greetings front end.

## 1. Information to collect first

| Field | Why |
| --- | --- |
| User's email | Find the account |
| Time and time zone | Correlate with logs and emails |
| Page/URL | Narrow the area |
| What they did | Reproduce |
| What they expected | Clarify the requirement |
| What happened (exact message) | Identify the code path |
| Browser and version | Compatibility |
| Device | Mobile-specific issues |
| Screenshot | Visual issues (redact personal data) |
| Whether it happens every time | Intermittent vs consistent |

## 2. Triage tree

```
Cannot sign in?
├── Wrong credentials → confirm with the user; reset if needed
├── MFA required → explain the code step; check spam
├── Single-session notice → explain the setting
├── Region blocked → explain the restriction
└── "Offline" → check the backend and the user's network

Signed in but a page is empty?
├── Backend 5xx → escalate
├── 403 → role/permission issue
├── 404 → feature not available / wrong URL
├── Filters too narrow → clear filters
└── No data for that user → expected

An email was not received?
├── Check Email Status for a record
├── Status FAILED → retry
├── No record → the scheduler did not run; check Schedulers
├── SENT but not received → spam folder, wrong address, provider issue
└── Wish settings disabled → confirm with the user

Chat not working?
├── WebSocket blocked → check the network
├── Not in the circle → add them
├── Account inactive → admin action
└── Attachment too large → explain the limit

Calendar looks wrong?
├── Festivals missing for a future year → backend sync
├── Recurring event on the wrong day → leap-year rule (29 Feb → 28 Feb)
├── One-time anniversary missing → it is tied to its exact date
└── Filter excludes the kind → enable the kind
```

## 3. Admin tools to use

| Question | Page |
| --- | --- |
| Can the user sign in? | Violated Users (failed attempts), Login Locations (successful) |
| Is the account active? | Users |
| Is MFA or single-session on? | Users → edit |
| Did the email send? | Email Status |
| Which scheduler ran? | Schedulers |
| What does the app look like for them? | Impersonate the user |
| Is the service healthy? | Dashboard |

## 4. Impersonation for support

1. `/users` → find the user → "log in as".
2. Reproduce the issue as they would see it.
3. **Do not change their data** unless the fix requires it and is agreed.
4. Press "Return to Admin" when finished.
5. Note that security settings cannot be changed while impersonating.

## 5. Common resolutions

| Report | Resolution |
| --- | --- |
| "I keep getting signed out" | Check refresh responses; check for 403; check the device clock |
| "It says I'm offline but my internet works" | The backend may be down, or a proxy blocks it; check the API |
| "I can't see the Admin menu" | The account is not an admin |
| "The app says I'm in the wrong region" | The location guard; confirm the requirement |
| "My photo won't upload" | Image only, ≤ 5 MB |
| "The event won't save" | Required fields, wishes link, or media limits |
| "My message didn't send" | Attachment size, circle restriction, socket issue |
| "The notification won't go away" | Dismiss it; it reappears next session only if still active |
| "The dashboard is empty" | Filters/date range; or the backend has no data |

## 6. What support cannot fix in the client

| Limitation | Who can fix |
| --- | --- |
| Region restriction | Product/security decision + backend |
| Backend outages | Backend team |
| Mail delivery failures | Backend/operations |
| Data corrections beyond user editing | Backend/admin tooling |
| Account deletion or data export | Backend feature |

## 7. Escalation criteria

Escalate to engineering when:

- The issue reproduces with a test account.
- It affects multiple users.
- It involves data loss, security or a payment (if applicable).
- It is a new error in the console.
- It started after a release.

## 8. Response templates

**Cannot reproduce**

> Thanks for the details. I could not reproduce this with a test account. Could you confirm the
> browser version, whether it happens in a private window, and the exact message you see? A
> screenshot (with personal details covered) would help.

**Region restriction**

> Golden Greetings is currently available only in India (Andhra Pradesh and Telangana). If you are
> in that region and still see the restriction, please allow location access in your browser or
> try a different network.

**Single-session notice**

> Your account is set to allow only one active session. Signing in on another device ends this one.
> You can turn this off on the Account page under security settings.

**Email not received**

> I checked the delivery log: the email was [sent / failed]. If it was sent, please check your spam
> folder and confirm the address on your account. If it failed, we have retried it.

## 9. After the ticket

- Update [`known-issues.md`](known-issues.md) if the cause is a known limitation.
- Log a defect if it is a code issue (see [`defect-tracking.md`](defect-tracking.md)).
- Add a test case if the scenario was not covered.
- Share the finding with the team if it could affect others.
