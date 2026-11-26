# Functional Requirements

Each requirement has an identifier, a priority (M = must, S = should, C = could) and the
implementation location. Requirements describe observable behaviour, not internal design.

Roles: **Guest** (not signed in), **User** (`ROLE_USER`), **Admin** (`ROLE_ADMIN`).

---

## FR-AUTH — Authentication and sessions

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-AUTH-01 | M | A guest shall sign in with email and password; the session is kept in `localStorage` when "remember me" is checked and in `sessionStorage` otherwise. | `login.component.ts`, `AuthService.setSession` |
| FR-AUTH-02 | M | Sign-in shall send the detected location (city/region/country), IP, latitude and longitude when available. | `login.component.ts::resolveLoginLocation` |
| FR-AUTH-03 | M | If the backend answers with `MFA_OTP_REQUIRED`, the user shall be sent to the OTP page with the email, remember-me choice, provider and location carried across, and an OTP shall be requested automatically. | `login.component.ts::handleMfaChallenge`, `otp-login.component.ts` |
| FR-AUTH-04 | S | A guest shall sign in with Google; the button appears only when a client id resolves, and its space is reserved while loading. | `login.component.ts::initiateGoogleSso` |
| FR-AUTH-05 | S | A guest shall request an OTP for an email and verify it to obtain a session. | `otp-login.component.ts`, `AuthService.sendOtp/verifyLoginOtp` |
| FR-AUTH-06 | M | A guest shall request a password-reset link by email and receive confirmation that the request was accepted. | `forgot-password.component.ts` |
| FR-AUTH-07 | M | A reset link (`token` + `email` query parameters) shall open the reset page; a reset link arriving at the root path shall be redirected there. | `reset-link.guard.ts` |
| FR-AUTH-08 | M | A reset password must be at least 8 characters and match its confirmation before it is submitted. | `reset-password.component.ts` |
| FR-AUTH-09 | S | A one-time direct-login link (e.g. from a circle-request email) shall exchange its token for a session and continue to the requested page (default `/circles`). | `direct-login.component.ts`, `auth.guard.ts` |
| FR-AUTH-10 | M | A signed-in user shall change their password by supplying the current password and a new one of at least 8 characters. | `account-management.component.ts` |
| FR-AUTH-11 | M | The access token shall be refreshed automatically shortly before expiry (30 s), and the user signed out if the refresh fails for any reason other than a concurrent-login rejection. | `AuthService.scheduleAutoLogout` |
| FR-AUTH-12 | M | The user shall be signed out automatically when the access token lifetime elapses. | `AuthService.autoLogout` |
| FR-AUTH-13 | M | A 401 response shall trigger one refresh-and-retry; a second failure signs the user out. | `auth.interceptor.ts` |
| FR-AUTH-14 | M | A 403 response shall sign the user out immediately. | `auth.interceptor.ts` |
| FR-AUTH-15 | M | A concurrent-login rejection (401 whose body message starts with `CONCURRENT_LOGIN`) shall clear the stored tokens and show a blocking notice explaining that the session ended elsewhere; the user is **not** navigated away. | `auth.interceptor.ts`, `concurrent-login-overlay.component.ts` |
| FR-AUTH-16 | M | While the concurrent-login notice is showing, no other automatic sign-out may clear it, and token-less request failures shall be ignored. | `AuthService.autoLogout`, `auth.interceptor.ts` |
| FR-AUTH-17 | M | The user shall explicitly sign out from the account page; signing out clears tokens, role and timers and returns to `/login`. | `AuthService.logout` |
| FR-AUTH-18 | M | After sign-in the user shall be returned to the requested `redirectUrl` when it is a safe internal path, otherwise `/dashboard`. | `AuthService.getSafeRedirectUrl` |
| FR-AUTH-19 | M | A signed-in user visiting `/login` shall be redirected to `/dashboard`. | `guest.guard.ts` |
| FR-AUTH-20 | S | The login page shall show the backend's message for a rejected sign-in and a rate-limit message for HTTP 429. | `apiErrorMessage` |

