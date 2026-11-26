# Integration Testing

## 1. Scope

Integration testing verifies that the Angular client works correctly with the backend, the
database through the backend, and external services. Because the client is a browser SPA, most
integration risk sits in the HTTP contract, the WebSocket protocol and the auth handshake.

## 2. Integration boundaries

| Boundary | Direction | What can break |
| --- | --- | --- |
| REST endpoints | Client → backend | URLs, parameters, payload shape, response envelope, status codes |
| Multipart uploads | Client → backend | Field names, part ordering, content type, size limits |
| STOMP WebSocket | Client ↔ backend | Handshake headers, topics, frame parsing, reconnect |
| Auth refresh | Client → backend | Token rotation, concurrent-login marker |
| Google Identity | Client → Google | Script load, button render, credential callback |
| `ipapi.co` | Client → third party | Availability, response shape, blocked requests |
| Object storage | Client → backend → storage | Presigned URL flow, content type |
| CDN assets | Client → CDN | Availability, CSP compatibility |

## 3. What is tested today

| Test | Type | Where |
| --- | --- | --- |
| API call construction and normalisation | Unit with mocked HTTP | `api.service.spec.ts` |
| Auth refresh and retry | Unit with mocked HTTP | `auth.interceptor.spec.ts` |
| Concurrent-login handling | Unit with mocked HTTP | `auth.interceptor.spec.ts` |
| Circle endpoints | Unit with mocked HTTP | `circle.service.spec.ts` |
| Direct-login exchange | Component with mocked service | `direct-login.component.spec.ts` |
| Manual integration | Exploratory | Per sprint against the dev backend |

There is **no automated integration suite** against a real backend.

## 4. Manual integration checklist

Run against the dev backend after any contract-affecting change.

### 4.1 Authentication

- [ ] Password sign-in returns tokens and the correct role.
- [ ] Refresh rotates both tokens; the old refresh token no longer works.
- [ ] MFA challenge returns `MFA_OTP_REQUIRED` and the OTP flow completes.
- [ ] A `CONCURRENT_LOGIN` rejection is detected and shown.
- [ ] Google SSO returns a client id and accepts an ID token.
- [ ] Direct-login token exchange works once and rejects reuse.

### 4.2 Data operations

- [ ] Every list endpoint accepts `page`, `size`, `searchKey`, `sortBy`, `sortDir`.
- [ ] Repeated filter parameters are read correctly (`statuses`, `userIds`, `eventTypes`).
- [ ] Batch delete accepts repeated `ids`.
- [ ] Event create with media stores the file and returns `imageUrl`.
- [ ] Event update without media leaves the existing file in place.
- [ ] Wish images upload, replace and clear the owner.
- [ ] Profile picture upload and removal work.

### 4.3 Calendar and festivals

- [ ] `/calendar?month&year` returns that year's festivals.
- [ ] A festival from an earlier year appears on its month/day in later years.
- [ ] `/seed/special-events` returns festivals for all months.
- [ ] Bulk festival mapping reports created/updated counts.

### 4.4 Chat and notifications

- [ ] STOMP handshake succeeds with `accept-version:1.2`.
- [ ] A sent message arrives on the recipient's socket.
- [ ] Edit, delete, reaction, seen and typing events arrive and parse.
- [ ] `NOTIFICATION_PUBLISHED` reaches `/topic/notifications` and shows a banner.
- [ ] `NOTIFICATION_UNPUBLISHED` clears the banner.
- [ ] A dropped socket reconnects and resubscribes.

### 4.5 Fallbacks

- [ ] `/seed/relationships` is used; if it fails, `/relation-seeds` works.
- [ ] `/seed/event-types` is used; if it fails, `/event-types-seeds` works.
- [ ] `/emails/status/admin/otp` is used; if it fails, the generic endpoint filters by type.
- [ ] `/notifications/published` failing falls back to the collection.

## 5. Contract tests (recommended)

Add a thin contract suite that:

1. Calls each endpoint with a minimal valid request against a test backend.
2. Asserts the response can be parsed by the corresponding TypeScript model.
3. Fails when a required field disappears or changes type.

A pragmatic implementation is a Node script using `fetch`, run in CI against a seeded test
environment, asserting a JSON schema per endpoint.

## 6. Database-facing behaviour (via the API)

The client cannot test the database directly, but it can assert observable consequences:

| Behaviour | Observable through the UI |
| --- | --- |
| Uniqueness of email | Duplicate email rejected with a message |
| Referential integrity | Deleting a seed in use is refused |
| Cascades | Deleting an event removes its stored media |
| Pagination totals | `totalElements` matches the filtered count |
| Ordering | Sort direction changes the first row |
| Transactions | A bulk operation either applies fully or reports failure |

## 7. External service testing

| Service | Test |
| --- | --- |
| Google Identity | Load the login page with a configured client id; confirm the button renders and a test account can sign in |
| `ipapi.co` | Confirm the response shape; confirm the guard handles a failure |
| Object storage | Upload a picture and confirm the returned public URL loads |
| Mail | Trigger a test email and confirm it appears in the email log |
| AI providers | Confirm the copilot returns an answer or a clear 503 |

## 8. Environment notes

- The backend CORS allow-list excludes `localhost:12000`; use an allowed origin (e.g.
  `localhost:4200`) or ask the backend team to add the port.
- The dev backend may be a cold Render instance; allow time for the first request.
- Use the test accounts from [`test-data.md`](test-data.md).

## 9. Exit criteria

- All checklist items pass on the dev backend.
- No new console errors during the run.
- Any contract difference is either fixed or documented as a known issue.
