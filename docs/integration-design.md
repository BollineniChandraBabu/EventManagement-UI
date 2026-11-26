# Integration Design

## 1. Scope

Every system the Angular client integrates with, the contract used, how failures are handled, and
what the client assumes. The backend is treated as one integration surface, broken down by area.

## 2. Integration inventory

| # | System | Protocol | Auth | Direction | Criticality |
| --- | --- | --- | --- | --- | --- |
| 1 | Backend REST API | HTTPS/JSON | Bearer JWT | Outbound | Critical |
| 2 | Backend WebSocket (STOMP) | `wss` | Session/subscription | Outbound | Important |
| 3 | Google Identity Services | HTTPS/JS | Public client id | Outbound | Optional |
| 4 | `ipapi.co` | HTTPS/JSON | None | Outbound | Important (location gate) |
| 5 | Object storage (presigned) | HTTPS | Presigned URL | Outbound | Optional (profile picture) |
| 6 | CanvasJS | Script injection | None | Outbound | Optional (charts) |
| 7 | MDB UI Kit | CDN CSS/JS | None | Outbound | Cosmetic |
| 8 | Font Awesome | CDN CSS | None | Outbound | Cosmetic |
| 9 | Google Fonts | CDN CSS | None | Outbound | Cosmetic |
| 10 | Google Maps | Link (new tab) | None | Outbound | Optional |

## 3. Backend REST integration

### 3.1 Common conventions

| Aspect | Convention |
| --- | --- |
| Base URL | `environment.apiUrl`, e.g. `https://host/api` |
| Auth header | `Authorization: Bearer <accessToken>` on all calls except `ipinfo.io` |
| Pagination | `page` (0-based), `size`, `searchKey`, `sortBy`, `sortDir` |
| Repeated filters | Repeated query keys, e.g. `statuses=A&statuses=B` |
| Batch delete | Repeated `ids` query parameter |
| Media upload | `multipart/form-data` |
| Response envelope | `T`, `{data: T}` or `{content: T}` — normalised by `unwrap` |
| Error body | `{ message: string }` (also `answer`, `report` for agents) |
| Timestamps | ISO-8601 strings; dates often `yyyy-MM-dd` |

### 3.2 Endpoint groups

| Group | Representative endpoints | Notes |
| --- | --- | --- |
| Auth | `/auth/login`, `/auth/sso/google`, `/auth/sso/token`, `/auth/otp/send`, `/auth/otp/verify-login`, `/auth/direct-login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/password-reset/confirm`, `/auth/change-password`, `/auth/admin/login-as-user`, `/auth/admin/switch-back` | `MFA_OTP_REQUIRED` and `CONCURRENT_LOGIN` are message markers |
| Users | `/users`, `/users/directory`, `/users/filter-values`, `/users/{id}`, `/users/{id}/status`, `/users/me`, `/users/me/wish-settings`, `/users/me/mfa`, `/users/me/concurrent-login`, `/users/{id}/concurrent-login`, `/users/me/wish-preview`, `/users/me/profile-picture` | Directory is available to all signed-in users |
| Events | `/events`, `/events/{id}`, `/events/with-image`, `/events/{id}/with-image`, `/events/filter-values` | Multipart only when media is supplied |
| Calendar | `/calendar?month&year`, `/festivals?month`, `/seed/special-events` | Festivals are year-scoped |
| Festival wishes | `/festival-wish-mappings`, `/festival-wish-mappings/me`, `/festival-wish-mappings/summary`, `/festival-wish-mappings/bulk`, `/festival-wish-mappings/with-image`, `/festival-wish-mappings/filter-values` | Bulk upserts |
| Circles | `/circles`, `/circles/requests`, `/circles/requests/accept`, `/circles/requests/reject`, `/circles/status/{userId}` | `DELETE /circles` with `{circleId}` body |
| Chat | `/chat`, `/chat/users`, `/chat/conversations`, `/chat/messages/{otherUserId}`, `/chat/messages/{id}`, `/chat/messages/last/{otherUserId}`, `/chat/messages/{id}/reactions`, `/chat/messages/{id}/attachment`, `/chat/presence/heartbeat`, `/chat/presence/offline`, `/dashboard/chat/users/active` | Multipart send with JSON `payload` part |
| Email | `/emails/status`, `/emails/status/admin/otp`, `/emails/status/admin/forgot-password`, `/emails/status/festival-wishes`, `/emails/status/unread-chat-messages`, `/emails/status/{id}/image`, `/emails/status/{id}/retry`, `/emails/test`, `/email/filter-values` | Type-specific paths with a generic fallback |
| Notifications | `/notifications`, `/notifications/{id}`, `/notifications/{id}/publish`, `/notifications/{id}/unpublish`, `/notifications/published`, `/notifications/filter-values` | Published records are immutable |
| Schedulers | `/schedulers`, `/schedulers/{name}/trigger` | Name is URL-encoded |
| Agents | `/agent/status`, `/agent/admin/ask`, `/agent/delivery-ops/run` | 409 when a run is in progress |
| Themes | `/themes`, `/themes/me` | `PUT` with `{theme}` |
| Seeds | `/seed/relationships`, `/seed/event-types`, `/relation-seeds`, `/event-types-seeds` | Fallback pairs |
| Wish images | `/admin/wish-images`, `/admin/wish-images/{id}`, `/admin/wish-images/filter-values` | Multipart create/update |
| Dashboard | `/dashboard/mail`, `/dashboard/insta`, `/dashboard/chart/mail`, `/dashboard/chart/insta`, `/dashboard/mail/otp`, `/dashboard/mail/forgot-password`, `/dashboard/chart/mail/otp`, `/dashboard/chart/mail/forgot-password`, `/dashboard/chart/login-locations`, `/dashboard/violated-users` | Date range parameters |