## FR-ACCT — Account and preferences

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-ACCT-01 | M | The account page shall show the signed-in user's name, email and role. | `account-management.component.ts` |
| FR-ACCT-02 | M | The user shall toggle birthday, good-morning and good-night wishes; changes are saved to the profile. | `updateWishSettings` |
| FR-ACCT-03 | M | The user shall turn two-step sign-in (MFA) on or off; a failed save reverts the switch. | `updateMyMfa` |
| FR-ACCT-04 | M | The user shall turn single-session sign-in on or off; a failed save reverts the switch. | `updateMyConcurrentLogin` |
| FR-ACCT-05 | M | Neither security switch may be changed while impersonating. | `saveMfaSetting`, `saveConcurrentLoginSetting` |
| FR-ACCT-06 | M | The user shall upload or remove a profile picture; only images are accepted and the client validates size and type first. | `uploadMyProfilePicture`, `imageError` |
| FR-ACCT-07 | M | The user shall choose a theme from the catalog; the choice is saved and applied immediately, and is applied locally even if saving fails. | `ThemeService.select` |
| FR-ACCT-08 | S | Admins shall see the current Pollinations AI balance on the account page. | `getPollinationsBalance` |

## FR-USER — User administration (Admin)

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-USER-01 | M | Admins shall list users with pagination, page-size choice, search, sorting and multi-select filters for role, gender, relationship and active state. | `users.component.ts` |
| FR-USER-02 | M | Admins shall create and edit a user: name, email, gender, date of birth, role, relationship, wish toggles, birthday wishes link, MFA and concurrent-login settings. | `user-editor.component.ts` |
| FR-USER-03 | M | Email shall be required and valid; name, gender, date of birth, role and relationship shall be required. | `user-editor.component.ts` validators |
| FR-USER-04 | M | The birthday wishes link is optional; when present it must be an absolute `http(s)` URL of at most 500 characters with no credentials. | `wishes-url.ts`, `wishesUrlValidator` |
| FR-USER-05 | M | Admins shall activate or deactivate a user; deactivation requires confirmation, activation does not. | `users.component.ts::deactivate` |
| FR-USER-06 | M | Admins shall deactivate several users at once; the batch applies only to the current page's selection. | `deactivateSelected`, `BulkSelection` |
| FR-USER-07 | S | Admins shall "log in as" a non-admin user (impersonation), see the app as that user, and return to their own session from the banner or sidebar. | `loginAsUser`, `switchBackToAdmin`, `ImpersonationService` |
| FR-USER-08 | M | Admins shall not impersonate another admin. | `canImpersonate` |
| FR-USER-09 | M | While impersonating, admin-only navigation shall be hidden and the shell shall display a persistent "viewing as" banner. | `AuthService.isAdmin`, `app.component.html` |
| FR-USER-10 | M | The email address in lists shall be masked until the viewer reveals it. | `SensitiveEmailPipe` |

## FR-DASH — Dashboard

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-DASH-01 | M | The dashboard shall show total users, upcoming events, emails sent today and failed emails. | `getDashboard` |
| FR-DASH-02 | M | The dashboard shall show mail-flow cards for OTP and forgot-password emails (sent today, failed). | `getOtpMailDashboard`, `getForgotPasswordMailDashboard` |
| FR-DASH-03 | M | The dashboard shall chart sent and failed mail per day, plus Instagram metrics, for a selectable date range. | `getMailChart`, `getInstaChart`, `canvasjs-line-chart.component.ts` |
| FR-DASH-04 | M | The date range shall default to the last seven days, reject future dates, keep start ≤ end, and offer quick presets. | `dashboard.component.ts` |
| FR-DASH-05 | M | The dashboard shall compute a delivery-health percentage: ≥ 98% good, ≥ 90% warn, otherwise bad; a day with no mail counts as 100%. | `dashboard.utils.ts::deliveryHealth` |
| FR-DASH-06 | S | Charts shall sort points by date and coerce missing or negative values to 0. | `normalizeChartPoints`, `toSafeMetric` |
| FR-DASH-07 | S | CanvasJS shall be downloaded only when a chart first renders. | `canvasjs-line-chart.component.ts` |

