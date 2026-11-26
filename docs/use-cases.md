# Use Cases

## 1. Actors

| Actor | Type | Description |
| --- | --- | --- |
| Guest | Primary | Unauthenticated visitor |
| User | Primary | Authenticated account with `ROLE_USER` |
| Admin | Primary | Authenticated account with `ROLE_ADMIN`; inherits all User use cases |
| Backend API | Supporting | Spring Boot service; source of truth, scheduler, mail and AI |
| Mail provider | Supporting | Delivers greeting and OTP emails; reports status to the backend |
| Geolocation provider (`ipapi.co`) | Supporting | Supplies IP-based country/region |
| Google Identity Services | Supporting | Supplies an ID token for SSO |
| Object storage | Supporting | Stores profile pictures and media |

## 2. Use case catalogue

| ID | Use case | Actors | Related FRs |
| --- | --- | --- | --- |
| UC-01 | Sign in with password | Guest | FR-AUTH-01, 02, 18 |
| UC-02 | Complete MFA challenge | Guest | FR-AUTH-03 |
| UC-03 | Sign in with Google | Guest | FR-AUTH-04 |
| UC-04 | Sign in with OTP | Guest | FR-AUTH-05 |
| UC-05 | Reset forgotten password | Guest | FR-AUTH-06, 07, 08 |
| UC-06 | Accept a circle request via one-time link | Guest | FR-AUTH-09 |
| UC-07 | Session refresh and expiry | System | FR-AUTH-11, 12, 13 |
| UC-08 | Handle a superseded session | System | FR-AUTH-15, 16 |
| UC-09 | Manage account and security settings | User | FR-ACCT-01 … 07 |
| UC-10 | Choose a theme | User | FR-ACCT-07 |
| UC-11 | Create or edit an event | Admin | FR-EVT-02 … 07 |
| UC-12 | Browse events and preview media | User | FR-EVT-01, 09, 10 |
| UC-13 | Plan with the calendar | User | FR-CAL-01 … 11 |
| UC-14 | Link people to a festival | Admin | FR-FEST-01 … 03 |
| UC-15 | Build a circle | User | FR-CIR-01 … 06 |
| UC-16 | Chat within the circle | User | FR-CHAT-01 … 09 |
| UC-17 | Investigate an email delivery | Admin | FR-EMAIL-01 … 06 |
| UC-18 | Publish an announcement | Admin | FR-NOTIF-01 … 05 |
| UC-19 | Trigger a scheduler | Admin | FR-SCHED-01, 02 |
| UC-20 | Run AI triage and ask the copilot | Admin | FR-AGENT-01 … 04 |
| UC-21 | Manage users | Admin | FR-USER-01 … 06 |
| UC-22 | Impersonate a user | Admin | FR-USER-07 … 09 |
| UC-23 | Review sign-in locations | Admin | FR-SEC-01, 02 |
| UC-24 | Investigate failed sign-ins | Admin | FR-SEC-03, 04 |
| UC-25 | Manage the greeting-image library | Admin | FR-WISHIMG-01 … 03 |
| UC-26 | Manage seeds | Admin | FR-SEED-01 … 03 |
| UC-27 | Recover from lost connectivity | Any | FR-SYS-05 |

---

## UC-01 Sign in with password

**Actor:** Guest · **Preconditions:** valid account, allowed location · **Postcondition:** authenticated session

**Main flow**
1. Guest opens any route. The location guard resolves the country/region.
2. Outside India/AP/Telangana → redirected to `/restricted-region` (end).
3. Guest is redirected to `/login?redirectUrl=<original>`.
4. Guest enters email and password, optionally ticks "remember me", and submits.
5. The client resolves location metadata (browser GPS, else `ipapi.co`) and posts to `/auth/login` with `forceMfa=true`.
6. Backend returns `accessToken`, `refreshToken`, `expiresIn`, `role`.
7. Tokens are stored in `localStorage` (remember me) or `sessionStorage`; role and auth signals are set.
8. Auto-logout and pre-expiry refresh timers are scheduled.
9. The client navigates to the safe `redirectUrl` or `/dashboard`.

