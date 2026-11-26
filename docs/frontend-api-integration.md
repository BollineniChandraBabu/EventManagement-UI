# Frontend API Integration

## 1. How the client talks to the backend

```
Component
   │  typed method call
   ▼
ApiService / AuthService / ChatService / CircleService
   │  HttpClient + HttpParams / FormData
   ▼
loadingInterceptor  →  authInterceptor  →  HTTPS
   │
   ▼
Backend /api/**
   │
   ▼
unwrap / normalizePaged / normalizeCollection
   │
   ▼
Component state  →  template
```

| Concern | Implementation |
| --- | --- |
| Base URL | `environment.apiUrl` |
| Auth | `Authorization: Bearer <accessToken>` (except `ipinfo.io`) |
| Pagination | `page`, `size`, `searchKey`, `sortBy`, `sortDir` |
| Repeated filters | Repeated query keys (`statuses`, `emailTypes`, `userIds`, `eventTypes`, `codes`, `months`, `ids`) |
| Uploads | `multipart/form-data` |
| Errors | `HttpErrorResponse` handled per call, message via `apiErrorMessage` |
| Normalisation | `unwrap`, `normalizePaged`, `normalizeCollection` |

## 2. Request construction helpers

```ts
// pagedParams
new HttpParams()
  .set('page', page)
  .set('size', size)
  .set('searchKey', searchKey ?? '')
  .set('sortBy', sortBy)
  .set('sortDir', sortDir);

// idsParams (batch delete)
params = params.append('ids', id);   // repeated

// eventFormData
formData.append('eventType', payload.eventType ?? '');
formData.append('eventDate', payload.eventDate);
formData.append('recurring', String(payload.recurring));
formData.append('userId', String(payload.userId));
formData.append('wishesUrl', payload.wishesUrl ?? '');
formData.append('image', file);       // only when a new file exists

// chat send (JSON part + file part)
form.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
form.append('attachment', file, file.name);
```

## 3. Response normalisation

| Helper | Accepts | Returns |
| --- | --- | --- |
| `unwrap<T>` | `T`, `{data: T}`, `{content: T}` | `T` |
| `normalizePaged<T>` | `PagedResponse<T>` or `T[]` | complete `PagedResponse<T>` |
| `normalizeCollection<T>` | `T[]` or `{content: T[]}` | `T[]` |
| `normalizeUserPayload` | `SaveUserPayload` | payload with `dob`/`dateOfBirth` and `relationShip`/`relationship` |
| `normalizeEnumSeedPayload` | `{name}` | `{code, displayName, active:true}` |
| `normalizeWishPreview` | partial or null | `WishPreviewResponse` with defaults |

`unwrap` is deliberately conservative: it only treats `content` as a wrapper when the object has no
paging fields, so a paged response is not unwrapped by mistake.

## 4. Endpoint catalogue used by the UI

| Screen | Method and endpoint |
| --- | --- |
| Login | `POST /auth/login`, `GET /auth/sso/token`, `POST /auth/sso/google` |
| OTP | `POST /auth/otp/send`, `POST /auth/otp/verify-login` |
| Forgot/reset | `POST /auth/forgot-password`, `POST /auth/password-reset/confirm` |
| Change password | `POST /auth/change-password` |
| Direct login | `POST /auth/direct-login` |
| Refresh | `POST /auth/refresh` |
| Profile | `GET /users/me` |
| Wish settings | `PATCH /users/me/wish-settings` |
| MFA | `PATCH /users/me/mfa` |
| Concurrent login | `PATCH /users/me/concurrent-login`, `PATCH /users/{id}/concurrent-login` |
| Profile picture | `POST /users/me/profile-picture/presigned-url`, `POST /users/me/profile-picture`, `DELETE /users/me/profile-picture` |
| Wish preview | `GET /users/me/wish-preview` |
| Themes | `GET /themes`, `GET /themes/me`, `PUT /themes/me` |
| Dashboard | `GET /dashboard/mail`, `/dashboard/insta`, `/dashboard/mail/otp`, `/dashboard/mail/forgot-password`, `/dashboard/chart/*` |
| Users | `GET /users`, `GET /users/directory`, `GET /users/filter-values`, `GET /users/{id}`, `POST /users`, `PUT /users`, `PATCH /users/{id}/status`, `DELETE /users?ids=…` |
| Impersonation | `POST /auth/admin/login-as-user`, `GET /auth/admin/switch-back` |
| Events | `GET /events`, `GET /events/filter-values`, `GET /events/{id}`, `POST /events`, `POST /events/with-image`, `PUT /events/{id}`, `PUT /events/{id}/with-image`, `DELETE /events/{id}`, `DELETE /events?ids=…` |
| Calendar | `GET /calendar?month&year` |
| Festivals | `GET /festivals?month`, `GET /seed/special-events` |
| Festival wishes | `GET /festival-wish-mappings`, `/me`, `/summary`, `/filter-values`; `POST /festival-wish-mappings`, `/bulk`, `/with-image`; `DELETE /festival-wish-mappings/{id}`, `?ids=…` |
| Circles | `GET /circles`, `POST /circles/requests`, `/requests/accept`, `/requests/reject`, `GET /circles/status/{userId}`, `DELETE /circles` |
| Chat | `GET /chat/users`, `/dashboard/chat/users/active`, `/chat/conversations`, `/chat/messages/{userId}`, `/chat/messages/{id}/attachment`; `POST /chat`, `/chat/presence/heartbeat`, `/chat/presence/offline`; `PATCH /chat/messages/{id}`; `DELETE /chat/messages/{id}`, `/last/{userId}`, `?ids=…`; `GET/POST/DELETE /chat/messages/{id}/reactions` |
| Email | `GET /emails/status`, `/emails/status/admin/otp`, `/emails/status/admin/forgot-password`, `/emails/status/festival-wishes`, `/emails/status/unread-chat-messages`, `/emails/status/{id}/image`, `/email/filter-values`; `POST /emails/status/{id}/retry`, `/emails/test`; `DELETE /emails/status/{id}`, `?ids=…` |
| Notifications | `GET /notifications`, `/notifications/{id}`, `/notifications/published`, `/notifications/filter-values`; `POST /notifications`, `/{id}/publish`, `/{id}/unpublish`; `PUT /notifications/{id}`; `DELETE /notifications/{id}`, `?ids=…` |
| Schedulers | `GET /schedulers`, `POST /schedulers/{name}/trigger` |
| Agents | `GET /agent/status`, `POST /agent/admin/ask`, `POST /agent/delivery-ops/run` |
| Wish images | `GET /admin/wish-images`, `/admin/wish-images/filter-values`; `POST /admin/wish-images`; `PUT /admin/wish-images/{id}`; `DELETE /admin/wish-images/{id}`, `?ids=…` |
| Seeds | `GET/POST /seed/relationships`, `/seed/event-types`; `GET/PUT/DELETE` with `{id}`/`{code}`; fallback `/relation-seeds`, `/event-types-seeds` |
| Security analytics | `GET /dashboard/chart/login-locations`, `GET /dashboard/violated-users` |