## FR-EVT — Events

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-EVT-01 | M | Users shall browse events with pagination, search, sorting and filters for event type, user and active state. | `events.component.ts` |
| FR-EVT-02 | M | Admins shall create an event choosing a user, an event type, a date and whether it recurs. | `event-editor.component.ts` |
| FR-EVT-03 | M | The event type list shall come from active event-type seeds; an event whose type was later deactivated keeps its type. | `event-editor.component.ts::patchFromEvent` |
| FR-EVT-04 | M | An event may carry an optional custom wishes link following the same rules as the user link. | `wishes-url.ts` |
| FR-EVT-05 | M | An event may carry greeting media; the client validates type and size before upload and previews it. | `media.ts`, `onImageSelected` |
| FR-EVT-06 | M | Saving with media shall use the multipart "with-image" endpoint; saving without media shall not replace or remove existing media. | `saveEventWithImage`, `updateEventWithImage` |
| FR-EVT-07 | M | The editor shall show the next occurrence and how far away it is; a non-recurring event in the past shall be flagged. | `event.utils.ts::nextOccurrence` |
| FR-EVT-08 | M | Admins shall delete a single event after confirmation, and bulk-delete the selected events on the current page. | `deleteEvent`, `deleteSelected` |
| FR-EVT-09 | S | A stored greeting file shall be previewed as image, video, audio or PDF according to its extension, with a download fallback. | `previewKindFor` |
| FR-EVT-10 | S | Users shall open an event's media in a lightbox. | `openImage` |

## FR-CAL — Calendar

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-CAL-01 | M | The calendar shall offer month, week, day and agenda views. | `calendar.component.ts` |
| FR-CAL-02 | M | The calendar shall show festivals, birthdays, anniversaries and other events, and let the user filter by kind. | `calendar.utils.ts::entriesFor` |
| FR-CAL-03 | M | The calendar shall request data for the months visible in the current view **and** the year being viewed, and cache responses by `year-month`. | `monthYearsToLoad`, `monthCache` |
| FR-CAL-04 | M | Recurring celebrations shall appear on their month/day in any year; a non-recurring anniversary only on its exact date; Feb 29 falls on Feb 28 in non-leap years. | `occursOn` |
| FR-CAL-05 | M | The calendar shall show the next few celebrations within 30 days, soonest first. | `upcomingEntries` |
| FR-CAL-06 | M | The user shall navigate by month/week/day, jump to today, jump by whole years, and swipe on touch devices. | `previous`, `next`, `jumpYear`, `onTouchEnd` |
| FR-CAL-07 | M | The user shall download a day as `.ics`, open "Add to Google Calendar", and copy a day summary. | `downloadIcs`, `googleCalendarUrl`, `copyDaySummary` |
| FR-CAL-08 | M | The chosen view and kind filters shall persist across visits. | `fw_calendar_view`, `fw_calendar_kinds` |
| FR-CAL-09 | S | Month cells shall show at most three entries and indicate how many more exist. | `MAX_CHIPS_PER_CELL` |
| FR-CAL-10 | S | Birthdays and anniversaries shall show a milestone (e.g. "25th anniversary") when the year difference is plausible (≤ 120). | `milestoneFor` |
| FR-CAL-11 | S | The calendar shall be operable by keyboard: Escape closes the day sheet or dialog. | `onEscape` |