**Alternate flows**
- **A1 Wrong credentials:** backend returns 401 with a message → toast shows the message; the guest stays on the page.
- **A2 Rate limited:** 429 → toast "Too many attempts. Please wait a minute and try again."
- **A3 MFA required:** backend returns `MFA_OTP_REQUIRED` → continue at UC-02.
- **A4 Location unavailable:** guard denies access → `/restricted-region`.
- **A5 Backend unreachable:** status 0 → connectivity probe; offline overlay if confirmed.

## UC-02 Complete MFA challenge

**Actor:** Guest · **Preconditions:** password or Google sign-in returned `MFA_OTP_REQUIRED`

**Main flow**
1. The client navigates to `/otp-login`, carrying email, remember-me, provider and location in navigation state.
2. Because `mfaRequired` is set, an OTP is requested automatically.
3. Guest reads the code from email and submits it with the carried context.
4. `POST /auth/otp/verify-login` returns tokens; the session is stored and the user is navigated onward.

**Alternate flows**
- **A1 Invalid/expired code:** toast explains; the guest can retry or resend.
- **A2 Resend:** "Send OTP" can be used again (subject to backend rate limiting).

## UC-03 Sign in with Google

**Actor:** Guest · **Preconditions:** backend exposes a client id

**Main flow**
1. On `/login`, the client fetches `GET /auth/sso/token` (cached base64 in `localStorage` as `fw_sso_token`).
2. Google Identity Services is loaded on demand and the button rendered into the reserved slot.
3. Guest chooses an account; Google returns an ID token.
4. The client posts the token to `/auth/sso/google` with location metadata and `forceMfa=true`.
5. On success the session is stored and the user is navigated onward.

**Alternate flows**
- **A1 No client id:** the button is not rendered; password and OTP remain available.
- **A2 Script blocked:** a warning toast is shown.
- **A3 MFA required:** continue at UC-02 with `provider=GOOGLE`.

## UC-04 Sign in with OTP

**Actor:** Guest · **Preconditions:** none

**Main flow**
1. Guest opens `/otp-login` and enters an email.
2. `POST /auth/otp/send`; a success toast confirms.
3. Guest enters the code (4–6 digits) and submits.
4. `POST /auth/otp/verify-login` returns tokens; the session is stored and the user is navigated onward.

**Alternate flows**
- **A1 Invalid code:** toast; the form stays for retry.
- **A2 Email invalid:** field validation blocks submission.

## UC-05 Reset forgotten password

**Actor:** Guest

**Main flow**
1. Guest opens `/forgot-password`, enters an email and submits.
2. `POST /auth/forgot-password`; a success toast is shown regardless (no account enumeration on the UI).
3. Guest opens the emailed link, which contains `token` and `email`.
4. The root route (`/`) or `/password-reset` redirects to `/reset-password?token=…&email=…` through `resetLinkGuard`.
5. Guest enters a new password (≥ 8) and confirmation.
6. `POST /auth/password-reset/confirm`; on success the user is sent to `/login` after 1.5 s.

**Alternate flows**
- **A1 Missing token:** the page warns immediately and refuses to submit.
- **A2 Mismatched passwords:** a toast blocks the request.
- **A3 Expired token:** backend error message is shown; the guest requests a new link.

## UC-06 Accept a circle request via one-time link

**Actor:** Guest · **Preconditions:** a circle-request email containing `token`

**Main flow**
1. The link points at a protected route with `token` (and optionally `email`).
2. `authGuard` sees the token and redirects to `/direct-login` with the same query parameters.
3. The page resolves location metadata and posts to `/auth/direct-login`.
4. Tokens are stored; the user is navigated to `redirectUrl` or `/circles`.
5. The user sees the incoming request and accepts it (UC-15).

**Alternate flows**
- **A1 Missing token:** a failure message with a link to normal sign-in.
- **A2 Expired/invalid token:** backend message shown; the user signs in normally.

## UC-07 Session refresh and expiry

**Actor:** System

**Main flow**
1. On session creation the client schedules a refresh at `expiresIn − 30 s` and a hard logout at `expiresIn`.
2. At refresh time `POST /auth/refresh` returns a new token pair, which is stored and rescheduled.
3. If any request returns 401, the interceptor performs one refresh and retries the request with the new token.

**Alternate flows**
- **A1 Refresh fails (not concurrent login):** the user is signed out and sent to `/login`.
- **A2 Refresh rejected for concurrent login:** continue at UC-08.
- **A3 Hard expiry reached:** logout runs; the current URL is preserved as `redirectUrl`.

