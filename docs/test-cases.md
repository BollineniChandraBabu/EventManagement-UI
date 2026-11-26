# Test Cases

Format: **ID — Title**, with steps and expected result. Priority: P1 (every release), P2 (for the
feature), P3 (should pass).

## Authentication

| ID | Pri | Steps | Expected |
| --- | --- | --- | --- |
| TC-AUTH-01 | P1 | Open `/login`, enter valid credentials, submit | Tokens stored; role set; lands on `/dashboard` |
| TC-AUTH-02 | P1 | Enter a wrong password | Backend message toast; stays on `/login`; no tokens |
| TC-AUTH-03 | P1 | Sign in with "remember me"; restart the browser | Session still valid |
| TC-AUTH-04 | P1 | Sign in without "remember me"; open a new tab after closing the old one | Session gone |
| TC-AUTH-05 | P1 | Open `/events` signed out, then sign in | Lands on `/events` |
| TC-AUTH-06 | P2 | Sign in, then open `/login` | Redirected to `/dashboard` |
| TC-AUTH-07 | P1 | Sign in with an MFA account | `/otp-login` with an OTP sent automatically |
| TC-AUTH-08 | P1 | Enter the correct OTP | Session created; continues to the destination |
| TC-AUTH-09 | P2 | Enter a wrong OTP | Toast; form stays for retry |
| TC-AUTH-10 | P2 | Request and verify an OTP from `/otp-login` | Session created |
| TC-AUTH-11 | P2 | Sign in with Google | Session created |
| TC-AUTH-12 | P2 | Submit an email on `/forgot-password` | Success toast; no account enumeration |
| TC-AUTH-13 | P2 | Open `/?token=X&email=Y` | Redirected to `/reset-password` pre-filled |
| TC-AUTH-14 | P2 | Submit mismatched passwords | "must match" toast; no request |
| TC-AUTH-15 | P2 | Submit a 6-character password | Field error; no request |
| TC-AUTH-16 | P2 | Open a protected route with `?token=…&email=…` | `/direct-login` then `/circles` |
| TC-AUTH-17 | P1 | Wait for the pre-expiry refresh | Token refreshed silently |
| TC-AUTH-18 | P1 | Force an expired token, then call an API | One refresh; request succeeds |
| TC-AUTH-19 | P1 | Force a 403 | Signed out; `/login` |
| TC-AUTH-20 | P1 | Single-session account signed in elsewhere, then act here | Blocking notice; URL unchanged; tokens cleared |
| TC-AUTH-21 | P1 | With the notice shown, wait past expiry | Notice remains; no navigation |
| TC-AUTH-22 | P1 | Sign out from the account page | Tokens cleared; `/login` with `redirectUrl` |
| TC-AUTH-23 | P1 | Sign in with `redirectUrl=https://evil.example` | Lands on `/dashboard` |
| TC-AUTH-24 | P2 | Attempt sign-in repeatedly | 429 message |

## Access control and location

| ID | Pri | Steps | Expected |
| --- | --- | --- | --- |
| TC-ACC-01 | P1 | Open `/users` signed out | `/login?redirectUrl=%2Fusers` |
| TC-ACC-02 | P1 | As a user, open `/users` | `/dashboard` |
| TC-ACC-03 | P1 | Sign in as a user | No Admin/Seeds sections |
| TC-ACC-04 | P1 | Open the app from outside AP/Telangana | `/restricted-region` |
| TC-ACC-05 | P2 | Allowed user opens `/restricted-region` | Redirected away |
| TC-ACC-06 | P2 | Deny geolocation and block `ipapi.co` | Access denied |

## Account

| ID | Pri | Steps | Expected |
| --- | --- | --- | --- |
| TC-ACCT-01 | P2 | Toggle a wish setting; save | Success toast; persists |
| TC-ACCT-02 | P2 | Toggle MFA with the backend failing | Switch reverts; error toast |
| TC-ACCT-03 | P2 | Impersonate, then toggle MFA | Warning; no request |
| TC-ACCT-04 | P2 | Select a 6 MB profile image | Refused with a size message |
| TC-ACCT-05 | P2 | Select a PDF as a profile picture | Refused as not an image |
| TC-ACCT-06 | P3 | Choose a theme | Applies at once; persists |
| TC-ACCT-07 | P3 | Choose a theme with the save failing | Theme applied locally; error toast |
| TC-ACCT-08 | P2 | Change password with valid values | Success; new password works |
| TC-ACCT-09 | P2 | Use the reveal toggle | Masked email becomes visible, then hidden |

## Dashboard