## 5. Error mapping

| Status | Message source | Typical user text |
| --- | --- | --- |
| 0 | Connectivity probe | Offline overlay, or a generic failure toast if online |
| 400 | `error.error.message` | The backend's validation text |
| 401 | Refresh or notice | Silent, or the concurrent-login notice |
| 403 | Logout | Redirect to login |
| 404 | Backend or fallback | "Unable to load … right now." |
| 409 | `error.error.report` / `message` | "A triage run is already in progress." |
| 429 | Shared text | "Too many attempts. Please wait a minute and try again." |
| 503 | `answer` / `message` | Copilot/provider explanation |

## 6. Retry and fallback rules

| Case | Rule |
| --- | --- |
| 401 | Refresh once, retry once |
| Concurrent-login 401 | Never retry |
| Seed endpoints | Try primary, then legacy, then report the primary error |
| Email type endpoints | Try typed path, then generic with `emailTypes` |
| Published notification | Try `/notifications/published`, then the collection |
| Profile picture presigned URL | Available but not used by the account page (direct multipart is used) |

## 7. WebSocket integration

| Aspect | Value |
| --- | --- |
| URL | `environment.apiUrl.replace(/^http/,'ws').replace(/\/api$/,'') + '/ws-chat/websocket'` |
| Handshake | STOMP `CONNECT` with `accept-version:1.2`, `heart-beat:10000,10000` |
| Notification topic | `/topic/notifications` |
| Chat | Conversation and user queues subscribed by `ChatService` |
| Parsing | Split on `\n\n`; strip `\0`; `JSON.parse` guarded |
| Reconnect | Chat: timed retry and resubscribe; notifications: next `connect()` |

## 8. Performance considerations

- All list endpoints are paged; the client never requests unbounded collections except pickers
  (capped at 1000 users/seeds) and festival lists (capped at 200/500).
- Search is explicit or debounced, not per keystroke.
- Email images are fetched per record, not with the list.
- Chart libraries load only on chart pages.
- Repeated filter parameters avoid a comma-separated format that the backend would have to split.

## 9. Testing the integration

| Test | Approach |
| --- | --- |
| Normalisation | Unit-test `ApiService` with `HttpTestingController` fixtures for each shape |
| Auth header | Unit-test `authInterceptor` |
| Retry | Unit-test the 401 refresh-and-retry path |
| WebSocket parsing | Unit-test the frame parser with sample frames |
| End-to-end | Manual smoke per environment until E2E exists |

Existing specs: `api.service.spec.ts`, `auth.interceptor.spec.ts`, `auth.service.spec.ts`,
`circle.service.spec.ts`.

## 10. Known gaps

| Gap | Impact |
| --- | --- |
| No HTTP timeout | A hung request keeps the overlay up |
| No request cancellation for list loads | A stale response can overwrite a newer one |
| No contract tests | Backend changes are discovered at runtime |
| `ApiService` is a single large class | Harder to navigate and test |
| No offline queue | Writes fail when offline |
