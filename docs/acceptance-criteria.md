# Acceptance Criteria

Criteria are written as Given/When/Then and are traceable to
[`functional-requirements.md`](functional-requirements.md). A feature is accepted only when all
of its **must** criteria pass in a production-like environment, on desktop and on a 375 px
mobile viewport.

---

## AC-AUTH — Authentication and session

| ID | Given / When / Then | FR |
| --- | --- | --- |
| AC-AUTH-01 | Given a valid account and allowed location, when the user submits valid credentials, then the app stores both tokens, sets the role and lands on `/dashboard` (or the safe `redirectUrl`). | FR-AUTH-01, 18 |
| AC-AUTH-02 | Given "remember me" is ticked, when the browser is closed and reopened, then the session is still valid; given it is not ticked, then the session is gone. | FR-AUTH-01 |
| AC-AUTH-03 | Given invalid credentials, when the user submits, then the backend message is shown and no token is stored. | FR-AUTH-20 |
| AC-AUTH-04 | Given the backend answers `MFA_OTP_REQUIRED`, when the response is handled, then the OTP page opens with the email pre-filled and an OTP is requested automatically. | FR-AUTH-03 |
| AC-AUTH-05 | Given a valid OTP, when it is verified, then the session is created and the user continues to the original destination. | FR-AUTH-03, 05 |
| AC-AUTH-06 | Given a reset link with token and email, when it is opened, then the reset form is shown with the email pre-filled and submission disabled until both passwords are valid and equal. | FR-AUTH-07, 08 |
| AC-AUTH-07 | Given a one-time link with a token on a protected route, when an anonymous user opens it, then the app routes to `/direct-login`, exchanges the token and lands on `/circles`. | FR-AUTH-09 |
| AC-AUTH-08 | Given a session with 60 s remaining, when 30 s pass, then the access token is refreshed without any user action. | FR-AUTH-11 |
| AC-AUTH-09 | Given a 401 for a stale token, when the request fails, then exactly one refresh is attempted and the original request is retried once. | FR-AUTH-13 |
| AC-AUTH-10 | Given a 403, when the response arrives, then the user is signed out and sent to `/login`. | FR-AUTH-14 |
| AC-AUTH-11 | Given a `CONCURRENT_LOGIN` 401, when the response arrives, then tokens are cleared, no refresh is attempted, the notice is displayed, and the URL does not change. | FR-AUTH-15 |
| AC-AUTH-12 | Given the concurrent-login notice is displayed, when the token timer expires or a token-less request fails, then the notice remains and no navigation occurs. | FR-AUTH-16 |
| AC-AUTH-13 | Given a signed-in user opens `/login`, when the guard runs, then they are redirected to `/dashboard`. | FR-AUTH-19 |

## AC-ACCT — Account

| ID | Given / When / Then | FR |
| --- | --- | --- |
| AC-ACCT-01 | Given the account page, when it loads, then the user's name, email and role are shown and the email is masked. | FR-ACCT-01, FR-USER-10 |
| AC-ACCT-02 | Given wish settings are changed, when saved, then a success toast appears and the values persist after reload. | FR-ACCT-02 |
| AC-ACCT-03 | Given the MFA switch is saved, when the backend rejects it, then the switch returns to its previous position and an error toast appears. | FR-ACCT-03 |
| AC-ACCT-04 | Given an admin is impersonating, when they try to change MFA or single-session, then the change is refused with a warning. | FR-ACCT-05 |
| AC-ACCT-05 | Given a 6 MB PNG is selected as a profile picture, when it is chosen, then it is refused with a size message and no request is sent. | FR-ACCT-06 |
| AC-ACCT-06 | Given a theme is selected, when saving fails, then the theme is still applied locally and an error toast appears. | FR-ACCT-07 |

## AC-DASH — Dashboard

