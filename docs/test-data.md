# Test Data

## 1. Rules

1. **Synthetic only.** Never use real personal data, real email addresses or production records.
2. **Reserved domains.** Use `example.com`, `example.org` or `example.net` for all emails.
3. **Disposable accounts.** Test accounts live on the dev/preview environment and are recreated as
   needed.
4. **Deterministic dates.** Use fixed dates relative to a documented "today" so assertions are stable.
5. **No secrets in fixtures.** Never commit tokens, production passwords or API keys.

## 2. Accounts

| Alias | Role | Purpose | Attributes |
| --- | --- | --- | --- |
| `admin.test@example.com` | `ROLE_ADMIN` | Administration and security screens | MFA off, single-session off |
| `admin.mfa@example.com` | `ROLE_ADMIN` | MFA flows | MFA on |
| `asha.test@example.com` | `ROLE_USER` | Primary user journeys | Birthday enabled, relationship "Sister" |
| `ravi.test@example.com` | `ROLE_USER` | Circle counterpart and chat | Birthday enabled, good-morning on |
| `single.session@example.com` | `ROLE_USER` | Concurrent-login testing | `concurrentLoginAllowed = false` |
| `inactive.test@example.com` | `ROLE_USER` | Deactivated-account behaviour | `active = false` |
| `no.events@example.com` | `ROLE_USER` | Empty states | No events, no circle |

Passwords: a documented test-only value, rotated per environment, never reused from any real system.

## 3. Relationships and event types

| Seed | Code | Active |
| --- | --- | --- |
| Mother | `MOTHER` | yes |
| Father | `FATHER` | yes |
| Sister | `SISTER` | yes |
| Brother | `BROTHER` | yes |
| Friend | `FRIEND` | yes |
| Colleague | `COLLEAGUE` | yes |
| Retired type | `RETIRED_TYPE` | no |

| Event type | Code |
| --- | --- |
| Birthday | `BIRTHDAY` |
| Anniversary | `ANNIVERSARY` |
| Engagement | `ENGAGEMENT` |
| Festival | `FESTIVAL` |

## 4. Events

| Purpose | Owner | Type | Date | Recurring | Media |
| --- | --- | --- | --- | --- | --- |
| Standard birthday | Asha | BIRTHDAY | 1990-03-15 | yes | PNG 200 KB |
| Leap-day birthday | Ravi | BIRTHDAY | 1992-02-29 | yes | none |
| One-time anniversary | Asha | ANNIVERSARY | 2024-11-20 | no | JPEG 1 MB |
| Future event | Ravi | ENGAGEMENT | next year, +30 days | no | MP4 5 MB |
| Event with wishes link | Asha | BIRTHDAY | 1988-07-04 | yes | PDF 300 KB |
| Event with audio | Ravi | ANNIVERSARY | 2015-05-05 | yes | MP3 2 MB |

## 5. Festivals

| Festival | Stored year | Month/day | Purpose |
| --- | --- | --- | --- |
| Diwali | previous year | Oct/Nov | Year-scoped fetch and roll-forward |
| Holi | current year | March | Upcoming strip |
| Sankranti | current year | January | Region-relevant festival |

## 6. Circles and chat

| Scenario | Setup |
| --- | --- |
| Accepted circle | Asha ↔ Ravi accepted |
| Incoming request | Ravi → Asha pending |
| Outgoing request | Asha → no.events pending |
| Chat thread | Asha ↔ Ravi with 30 messages (text, image, PDF, reply, reaction) |
| Long message | 2 000 characters |
| Attachment sizes | 1 KB, 1 MB, 49 MB (allowed), 51 MB (refused) |

## 7. Media fixtures

| Kind | File | Size | Expected |
| --- | --- | --- | --- |
| Image | `birthday.png` | 200 KB | Accepted |
| Image | `large.png` | 6 MB | Refused (5 MB limit) |
| Image | `vector.svg` | 10 KB | Refused (unsupported) |
| Video | `greeting.mp4` | 5 MB | Accepted |
| Video | `long.mp4` | 60 MB | Refused (50 MB limit) |
| Audio | `song.mp3` | 2 MB | Accepted |
| Audio | `long.wav` | 15 MB | Refused (10 MB limit) |
| PDF | `wishes.pdf` | 300 KB | Accepted |
| PDF | `huge.pdf` | 25 MB | Refused (20 MB limit) |
| Text | `notes.txt` | 1 KB | Refused as event media; accepted as a chat attachment |

## 8. Notifications

| Purpose | Title | Schedule |
| --- | --- | --- |
| Active banner | "Welcome to Golden Greetings" | start yesterday, end tomorrow |
| Scheduled future | "Diwali wishes" | start +2 days, end +5 days |
| Stale draft | "Old announcement" | start −2 days |
| Inverted | "Bad window" | start +5 days, end +2 days |
| Published immutable | "Published notice" | published |

## 9. Emails

| Type | Status | Purpose |
| --- | --- | --- |
| `BIRTHDAY` | SENT | Normal delivery |
| `FESTIVAL_WISH` | FAILED | Retry flow |
| `OTP` | SENT | OTP log |
| `FORGOT_PASSWORD` | SENT | Reset log |
| `UNREAD_CHAT_MESSAGE` | SENT | Chat reminder |
| `CIRCLE_REQUEST` | SENT | Circle request log |

At least one record should include an image to test on-demand fetching.

## 10. Security analytics

| Purpose | Data |
| --- | --- |
| Normal logins | Asha and Ravi from Hyderabad and Vijayawada |
| Impossible travel | Same account, two distant cities minutes apart |
| Guessing IP | One IP, five distinct emails |
| Single-target | Five IPs, one email |
| Missing coordinates | A login with no latitude/longitude |
| Failed enrichment | An IP whose lookup fails |

## 11. Boundary values

| Field | Values to test |
| --- | --- |
| Password | 7 chars (invalid), 8 chars (valid), 128 chars |
| OTP | 3 digits, 4 digits, 6 digits, 7 digits |
| Wishes URL | empty, 500 chars, 501 chars, `ftp://`, `https://u:p@host`, spaces |
| Copilot question | 0, 1, 499, 500, 501 chars |
| Page size | 5, 10, 20 (and 25/50/100 on violated users) |
| Note length | 499, 500, 501 chars |
| Pagination | first page, middle, last, empty result |

## 12. Negative and adversarial data

| Input | Expected |
| --- | --- |
| `<script>alert(1)</script>` in a note or message | Rendered as text, not executed |
| `=cmd\|' /C calc'!A0` in a field exported to CSV | Prefixed with `'` in the export |
| Extremely long email address in a table | Truncated without breaking the layout |
| Emoji and non-Latin text in names and messages | Stored and rendered correctly |
| A message with only whitespace | Rejected by the composer |
| A file renamed from `.exe` to `.png` | Rejected by the backend's byte sniffing |

## 13. Data setup checklist

- [ ] Test accounts created and activated as listed.
- [ ] Relationship and event-type seeds present, including one inactive.
- [ ] Events across the current, previous and next year.
- [ ] Festivals for the current year and one earlier year.
- [ ] One accepted circle, one incoming request, one outgoing request.
- [ ] One conversation with mixed message types.
- [ ] Media fixtures available locally.
- [ ] Notifications in each state.
- [ ] Email records in sent and failed states, one with an image.
- [ ] Login and failed-login history across the analytics ranges.

## 14. Cleanup

Delete or deactivate test data after a release verification. Never leave test accounts active in
production, and never create test data in production that would trigger real emails to real
addresses.