| ID | Pri | Steps | Expected |
| --- | --- | --- | --- |
| TC-DASH-01 | P2 | Open `/dashboard` | Last seven days; charts render |
| TC-DASH-02 | P3 | Pick a future date | Reverts to a valid value |
| TC-DASH-03 | P3 | Set start after end | End moves to match; reload |
| TC-DASH-04 | P3 | Press a preset | Range and charts update |
| TC-DASH-05 | P3 | Compare the health percentage with sent/failed | Formula and thresholds correct |
| TC-DASH-06 | P3 | Open `/events` with the network panel | No CanvasJS request |

## Events

| ID | Pri | Steps | Expected |
| --- | --- | --- | --- |
| TC-EVT-01 | P1 | Create an event with valid values | Success toast; appears in the list |
| TC-EVT-02 | P1 | Create an event with a 2 MB PNG | Multipart request; thumbnail shown |
| TC-EVT-03 | P2 | Select an SVG | Refused with the supported-types message |
| TC-EVT-04 | P2 | Select a 60 MB video | Refused with the 50 MB limit |
| TC-EVT-05 | P2 | Edit an event with existing media, change the date | JSON update; media preserved |
| TC-EVT-06 | P2 | Enter `ftp://x` as the wishes link | Field error; no request |
| TC-EVT-07 | P2 | Recurring 29 Feb event in a non-leap year | Next occurrence is 28 Feb |
| TC-EVT-08 | P2 | Delete one event; confirm | Removed; success toast |
| TC-EVT-09 | P2 | Select three events; bulk delete | All removed; selection cleared |
| TC-EVT-10 | P3 | Apply a type filter and sort | Query re-runs from page 0 |
| TC-EVT-11 | P3 | Select rows, then change page | Selection cleared |

## Calendar

| ID | Pri | Steps | Expected |
| --- | --- | --- | --- |
| TC-CAL-01 | P2 | Switch month/week/day/agenda | Each renders; choice persists |
| TC-CAL-02 | P2 | Disable birthdays | Birthday entries disappear; persists |
| TC-CAL-03 | P1 | Jump one year forward | Festivals appear on their month/day |
| TC-CAL-04 | P2 | View a year after a one-time anniversary | It does not appear |
| TC-CAL-05 | P2 | Open the calendar near a known date | Upcoming list within 30 days |
| TC-CAL-06 | P2 | Download a day as `.ics` | File imports into a calendar app |
| TC-CAL-07 | P3 | Press "Add to Google Calendar" | New tab with the correct date |
| TC-CAL-08 | P3 | Copy the day summary | Clipboard contains the entries |
| TC-CAL-09 | P3 | Swipe horizontally on touch | Period changes; vertical scroll unaffected |
| TC-CAL-10 | P2 | Press Escape with the day sheet open | Sheet closes |
| TC-CAL-11 | P2 | Click a festival | Wish panel opens for that festival |

## Festival wishes

| ID | Pri | Steps | Expected |
| --- | --- | --- | --- |
| TC-FEST-01 | P1 | As admin, link two users to a festival | Message reports 2 added; rows appear |
| TC-FEST-02 | P2 | Edit a mapping's note and wishes link | Values persist |
| TC-FEST-03 | P2 | Toggle a mapping off | Status becomes inactive |
| TC-FEST-04 | P2 | Remove a mapping; confirm | Row disappears |
| TC-FEST-05 | P2 | Open the same festival as a user | Only their own wish; read-only |
| TC-FEST-06 | P2 | Filter by failed on `/festival-wish-mappings` | Only failed mappings listed |
| TC-FEST-07 | P2 | View a festival stored last year | Timing relative to its next occurrence |

## Circles and chat

| ID | Pri | Steps | Expected |
| --- | --- | --- | --- |
| TC-CIR-01 | P1 | Search two characters; send a request | Row shows "requested" |
| TC-CIR-02 | P1 | Recipient accepts | Both sides show each other as members |
| TC-CIR-03 | P2 | Reject an incoming request; confirm | Request disappears for both |
| TC-CIR-04 | P2 | Withdraw an outgoing request | Row returns to "send request" |
| TC-CIR-05 | P2 | Remove a member; confirm | Member and chat conversation disappear |
| TC-CIR-06 | P3 | Type quickly in the search box | One debounced request |
| TC-CHAT-01 | P1 | Send a message | Appears for both users |
| TC-CHAT-02 | P2 | Attach a 2 MB image and send | Image previews inline |
| TC-CHAT-03 | P2 | Attach a 60 MB file | Refused before sending |
| TC-CHAT-04 | P2 | Reply, edit own, delete own | Each reflected for both users |
| TC-CHAT-05 | P3 | Add and remove a reaction | Count updates |
| TC-CHAT-06 | P1 | With restriction on, open a non-member conversation | Composer locked with an explanation |
| TC-CHAT-07 | P3 | Other user goes offline | Header shows last seen |
| TC-CHAT-08 | P3 | Search a word in the thread | Matches highlighted |

## Email status