| ID | Given / When / Then | FR |
| --- | --- | --- |
| AC-DASH-01 | Given the dashboard, when it loads, then four KPI cards and the OTP/forgot-password flow cards show numeric values (0 when absent). | FR-DASH-01, 02 |
| AC-DASH-02 | Given the default range, when the page loads, then the range is the last seven days and no date after today can be selected. | FR-DASH-04 |
| AC-DASH-03 | Given a start date later than the end date is chosen, when it is applied, then the end date moves to match and the charts reload. | FR-DASH-04 |
| AC-DASH-04 | Given 98 sent and 2 failed, when delivery health is computed, then it reads 98% with a "good" tone; given 0 sent and 0 failed, then 100%. | FR-DASH-05 |
| AC-DASH-05 | Given a page without charts, when it loads, then CanvasJS is never requested. | FR-DASH-07 |

## AC-EVT — Events

| ID | Given / When / Then | FR |
| --- | --- | --- |
| AC-EVT-01 | Given the events list, when a search, filter, sort or page change is applied, then the list reloads from page 0 with the new parameters. | FR-EVT-01 |
| AC-EVT-02 | Given the event editor, when required fields are empty and save is pressed, then all invalid fields are marked and no request is sent. | FR-EVT-02 |
| AC-EVT-03 | Given a recurring birthday on 29 Feb, when the next occurrence is computed in a non-leap year, then it is 28 Feb. | FR-EVT-07 |
| AC-EVT-04 | Given an event with media is saved, when the request is sent, then it is `multipart/form-data` to the `with-image` endpoint. | FR-EVT-06 |
| AC-EVT-05 | Given an event without a new file is edited, when it is saved, then the existing media is not removed. | FR-EVT-06 |
| AC-EVT-06 | Given an SVG is chosen as event media, when it is selected, then it is refused with the supported-types message. | FR-EVT-05 |
| AC-EVT-07 | Given events are bulk-deleted, when confirmed, then all selected ids are removed, the selection is cleared, and the page steps back if it is now empty. | FR-EVT-08 |

## AC-CAL — Calendar

| ID | Given / When / Then | FR |
| --- | --- | --- |
| AC-CAL-01 | Given the calendar, when it loads, then the previously chosen view and kind filters are restored. | FR-CAL-08 |
| AC-CAL-02 | Given a festival stored in 2024, when the user views the same month in 2026, then the festival appears on its month/day. | FR-CAL-04 |
| AC-CAL-03 | Given a non-recurring anniversary in 2024, when the user views 2025, then it does not appear. | FR-CAL-04 |
| AC-CAL-04 | Given the year is changed, when the new months load, then the API is called with the new year and the cache key includes that year. | FR-CAL-03 |
| AC-CAL-05 | Given a day with three entries, when it is downloaded as `.ics`, then a valid single-day calendar file is produced with escaped text. | FR-CAL-07 |
| AC-CAL-06 | Given the day sheet is open, when Escape is pressed, then it closes and focus returns to the page. | FR-CAL-11 |
| AC-CAL-07 | Given more than three entries in a month cell, then three chips plus a "+N" indicator are shown. | FR-CAL-09 |
| AC-CAL-08 | Given a birthday from 1990 viewed in 2026, then the milestone reads "36th birthday"; given a birth year more than 120 years ago, then no milestone is shown. | FR-CAL-10 |

## AC-FEST — Festival wishes

| ID | Given / When / Then | FR |
| --- | --- | --- |
| AC-FEST-01 | Given a festival is clicked by an admin, when the panel opens, then all mappings for that festival are listed. | FR-FEST-01, 02 |
| AC-FEST-02 | Given several users are selected and linked, when the bulk save completes, then the message reports how many were added and updated. | FR-FEST-02 |
| AC-FEST-03 | Given a non-admin opens the same festival, then only their own wish is shown and no editing controls are visible. | FR-FEST-04 |
| AC-FEST-04 | Given a mapping whose last send failed, when the list renders, then its status reads "failed" and it is findable with the failed filter. | FR-FEST-05, 07 |
| AC-FEST-05 | Given a festival stored in 2023, when the admin views it in 2026, then the timing reads relative to its next occurrence, not as years past. | FR-FEST-06 |