### 3.3 Retry and fallback policy

| Situation | Behaviour |
| --- | --- |
| 401 ordinary | One refresh, one retry |
| 401 concurrent login | No retry; show notice |
| Seed path 404/error | Retry the legacy path once, then surface the original error |
| Email-type path error | Retry the generic `/emails/status` with `emailTypes` filter |
| `/notifications/published` error | Fall back to the newest published item from `/notifications` |
| Status 0 to the API origin | Probe connectivity, show the offline overlay if confirmed |
| Other errors | Surface the backend message or a fallback |

There is **no exponential backoff** for REST calls; retries are limited to the cases above.

## 4. WebSocket integration

| Aspect | Value |
| --- | --- |
| URL | `environment.apiUrl` with `http`→`ws`, `/api` stripped, plus `/ws-chat/websocket` |
| Protocol | STOMP 1.2 frames over a raw WebSocket |
| Heartbeat | `heart-beat:10000,10000` |
| Chat topics | Chat user queue and conversation topics, subscribed on demand |
| Notification topic | `/topic/notifications` |
| Chat event types | message, `SEEN`/`TYPING`, `MESSAGE_DELETED`, `MESSAGE_EDITED`, `PRESENCE` |
| Notification event types | `NOTIFICATION_PUBLISHED`, `NOTIFICATION_UNPUBLISHED` |

Frame parsing: split on the first `\n\n`; the body is trimmed of `\0`. Parse failures are ignored.

Reconnect: `ChatService` retries on a timer and resubscribes to known topics.
`NotificationRealtimeService` reconnects on the next `connect()` (typically the next sign-in
transition); it does not retry on its own.

## 5. Google Identity Services

| Aspect | Value |
| --- | --- |
| Client id source | `GET /auth/sso/token` → `{clientId}` |
| Caching | Base64 in `localStorage` under `fw_sso_token` |
| Script | `https://accounts.google.com/gsi/client`, loaded on demand once |
| Rendering | `google.accounts.id.renderButton` into `#google-signin-button` |
| Callback | `credential` (ID token) → `POST /auth/sso/google` |
| Failure | Warning toast; password and OTP remain |

## 6. IP geolocation (`ipapi.co`)

| Aspect | Value |
| --- | --- |
| Endpoint | `https://ipapi.co/json` |
| Fields used | `latitude`, `longitude`, `city`, `region`, `country`, `ip` |
| Order | Browser GPS first; IP fills in country/region when GPS lacks them |
| Failure | Returns `null`; the location guard then denies access |
| Privacy | The IP is sent to a third party; disclose in the privacy notice |

## 7. Object storage

Profile-picture upload offers a presigned-URL flow (`POST /users/me/profile-picture/presigned-url`
returning `uploadUrl`, `publicUrl`, `objectKey`, `method`, `expiresInSeconds`) and a direct
multipart flow (`POST /users/me/profile-picture`). The account page uses the direct flow; the
presigned flow is available for larger files or direct-to-storage uploads.

## 8. Third-party front-end assets

| Asset | Loading strategy | Failure impact |
| --- | --- | --- |
| MDB UI Kit CSS | `<link rel="stylesheet">` in `index.html` | Styling degrades |
| MDB JS | `<script defer>` | Some UI behaviours unavailable |
| Font Awesome | `rel="preload"` + `onload` swap, `<noscript>` fallback | Icons missing |
| Google Fonts (Plus Jakarta Sans) | `<link>` with preconnect | Fallback system font |
| CanvasJS | Injected by the chart component on first render | Charts blank |

## 9. Contract risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Backend renames a field | A screen silently shows blanks | Keep models aligned; add contract tests |
| Backend changes pagination shape | Paging breaks | `normalizePaged` tolerates several shapes |
| A legacy path is removed | Seed screens fail | Fallback then clear error |
| A new required field is added | Writes fail with 400 | Show the backend message; update the form |
| Notification topic renamed | No live banner | Fallback to polling on load |
| CORS origin not updated | All calls fail with status 0 | Coordinate origin changes with the backend team |

## 10. Integration testing

There are no automated contract tests today. Recommended:

1. Record real responses as fixtures and unit-test `ApiService` normalisation against them.
2. Add a smoke test per environment that exercises login, dashboard, events and calendar.
3. Validate the WebSocket handshake and one message per topic in a staging environment.

See [`integration-testing.md`](integration-testing.md) and [`api-testing.md`](api-testing.md).