| ID | Pri | Steps | Expected |
| --- | --- | --- | --- |
| TC-EMAIL-01 | P2 | Open `/email-status`; filter by status | Rows match the filter |
| TC-EMAIL-02 | P2 | Open `/email-status/otp` | Title and type from route data |
| TC-EMAIL-03 | P2 | As a user, open `/email-status/otp` | `/dashboard` |
| TC-EMAIL-04 | P3 | Open a record; switch desktop/mobile | Body constrained appropriately |
| TC-EMAIL-05 | P2 | Expand the image | One image request; placeholder while loading |
| TC-EMAIL-06 | P1 | Retry a failed record | Success toast; status refreshes |
| TC-EMAIL-07 | P2 | Delete a record; confirm | Removed |
| TC-EMAIL-08 | P3 | Select and delete several | All removed; selection cleared |

## Notifications

| ID | Pri | Steps | Expected |
| --- | --- | --- | --- |
| TC-NOTIF-01 | P2 | Create a notification without a schedule | Saved as a draft |
| TC-NOTIF-02 | P1 | Set a start in the past; submit | Rejected with the future-start message |
| TC-NOTIF-03 | P2 | Set end before start | Rejected with the ordering message |
| TC-NOTIF-04 | P1 | Publish a valid draft | Success; signed-in users see the banner |
| TC-NOTIF-05 | P1 | Open a published notification in the editor | Redirected with "cannot be edited" |
| TC-NOTIF-06 | P1 | Try to delete a published notification | Refused |
| TC-NOTIF-07 | P2 | Unpublish, then edit | Editor opens normally |
| TC-NOTIF-08 | P3 | Dismiss the banner; reload | Does not reappear in the session |
| TC-NOTIF-09 | P2 | Load the app signed out | No notification request or socket |

## Administration

| ID | Pri | Steps | Expected |
| --- | --- | --- | --- |
| TC-USER-01 | P1 | Create a user with valid values | Success; user in the list |
| TC-USER-02 | P2 | Enter `not-an-email` | Field error; no request |
| TC-USER-03 | P2 | Deactivate a user | Confirmation; cancel leaves them active |
| TC-USER-04 | P2 | Select two users; bulk deactivate | Both deactivated |
| TC-USER-05 | P1 | "Log in as" a non-admin | Banner; admin nav hidden; theme reloads |
| TC-USER-06 | P2 | Try to impersonate an admin | Warning; no request |
| TC-USER-07 | P1 | Press "Return to Admin" | Admin session restored; `/users` |
| TC-SEED-01 | P3 | Create "Best Friend" | Code `BEST_FRIEND`; appears in the user editor |
| TC-SEED-02 | P3 | Delete a seed used by a user | Backend refusal shown |
| TC-WISHIMG-01 | P2 | Upload a PNG for Birthday | Appears in the library and previews |
| TC-WISHIMG-02 | P3 | Edit an image; clear the owner | Becomes general |
| TC-SCHED-01 | P2 | Trigger a scheduler job | Confirmation toast; counts refresh |
| TC-AGENT-01 | P2 | Run delivery-ops | Report shown; status refreshes |
| TC-AGENT-02 | P3 | Trigger while a run is in progress | "A triage run is already in progress." |
| TC-AGENT-03 | P2 | Ask the copilot a question under 500 characters | Answer appears |
| TC-AGENT-04 | P3 | Open `/agents` with the copilot disabled | Composer locked; explanation shown |
| TC-SEC-01 | P2 | Open `/login-locations`; change the range | KPIs and rows update |
| TC-SEC-02 | P3 | Open a map for a login with coordinates | Google Maps at those coordinates |
| TC-SEC-03 | P2 | View an IP with five distinct emails | Marked high suspicion |
| TC-SEC-04 | P2 | Export CSV; inspect a cell starting with `=` | Cell prefixed with `'` |

## Platform and resilience

| ID | Pri | Steps | Expected |
| --- | --- | --- | --- |
| TC-SYS-01 | P1 | Disable the network for ~20 s | Browser `offline` event or two failed heartbeats shows the overlay |
| TC-SYS-02 | P1 | Restore the network | "You're back online", then overlay disappears; same route |
| TC-SYS-03 | P2 | Run locally against a backend that rejects the origin | Error toasts, no offline overlay |
| TC-SYS-04 | P2 | Trigger a slow list load | Overlay shows, then hides |
| TC-SYS-05 | P2 | Send a chat message | No full-screen overlay |
| TC-SYS-06 | P1 | Open at 360 px | No horizontal scroll; menu opens and closes |
| TC-SYS-07 | P2 | Check three themes at 360 px | Text and icons remain legible |
| TC-SYS-08 | P2 | Tab through login, dashboard, events, calendar | All actions reachable; focus visible |
| TC-SYS-09 | P3 | Open `/does-not-exist` | Redirected to `/dashboard` |
| TC-SYS-10 | P3 | Return an array instead of a paged object | List still renders |