## FR-FEST — Festival wishes

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-FEST-01 | M | Clicking a festival in the calendar shall open the festival wish panel for that festival. | `festival-wishes-panel.component.ts` |
| FR-FEST-02 | M | Admins shall see every person linked to the festival and link more people, including several at once. | `saveFestivalWishMappingsBulk` |
| FR-FEST-03 | M | Admins shall edit a mapping's note (≤ 500 characters), wishes link, image and active state, and remove mappings. | `festival-wishes-panel.component.ts` |
| FR-FEST-04 | M | A non-admin user shall see only their own wish for that festival. | `myFestivalWishMappings` |
| FR-FEST-05 | M | The admin festival-wishes page shall list mappings with search, status filter (active/inactive/failed), festival and user filters, and a summary (total, active, inactive, upcoming, failed). | `festival-wish-mappings.component.ts` |
| FR-FEST-06 | M | Festival timing shall be shown relative to the festival's next occurrence, so a festival stored for an earlier year is not permanently "past". | `festivalTimingNext` |
| FR-FEST-07 | S | The page shall show when each wish was last sent and flag failed attempts. | `lastSentLabel`, `statusOf` |

## FR-CIR — Family & Friends circles

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-CIR-01 | M | A user shall see accepted members, incoming requests and outgoing requests. | `CircleService.list` |
| FR-CIR-02 | M | A user shall search the public directory (minimum 2 characters, debounced) and send a request. | `directoryUsers`, `search$` |
| FR-CIR-03 | M | A user shall accept or reject an incoming request, and withdraw an outgoing one; each destructive action requires confirmation. | `accept`, `reject`, `cancelRequest` |
| FR-CIR-04 | M | A user shall remove an accepted member after confirmation. | `remove` |
| FR-CIR-05 | S | Each member shall show presence: "Online now", or "Last seen …". | `lastSeenText` |
| FR-CIR-06 | M | A user shall not be able to send a duplicate request to a member or to someone with a pending request in either direction. | `relationFor` |

## FR-CHAT — Chat

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-CHAT-01 | M | A signed-in user shall open a floating chat widget with a conversation list and an unread count. | `chat-widget.component.ts` |
| FR-CHAT-02 | M | The user shall start a conversation with an active user and send text and/or a single attachment (≤ 50 MB). | `sendMessage`, `MAX_ATTACHMENT_BYTES` |
| FR-CHAT-03 | M | The user shall reply to a message, edit their own message, delete one or many of their messages, and add or remove an emoji reaction. | `startReply`, `saveEdit`, `deleteMessage`, `toggleReaction` |
| FR-CHAT-04 | M | Messages shall be updated in real time (new message, edit, delete, seen, typing, presence) over STOMP. | `ChatService.socketEvents$` |
| FR-CHAT-05 | M | When circle-only chat is enforced, only accepted circle members shall appear in the new-chat picker and conversation list, and a conversation with a non-member shall be read-only. | `circle-chat.ts`, `CircleService.acceptedUserIds` |
| FR-CHAT-06 | M | Inline images shall be previewed; other attachments shall be downloadable. | `previewKindFor`, `openAttachment` |
| FR-CHAT-07 | S | The widget shall provide in-thread search, a starred-messages filter, multi-select delete and an emoji picker. | `toggleThreadSearch`, `toggleStarredFilter`, `toggleSelectMode` |
| FR-CHAT-08 | S | Message content shall be rendered as safe HTML with only the supported formatting. | `formatMessageContent` |
| FR-CHAT-09 | M | The widget shall announce presence with a heartbeat and mark the user offline on unload. | `presence/heartbeat`, `presence/offline` |

## FR-EMAIL — Email status

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-EMAIL-01 | M | Users shall list email records with pagination, search, sorting and filters for status and email type. | `email-status.component.ts` |
| FR-EMAIL-02 | M | Dedicated views shall exist for OTP, forgot-password, festival-wish, unread-chat and circle-request emails. | `app.routes.ts` `data.emailType` |
| FR-EMAIL-03 | M | A record shall preview its body in desktop and mobile widths. | `previewMode` |
| FR-EMAIL-04 | M | An email image shall be fetched on demand, cached for a bounded number of records, and never loaded as part of the list. | `emailImage`, `MAX_CACHED_IMAGES` |
| FR-EMAIL-05 | M | A failed email shall be retryable and a record deletable, after confirmation. | `retry`, `deleteEmail` |
| FR-EMAIL-06 | M | Users shall bulk-delete selected records on the current page. | `deleteEmails` |
| FR-EMAIL-07 | S | Admins shall send a test email from the email-preview screen. | `sendTestEmail` |