## UC-08 Handle a superseded session

**Actor:** System · **Preconditions:** account has `concurrentLoginAllowed=false` and signed in elsewhere

**Main flow**
1. Any request returns 401 whose body message begins with `CONCURRENT_LOGIN`.
2. The interceptor stops before attempting a refresh.
3. `AuthService.flagConcurrentLogin` clears tokens and sets the notice text.
4. A blocking overlay explains the session ended elsewhere and offers "Sign out & sign in again".
5. Token-less requests that now fail are ignored by the interceptor.

**Alternate flows**
- **A1 Refresh itself rejected:** the same notice is raised from the refresh error path.
- **A2 User ignores the notice:** no automatic logout or navigation occurs; the notice stays.

## UC-09 Manage account and security settings

**Actor:** User

**Main flow**
1. The user opens `/account`; the profile is loaded (`GET /users/me`).
2. The user toggles wish settings and saves → `PATCH /users/me/wish-settings`.
3. The user toggles two-step sign-in → `PATCH /users/me/mfa`; the switch reflects the server value.
4. The user toggles single-session → `PATCH /users/me/concurrent-login`.
5. The user changes the password with current + new + confirmation → `POST /auth/change-password`.
6. The user uploads a profile picture → validated, then `POST /users/me/profile-picture`; removal uses `DELETE`.

**Alternate flows**
- **A1 Save fails:** the switch reverts and a toast explains.
- **A2 Impersonating:** security changes are refused with a warning.
- **A3 Image too large/wrong type:** the client refuses before uploading.

## UC-10 Choose a theme

**Actor:** User

**Main flow**
1. The account page loads the catalog (`GET /themes`) and the saved preference (`GET /themes/me`).
2. The user picks a theme; `PUT /themes/me` saves it.
3. `data-theme` on `<html>` is updated immediately and the choice cached in `fw_theme`.

**Alternate flows**
- **A1 Save fails:** the theme is still applied locally and an error is shown.
- **A2 Catalog unavailable:** the built-in 11-theme catalog is used.

## UC-11 Create or edit an event

**Actor:** Admin · **Preconditions:** at least one active event type and one user

**Main flow**
1. Admin opens `/events/new` (or `/events/:id/edit`).
2. Users, event types and (when editing) the event load in parallel.
3. Admin selects the user, event type, date, recurrence and optional wishes link.
4. Optionally the admin selects greeting media; it is validated and previewed.
5. The editor shows the next occurrence and relative timing.
6. Save: with media → multipart `/events/with-image` (or `/events/{id}/with-image`); without media → JSON `/events` (or `PUT /events/{id}`).
7. Success toast and navigation to `/events`.

**Alternate flows**
- **A1 Validation errors:** fields are marked and saving is blocked.
- **A2 Past one-time event:** a warning is shown; the admin may still save.
- **A3 Unsupported file:** a specific reason is shown and the input is cleared.
- **A4 Load failure:** the page reports it and offers retry.

## UC-12 Browse events and preview media

**Actor:** User

**Main flow**
1. The user opens `/events`; the list loads page 0 with the default sort (`eventDate` desc).
2. The user searches, filters by type/user/status, changes page size or sorts a column.
3. Rows show the type icon, date, owner, recurrence and a media thumbnail when present.
4. Clicking a thumbnail opens the lightbox with the correct renderer (image, video, audio, PDF or download).

**Alternate flows**
- **A1 No results:** an empty state explains how to broaden the search.
- **A2 Load error:** a toast is shown and the previous rows remain.

## UC-13 Plan with the calendar

**Actor:** User

**Main flow**
1. The user opens `/calendar`; the saved view and kind filters are restored.
2. The client computes the months (and year) to load, fetches each uncached `year-month`, and caches the result.
3. The grid (or week/day/agenda list) is rebuilt, with an "upcoming" strip for the next 30 days.
4. The user navigates with the arrows, "Today", year jumps, or a swipe.
5. Clicking a day opens the day sheet; clicking an entry opens the event dialog.
6. From the day sheet the user downloads `.ics`, opens Google Calendar, or copies the summary.
7. Clicking a festival opens the festival wish panel (UC-14).