## AC-CIR — Circles

| ID | Given / When / Then | FR |
| --- | --- | --- |
| AC-CIR-01 | Given a search of one character, when typed, then no request is sent; given two characters, then one debounced request is sent after 300 ms. | FR-CIR-02 |
| AC-CIR-02 | Given a user who already has a pending request, when their row is viewed, then the action is not "send request" again. | FR-CIR-06 |
| AC-CIR-03 | Given an incoming request, when it is rejected, then a confirmation is required and, on confirm, the request disappears. | FR-CIR-03 |
| AC-CIR-04 | Given an accepted member, when "remove" is confirmed, then the member disappears from the list and from the chat picker. | FR-CIR-04, FR-CHAT-05 |
| AC-CIR-05 | Given an online member, then the row reads "Online now"; given an offline member with a last-seen time, then it reads "Last seen …". | FR-CIR-05 |

## AC-CHAT — Chat

| ID | Given / When / Then | FR |
| --- | --- | --- |
| AC-CHAT-01 | Given the chat widget, when it opens, then conversations load with unread counts and the list is filtered to circle members when restriction is on. | FR-CHAT-01, 05 |
| AC-CHAT-02 | Given a 60 MB attachment, when it is selected, then it is refused before sending. | FR-CHAT-02 |
| AC-CHAT-03 | Given a sent message, when the recipient opens the thread, then the sender's message appears without a manual refresh (WebSocket) or on next open (fallback). | FR-CHAT-04 |
| AC-CHAT-04 | Given a message owned by the user, when the edit action is used, then the new text is saved and broadcast; given a message owned by the other person, then edit and delete are unavailable. | FR-CHAT-03 |
| AC-CHAT-05 | Given a conversation with a non-member while restriction is on, then the composer is locked and explains how to add them to the circle. | FR-CHAT-05 |
| AC-CHAT-06 | Given an image attachment, when it is opened, then it previews inline; given a PDF, then a download action is offered. | FR-CHAT-06 |

## AC-EMAIL — Email status

| ID | Given / When / Then | FR |
| --- | --- | --- |
| AC-EMAIL-01 | Given the email list, when it loads, then no image request is made until an image is explicitly expanded. | FR-EMAIL-04 |
| AC-EMAIL-02 | Given the mobile preview is chosen, when the record renders, then the body is constrained to a phone-width frame. | FR-EMAIL-03 |
| AC-EMAIL-03 | Given a failed record, when retry succeeds, then a success toast appears and the status refreshes. | FR-EMAIL-05 |
| AC-EMAIL-04 | Given a type-specific route (e.g. `/email-status/otp`), when it loads, then the title and email type come from route data. | FR-EMAIL-02 |
| AC-EMAIL-05 | Given the OTP email view is opened by a non-admin, when the route guard runs, then the user is redirected to `/dashboard`. | FR-SYS-02 |

## AC-NOTIF — Notifications

| ID | Given / When / Then | FR |
| --- | --- | --- |
| AC-NOTIF-01 | Given a schedule start in the past, when the form is submitted, then it is rejected with "Schedule start time must be in the future." | FR-NOTIF-02 |
| AC-NOTIF-02 | Given an end before the start, then the form is rejected with the ordering message. | FR-NOTIF-02 |
| AC-NOTIF-03 | Given a draft whose window has elapsed, when publish is pressed, then it is refused with an explanation to reschedule. | FR-NOTIF-03 |
| AC-NOTIF-04 | Given a published notification, when the editor is opened, then the admin is redirected with "Published notifications cannot be edited." | FR-NOTIF-04 |
| AC-NOTIF-05 | Given a published notification, when it is deleted singly or in bulk, then the action is refused. | FR-NOTIF-04 |
| AC-NOTIF-06 | Given a signed-in user with an active published notification, when the page loads, then the banner shows its title and message. | FR-NOTIF-05 |
| AC-NOTIF-07 | Given the banner is dismissed, when the page is reloaded in the same session, then that notification does not reappear. | FR-NOTIF-06 |
| AC-NOTIF-08 | Given an anonymous visitor, when the app loads, then no notification endpoint or socket is used. | FR-NOTIF-08 |