## FR-NOTIF — Notifications

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-NOTIF-01 | M | Admins shall create, edit and delete draft notifications with a title, message, optional email flag and optional schedule window. | `notification-editor.component.ts` |
| FR-NOTIF-02 | M | A schedule must start and end in the future with end after start; the editor rejects a past or inverted window before saving. | `scheduleError` |
| FR-NOTIF-03 | M | Admins shall publish and unpublish; a draft whose window has elapsed cannot be published. | `publish`, `publishBlockedReason` |
| FR-NOTIF-04 | M | A published notification shall not be edited or deleted; it must be unpublished first. | `notification-editor.component.ts`, `canDeleteSelected` |
| FR-NOTIF-05 | M | Signed-in users shall see the latest active published notification as a banner and, for live publications, a toast. | `AppComponent.fetchInitialNotification`, `consumeNotification` |
| FR-NOTIF-06 | M | Dismissing a banner shall suppress that notification for the browser session. | `fw_published_notification_dismissed_id` |
| FR-NOTIF-07 | S | If `/notifications/published` is unavailable, the app shall fall back to the newest published item from the notification collection. | `loadPublishedNotificationFromCollection` |
| FR-NOTIF-08 | S | Guests shall not call notification endpoints or open the notification socket. | `AppComponent` effects |

## FR-SCHED — Schedulers (Admin)

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-SCHED-01 | M | Admins shall list scheduled jobs with type, running state, run counts, last status, last duration, last error and next/previous fire times. | `schedulers.component.ts` |
| FR-SCHED-02 | M | Admins shall trigger a job manually and see the backend's confirmation message. | `triggerScheduler` |
| FR-SCHED-03 | S | The list shall show a computed success rate per job. | `successRate` |

## FR-AGENT — AI agents (Admin)

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-AGENT-01 | M | Admins shall see whether the wish composer, delivery-ops agent and copilot are enabled, and whether delivery-ops runs in dry-run mode. | `agentStatus` |
| FR-AGENT-02 | M | Admins shall run the delivery-ops triage agent and see its report; a 409 means a run is already in progress. | `runDeliveryOpsAgent` |
| FR-AGENT-03 | M | Admins shall ask the copilot free-text questions (≤ 500 characters) and see the answer or a clear error. | `CopilotChatComponent` |
| FR-AGENT-04 | S | The copilot shall offer suggested questions and lock the composer when disabled. | `suggestions`, `enabled` input |

## FR-WISHIMG — Wish images (Admin)

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-WISHIMG-01 | M | Admins shall upload a greeting image per event type, optionally scoped to a user, and mark it active. | `createWishImage` |
| FR-WISHIMG-02 | M | Admins shall edit the event type, owner and active state, replace the image, or clear the owner. | `updateWishImage` |
| FR-WISHIMG-03 | M | Admins shall delete one or several images, with confirmation. | `deleteWishImage`, `deleteWishImages` |
| FR-WISHIMG-04 | S | The list shall filter by event type, user and active state and preview the image. | `wish-images.component.ts` |

## FR-SEED — Seeds (Admin)

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-SEED-01 | M | Admins shall list, create, edit and delete relationship seeds; the code is derived from the name (uppercase, spaces → underscores). | `normalizeEnumSeedPayload` |
| FR-SEED-02 | M | Admins shall list, create, edit and delete event-type seeds with the same code derivation. | `event-type-seed-editor.component.ts` |
| FR-SEED-03 | M | Seed requests shall fall back to the legacy path (`/relation-seeds`, `/event-types-seeds`) when the primary path is unavailable. | `requestWithFallback` |