**Alternate flows**
- **A1 A month fails to load:** that month shows empty while others render; a retry is available.
- **A2 No kinds enabled:** the calendar shows an empty-state hint.
- **A3 Escape pressed:** the open sheet/dialog closes.

## UC-14 Link people to a festival

**Actor:** Admin

**Main flow**
1. Admin opens a festival from the calendar.
2. The panel loads mappings for that festival and the user list.
3. Admin selects one or more users and links them, optionally with a note.
4. Bulk save creates missing mappings and updates existing ones; a summary message reports added/updated counts.
5. Admin may edit a mapping's note (≤ 500), wishes link, image or active state, or remove it.

**Alternate flows**
- **A1 No users match:** the search shows an empty state.
- **A2 Link invalid:** the wishes-link error explains the rule and blocks saving.
- **A3 Non-admin:** the panel shows only the user's own wish, read-only.

## UC-15 Build a circle

**Actor:** User

**Main flow**
1. The user opens `/circles`; members, incoming and outgoing requests load.
2. The user types at least two characters; a debounced directory search runs.
3. The user sends a request; the row shows "requested".
4. The recipient accepts, which creates the mutual circle for both.
5. Either side may later remove the link, after confirmation.

**Alternate flows**
- **A1 The other person already requested:** sending accepts instead of creating a duplicate.
- **A2 Reject:** the request disappears for both.
- **A3 Cancel outgoing:** the sender withdraws the request.
- **A4 Search fails:** an empty result is shown; the list still works.

## UC-16 Chat within the circle

**Actor:** User

**Main flow**
1. The user opens the chat widget; conversations and unread counts load.
2. The user opens a conversation or starts one from the picker (circle members only when restricted).
3. Messages load newest-first in pages; older pages load on scroll.
4. The user types a message, optionally attaches a file, replies to a message, or adds a reaction.
5. The message is posted; the backend broadcasts it over STOMP to both participants.
6. Seen and typing events update the thread; presence updates the header.

**Alternate flows**
- **A1 Target outside the circle:** the composer is locked with an explanation and a link to Family & Friends.
- **A2 Target deactivated:** the thread is read-only.
- **A3 Attachment too large:** refused before sending.
- **A4 WebSocket unavailable:** REST still delivers messages on refresh; no live updates.

## UC-17 Investigate an email delivery

**Actor:** Admin

**Main flow**
1. Admin opens an email-status view (generic or a type-specific route).
2. Admin searches by recipient/subject and filters by status.
3. Admin opens a record; the body previews in desktop or mobile width.
4. The image is fetched on demand when requested.
5. A failed record is retried; success is confirmed by a toast and a refreshed status.
6. Obsolete records are deleted (single or bulk) after confirmation.

**Alternate flows**
- **A1 Image fetch fails:** a placeholder with a retry action is shown.
- **A2 Retry fails:** the error message from the backend is displayed.

## UC-18 Publish an announcement

**Actor:** Admin

**Main flow**
1. Admin creates a notification with title, message, optional "can send email" and an optional schedule window.
2. The editor validates that the window is in the future and ordered.
3. Saving keeps it as a draft.
4. Admin publishes; the backend stamps the publish time and broadcasts `NOTIFICATION_PUBLISHED`.
5. Signed-in users see the banner (and a toast) without reloading.
6. To change it, the admin unpublishes first.

**Alternate flows**
- **A1 Stale schedule:** publish is blocked with an explanation; the admin edits the schedule.
- **A2 Published record opened in the editor:** the admin is redirected to the list with an error toast.
- **A3 WebSocket unavailable:** the banner appears on next load via the published endpoint or the collection fallback.

## UC-19 Trigger a scheduler

**Actor:** Admin

**Main flow**
1. Admin opens `/schedulers`; jobs load with counts, last status and next fire time.
2. Admin triggers a job; the button shows progress while the request runs.
3. The backend confirms; a toast shows its message and the list refreshes.

**Alternate flows**
- **A1 Job already running:** the backend refuses; the toast explains.
- **A2 Load failure:** an error toast names the endpoint.

## UC-20 Run AI triage and ask the copilot

**Actor:** Admin

**Main flow**
1. Admin opens `/agents`; the status of wish composer, delivery-ops and copilot loads.
2. If delivery-ops is enabled, the admin runs triage; the run shows progress and then a report.
3. The admin asks the copilot a question (≤ 500 characters) or uses a suggestion.
4. The answer appears in the transcript; errors are shown as an assistant message.