## AC-USER — User administration

| ID | Given / When / Then | FR |
| --- | --- | --- |
| AC-USER-01 | Given the users list, when role/gender/relationship/status filters are applied, then the query is re-run from page 0 with those values. | FR-USER-01 |
| AC-USER-02 | Given the user form, when an invalid email is entered, then the field is marked and save is blocked. | FR-USER-03 |
| AC-USER-03 | Given a birthday wishes link of `ftp://x`, when entered, then it is rejected with "The link must start with http:// or https://". | FR-USER-04 |
| AC-USER-04 | Given a link containing credentials (`https://u:p@host`), then it is rejected. | FR-USER-04 |
| AC-USER-05 | Given an admin row, when impersonation is attempted, then it is refused with a warning. | FR-USER-08 |
| AC-USER-06 | Given impersonation is active, when the shell renders, then the admin navigation is absent and the "viewing as" banner is visible. | FR-USER-09 |
| AC-USER-07 | Given a bulk deactivate of three ticked rows, when confirmed, then exactly those three are deactivated. | FR-USER-06 |
| AC-USER-08 | Given the page changes, then previously ticked rows on the old page are no longer selected. | FR-USER-06 |

## AC-SEC — Security analytics

| ID | Given / When / Then | FR |
| --- | --- | --- |
| AC-SEC-01 | Given an IP that attempted five distinct emails, when the summary renders, then it is marked high suspicion. | FR-SEC-04 |
| AC-SEC-02 | Given an email address is masked, when the reveal toggle is used, then the full address appears and the toggle state applies to every masked value on the page. | FR-SEC-05 |
| AC-SEC-03 | Given a login with coordinates, when the map action is used, then Google Maps opens at those coordinates. | FR-SEC-02 |
| AC-SEC-04 | Given a CSV export, when a value begins with `=`, then the exported cell is prefixed with `'` so it is not executed. | FR-SEC-05 |

## AC-SYS — Platform

| ID | Given / When / Then | FR |
| --- | --- | --- |
| AC-SYS-01 | Given an anonymous user opens `/events`, then they are sent to `/login?redirectUrl=%2Fevents`. | FR-SYS-01 |
| AC-SYS-02 | Given a user outside AP/Telangana, when any route loads, then `/restricted-region` is shown and no authenticated route is reachable. | FR-SYS-03 |
| AC-SYS-03 | Given the network is lost for 20 s, when two probes fail, then the offline overlay appears; when connectivity returns, then "You're back online" shows briefly and the overlay disappears without navigation. | FR-SYS-05 |
| AC-SYS-04 | Given a CORS rejection (status 0) while the API is reachable, when the probe runs, then the app does not show the offline overlay. | FR-SYS-05 |
| AC-SYS-05 | Given a chat or agent request is in flight, then the global loading overlay is not shown. | FR-SYS-04 |
| AC-SYS-06 | Given any delete action, when it is triggered, then a confirmation dialog names the item and uses a danger tone. | FR-SYS-07 |
| AC-SYS-07 | Given a 360 px viewport, when the shell renders, then the sidebar is collapsed into a slide-down menu and no horizontal scrolling occurs. | FR-SYS-08 |
| AC-SYS-08 | Given a toast is raised, when 5 s pass, then it dismisses itself unless configured otherwise. | FR-SYS-06 |

## Release acceptance gate

A release is accepted when:

1. Every **must** criterion above has a recorded pass for the release candidate.
2. No open defect has severity 1 or 2 (see [`defect-tracking.md`](defect-tracking.md)).
3. The build passes the size budget and the Lighthouse targets in
   [`non-functional-requirements.md`](non-functional-requirements.md).
4. The rollback procedure in [`rollback-plan.md`](rollback-plan.md) has been verified in the last
   two releases.
