# Data Flow

## 1. Purpose

Explains how data moves between the browser, the backend and the database, and where the client
transforms it. The front end never talks to the database directly; every arrow that leaves the
browser is HTTP or WebSocket.

## 2. Layers of data movement

```
┌──────────────┐   form input    ┌────────────────┐   typed call    ┌─────────────┐
│   Template   │ ──────────────▶ │   Component    │ ──────────────▶ │ ApiService  │
│  (HTML)      │ ◀────────────── │  (signals/     │ ◀────────────── │ (RxJS)      │
└──────────────┘   rendered      │   fields)      │   normalised    └──────┬──────┘
                   state         └────────────────┘   observable           │
                                                                          │ HTTP
                                                        ┌─────────────────▼─────────┐
                                                        │ Interceptors              │
                                                        │ loading → auth (bearer)   │
                                                        └─────────────────┬─────────┘
                                                                          │ HTTPS/JSON
                                                        ┌─────────────────▼─────────┐
                                                        │ Backend REST controllers  │
                                                        └─────────────────┬─────────┘
                                                                          │ JPA
                                                        ┌─────────────────▼─────────┐
                                                        │ Database                  │
                                                        └───────────────────────────┘
```

## 3. Read path (example: events list)

1. `EventsComponent.loadEvents()` builds `page`, `size`, `searchKey`, `sortBy`, `sortDir` and
   optional repeated `eventTypes`, `userIds`, `active` parameters.
2. `ApiService.events()` issues `GET {apiUrl}/events?…`.
3. `loadingInterceptor` increments the loading counter (unless the URL is chat/agent/image).
4. `authInterceptor` attaches `Authorization: Bearer <accessToken>`.
5. The backend returns either an array, a paged object, or `{ data: … }`.
6. `ApiService.unwrap()` extracts the payload; `normalizePaged()` guarantees
   `content/page/size/totalElements/totalPages/hasNext/hasPrevious`.
7. The component stores `events`, `totalElements`, `totalPages`; `BulkSelection.retainOnly()`
   prunes stale ids.
8. Angular renders the table; `loadingInterceptor`'s `finalize` decrements the counter.

## 4. Write path (example: event with media)

1. The admin selects a file; `mediaError()` validates type and size locally. A rejected file
   clears the input and shows a reason.
2. `EventEditorComponent.save()` marks the form touched if invalid and stops.
3. A `SaveEventPayload` is built; `wishesUrl` is trimmed (an empty string means "remove link").
4. With a file, `ApiService.saveEventWithImage()` builds `FormData` (`eventType`, `eventDate`,
   `recurring`, `userId`, `wishesUrl`, `image`).
5. Without a file, the JSON endpoint is used so existing media is untouched.
6. The backend persists and returns the saved event (with `imageUrl` when media exists).
7. The component shows a toast and navigates to `/events`; the list reloads from the backend.

## 5. Session and token data flow

```
Sign-in response
  { accessToken, refreshToken, expiresIn, role }
        │
        ▼
  storage = rememberMe ? localStorage : sessionStorage
        │
        ├── every request: interceptor reads accessToken
        ├── timer at expiresIn-30s: POST /auth/refresh → replace tokens
        └── timer at expiresIn: logout → clear tokens → /login

401 response
  ├── CONCURRENT_LOGIN marker → clear tokens, set notice, stop
  └── otherwise → refresh once → retry → on failure logout

403 response → logout immediately
```

## 6. Real-time data flow

```
Chat:
  WebSocket connect → STOMP CONNECT → SUBSCRIBE /user/queue/messages, /topic/…
  MESSAGE frame → ChatService parses JSON → socketEvents$ Subject
        → ChatWidgetComponent merges into the thread (new/edit/delete/seen/typing/presence)

Notifications:
  WebSocket connect → SUBSCRIBE /topic/notifications
  MESSAGE {type: NOTIFICATION_PUBLISHED, notification} → published$ → AppComponent banner + toast
  MESSAGE {type: NOTIFICATION_UNPUBLISHED} → published$(null) → banner cleared
```

Both services use the same socket URL derived from `environment.apiUrl`:
`https://host/api` → `wss://host/ws-chat/websocket`.

## 7. Data transformation points in the client

| Transformation | Location | Purpose |
| --- | --- | --- |
| `unwrap` | `ApiService` | Accept `T`, `{data: T}` or `{content: T}` |
| `normalizePaged` | `ApiService` | Guarantee paging fields for arrays or partial pages |
| `normalizeCollection` | `ApiService` | Extract a list from either shape |
| `normalizeUserPayload` | `ApiService` | Send both `dob`/`dateOfBirth` and `relationShip`/`relationship` aliases |
| `normalizeEnumSeedPayload` | `ApiService` | Derive `code` from the display name |
| `normalizeWishPreview` | `ApiService` | Default missing fields, tolerate byte arrays |
| `eventFormData` / `wishImageFormData` | `ApiService` | Build multipart bodies |
| `toLineChartData` | `DashboardComponent` | Sort points, coerce values, format labels |
| `buildDays` / `entriesFor` | `calendar.utils.ts` | Turn calendar responses into day cells |
| `nextOccurrence` | `event.utils.ts` | Compute the next send date |
| `festivalOccurrence` / `festivalTimingNext` | `festival-mappings.utils.ts` | Roll festivals forward |
| `filterPoints` / `computeKpis` | `login-locations.utils.ts` | Client-side summaries for analytics |
| `toChartBars` / `suspicionOf` | `violated-users.utils.ts` | Chart scaling and risk scoring |
| `toCsv` | `csv.ts` | Safe CSV serialisation |
| `maskEmail` | `SensitiveDataService` | Display-time redaction |

## 8. What stays in the browser

| Data | Store | Lifetime |
| --- | --- | --- |
| Access/refresh token, role | `localStorage` or `sessionStorage` | Until expiry, logout or notice |
| Theme code | `localStorage` (`fw_theme`) | Persistent |
| Impersonated user | `sessionStorage` (`fw_impersonation`) | Tab session |
| Wish-preview seen token | `sessionStorage` | Tab session |
| Dismissed notification id | `sessionStorage` | Tab session |
| Calendar view/kinds | `localStorage` | Persistent |
| Google client id (base64) | `localStorage` (`fw_sso_token`) | Persistent |
| In-memory caches | Component fields / `Map` | Component lifetime |

Nothing else is persisted client-side; every list is re-fetched on navigation.

## 9. Data the client never stores

- Passwords (only sent over HTTPS in the request body).
- One-time codes (held in the form until submitted).
- Chat attachments (streamed to the backend; previews use object URLs and are revoked).
- Email images (fetched as blobs and cached as object URLs for a bounded number of records).
- Personal data beyond the current screen.

## 10. Failure and consistency considerations

| Situation | Behaviour |
| --- | --- |
| A write succeeds but the follow-up list load fails | Toast explains; the previous list remains, so the user may see stale data until refresh |
| Two admins edit the same record | Last write wins (backend); the client does not implement optimistic locking |
| A bulk delete partially fails | The backend response determines the outcome; the client shows the error message and reloads |
| The socket drops | Chat and notifications stop updating until reconnect; REST calls still work |
| The token expires mid-form | The 401 refresh-and-retry usually preserves the request; a failed refresh signs the user out |

## 11. Related documents

- [`sequence-diagrams.md`](sequence-diagrams.md) — ordered interactions
- [`frontend-api-integration.md`](frontend-api-integration.md) — endpoint catalogue
- [`state-management.md`](state-management.md) — where state lives