**Alternate flows**
- **A1 Run already in progress:** 409 → "A triage run is already in progress."
- **A2 Copilot disabled:** 503 → the returned explanation is shown and the composer stays locked.
- **A3 Question too long:** the send action is disabled.

## UC-21 Manage users

**Actor:** Admin

**Main flow**
1. Admin opens `/users`; the first page loads with filters from the backend.
2. Admin searches, filters, sorts or changes the page size.
3. Admin creates a user or edits one; the form loads relationship seeds.
4. Admin activates or deactivates an account, or deactivates the current page's selection.

**Alternate flows**
- **A1 Duplicate email:** the backend message is shown on the form.
- **A2 Deactivating:** confirmation is required; activation is immediate.
- **A3 Load failure:** a toast is shown and the table stays empty.

## UC-22 Impersonate a user

**Actor:** Admin · **Preconditions:** target is not an admin

**Main flow**
1. Admin chooses "log in as" on a user row.
2. The backend returns a token pair for that user; the admin token is retained for switching back.
3. The impersonated user is stored in `sessionStorage`; a banner and sidebar notice appear.
4. Admin-only navigation disappears; the theme reloads for the impersonated user.
5. "Return to Admin" calls `GET /auth/admin/switch-back`, clears impersonation and returns to `/users`.

**Alternate flows**
- **A1 Target is an admin:** refused with a warning.
- **A2 Switch-back fails:** a toast explains and the admin stays impersonated.
- **A3 Security settings:** attempts to change them are refused with a warning.

## UC-23 Review sign-in locations

**Actor:** Admin

**Main flow**
1. Admin opens `/login-locations`; the default range is applied.
2. KPIs, top locations, per-user summaries and the history table render.
3. Admin searches, filters by user, or shows only users with multiple locations.
4. Admin opens a map for a login with coordinates, or exports the data as CSV.

**Alternate flows**
- **A1 Range too large:** the backend may truncate; the UI notes that older logins were omitted.
- **A2 No logins:** an empty state is shown.

## UC-24 Investigate failed sign-ins

**Actor:** Admin

**Main flow**
1. Admin opens `/violated-users` and picks a range (today / 7 days / 30 days / custom).
2. Totals, a daily bar chart, suspicious-IP and suspicious-email summaries and the list render.
3. Admin searches by email or IP; emails are masked until revealed.
4. High-suspicion IPs (≥ 5 distinct emails) are highlighted.
5. Admin exports the view as CSV for the security team.

**Alternate flows**
- **A1 IP enrichment fails:** rows show the raw IP with a "lookup failed" marker.
- **A2 No attempts:** an empty state confirms the range is clean.

## UC-25 Manage the greeting-image library

**Actor:** Admin

**Main flow**
1. Admin opens `/wish-images`; the library loads with filters.
2. Admin uploads an image for an event type, optionally scoped to a user, and marks it active.
3. Admin edits the type/owner/state, replaces the image, or clears the owner.
4. Admin deletes one or several images after confirmation.

**Alternate flows**
- **A1 Unsupported file:** refused with a reason before upload.
- **A2 No active image for a type:** the backend falls back to a general image.

## UC-26 Manage seeds

**Actor:** Admin

**Main flow**
1. Admin opens `/relationship-seeds` or `/event-type-seeds`.
2. Admin creates a seed by entering a display name; the code is derived automatically.
3. Admin edits the display name or deletes the seed.
4. Seeds appear immediately in the user editor and event editor.

**Alternate flows**
- **A1 Primary endpoint unavailable:** the client retries the legacy path transparently.
- **A2 Seed in use:** the backend refuses deletion; the message is shown.

## UC-27 Recover from lost connectivity

**Actor:** Any

**Main flow**
1. The connectivity heartbeat fails twice in a row (or the browser fires `offline`).
2. The full-screen offline notice appears with a "Retry now" action.
3. When a probe succeeds, the overlay switches to "You're back online" and dismisses itself.
4. The user remains on the same route with their data intact.

**Alternate flows**
- **A1 CORS rejection rather than real offline:** the probe still succeeds, so the notice is not shown.
- **A2 Probe timeout (8 s):** counted as a failure; a second failure shows the notice.