## FR-SEC — Security analytics (Admin)

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-SEC-01 | M | Admins shall view sign-in locations for a date range with KPIs (logins, users, locations, IPs), top locations, per-user summaries and a paginated history. | `login-locations.component.ts` |
| FR-SEC-02 | M | Sign-in rows shall link to a map when coordinates exist, and the data shall be exportable as CSV. | `mapsUrl`, `toCsv` |
| FR-SEC-03 | M | Admins shall view failed sign-in attempts for a date range with a daily chart, suspicious-IP and suspicious-email summaries, and a paginated list. | `violated-users.component.ts` |
| FR-SEC-04 | M | The page shall flag an IP that tried ≥ 5 distinct emails as high suspicion and ≥ 3 as medium. | `violated-users.utils.ts` |
| FR-SEC-05 | M | Both analytics pages shall mask emails until revealed and export CSV with formula-injection protection. | `SensitiveEmailPipe`, `csv.ts` |

## FR-SYS — Cross-cutting behaviour

| ID | Pri | Requirement | Implementation |
| --- | --- | --- | --- |
| FR-SYS-01 | M | Guests shall be redirected to `/login?redirectUrl=…` when opening a protected route, except a one-time-token link which goes to `/direct-login`. | `auth.guard.ts` |
| FR-SYS-02 | M | Admin-only routes shall redirect a non-admin to `/dashboard`. | `admin.guard.ts` |
| FR-SYS-03 | M | Access shall be denied outside India/Andhra Pradesh/Telangana and routed to `/restricted-region`; an allowed user opening `/restricted-region` is sent home. | `location-access.guard.ts` |
| FR-SYS-04 | M | A global loading overlay shall appear for API calls except chat, agent and email-image requests. | `loading.interceptor.ts` |
| FR-SYS-05 | M | Loss of backend connectivity shall show a full-screen offline notice with a retry action, then a brief "back online" state. | `connectivity.service.ts`, `offline-overlay.component.ts` |
| FR-SYS-06 | M | Toasts shall report success, error, warning and info outcomes for user actions. | `ToastService` |
| FR-SYS-07 | M | Destructive actions shall use a shared confirmation dialog with an explicit confirm label and danger tone. | `ConfirmDialogService` |
| FR-SYS-08 | M | All screens shall be responsive from 360 px upwards, with the sidebar collapsing to a slide-down panel on small screens. | `app.component.css`, media queries |
| FR-SYS-09 | M | The user shall be able to hide or reveal sensitive values (emails, codes) globally per session. | `SensitiveDataService`, `sensitive-info-toggle.component.ts` |
| FR-SYS-10 | S | An unauthenticated visitor shall never trigger authenticated-only endpoints. | `AppComponent` guards |
| FR-SYS-11 | C | A wish-preview modal shall appear once per session after sign-in when the backend indicates a wish is available. | `getMyWishPreview` |

---

## Cross-cutting business rules applied by the client

| Rule | Where |
| --- | --- |
| A paginated list keeps only on-screen rows selected (`retainOnly`), so a stale id can never be bulk-deleted. | `BulkSelection` |
| Search that is cleared re-queries immediately; typing alone does not. | `onSearchInput`/`clearSearch` in list pages |
| Bulk delete steps back one page when the whole page was removed. | `events.component.ts`, others |
| Emails and sensitive values are masked by default; the reveal is per session and not persisted. | `SensitiveDataService` |
| CSV cells beginning with `=`, `+`, `-`, `@`, tab or CR are prefixed with `'`. | `csv.ts` |
| Media is validated client-side with the same limits as the backend; an unsupported `image/*` subtype (SVG, TIFF) is never offered. | `media.ts` |
| The AI wish and copilot features fail closed with a readable message when providers are exhausted (503) or disabled. | `copilot-chat.component.ts` |
