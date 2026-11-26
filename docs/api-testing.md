# API Testing

## 1. Purpose

Validates the REST and WebSocket contract the client depends on. This document defines what to
test, how to test it without a UI, and how to keep the client and backend in agreement.

## 2. Tooling

| Tool | Use |
| --- | --- |
| `curl` / HTTPie | Quick checks |
| Postman / Bruno collection | Reusable requests with environments |
| `HttpTestingController` | Client-side contract tests in Jasmine |
| JSON Schema | Response shape validation |
| Browser DevTools | Inspect real requests and responses |

## 3. Authentication for API tests

```bash
# 1. Sign in
curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"asha.test@example.com","password":"<test>","rememberMe":true,"forceMfa":false}'

# 2. Use the access token
curl -s "$API/users/me" -H "Authorization: Bearer $TOKEN"
```

Note: the client sends `forceMfa: true`; API tests may set it to `false` for accounts without MFA
to avoid the OTP step, but the MFA path must be tested separately.

## 4. Test matrix

### 4.1 Authentication

| Case | Request | Expected |
| --- | --- | --- |
| Valid credentials | `POST /auth/login` | 200 with `accessToken`, `refreshToken`, `expiresIn`, `role` |
| Invalid password | `POST /auth/login` | 401 with `message` |
| MFA required | `POST /auth/login` (MFA account) | 401 with `MFA_OTP_REQUIRED` |
| Refresh | `POST /auth/refresh` | 200 with a new pair; the old refresh token is rejected |
| Concurrent login | `POST /auth/login` twice with single-session on; use the old token | 401 with a `CONCURRENT_LOGIN` prefix |
| Direct login | `POST /auth/direct-login` | 200 once; reuse rejected |
| Reset | `POST /auth/forgot-password`, then confirm | 200; expired token rejected |
| Rate limit | Repeated `POST /auth/login` | 429 |

### 4.2 Authorisation

| Case | Expected |
| --- | --- |
| No token on a protected endpoint | 401 |
| User token on an admin endpoint | 403 |
| Deactivated user token | 401/403 with a clear message |
| Admin token on an admin endpoint | 200 |
| User reading another user's private data | 403 |

### 4.3 List and pagination

For `/events`, `/users`, `/notifications`, `/emails/status`, `/admin/wish-images`,
`/festival-wish-mappings`, `/schedulers`:

| Case | Expected |
| --- | --- |
| Default call | `content`, `page`, `size`, `totalElements`, `totalPages` |
| `page=0&size=5` | At most five items |
| `sortBy=id&sortDir=asc` | Ascending order |
| `searchKey=<term>` | Filtered results |
| Repeated filters | Only matching rows |
| Page beyond the end | Empty `content`, valid totals |
| Unknown `sortBy` | Either default sort or 400 (must be consistent) |

### 4.4 Writes

| Case | Expected |
| --- | --- |
| Create with required fields | 200/201 with the created record |
| Missing required field | 400 with a message |
| Invalid email | 400 |
| Wishes URL with `ftp://` | 400 |
| Wishes URL with credentials | 400 |
| Update non-existent id | 404 |
| Delete non-existent id | 404 or 204 (must be consistent) |
| Batch delete with mixed ids | Defined behaviour (all-or-nothing or per-id) |

### 4.5 Uploads

| Case | Expected |
| --- | --- |
| Image within limit | 200 with a URL |
| Image over 5 MB | 400 |
| Unsupported type (SVG) | 400 |
| Video 50 MB | 200 |
| Video over 50 MB | 400 |
| PDF 20 MB | 200 |
| Missing file part | 400 |
| Renamed executable | 400 (byte sniffing) |

### 4.6 Calendar and festivals

| Case | Expected |
| --- | --- |
| `/calendar?month=3&year=2026` | Entries for that month/year; festivals `recurring=false` |
| `/calendar` without year | Defined default |
| `/festivals?month=3` | Festivals for that month |
| `/seed/special-events?months=1..12` | All festivals |
| Bulk mapping | `created` + `updated` counts |

### 4.7 Chat

| Case | Expected |
| --- | --- |
| `POST /chat` multipart with a JSON `payload` part | Created message |
| Attachment over 50 MB | 400 |
| `GET /chat/messages/{userId}?page&size&markSeen` | Paged messages; `markSeen` clears unread |
| Edit own message | 200; editing another user's message | 403 |
| Delete own message | 200; deleting another user's message | 403 |
| Reactions add/remove | Updated reaction list |

### 4.8 Notifications

| Case | Expected |
| --- | --- |
| Create with a past schedule | 400 |
| Create with end before start | 400 |
| Publish a draft | 200; `published=true`, `publishedAt` set |
| Edit a published notification | 400/409 |
| Delete a published notification | 400/409 |
| Unpublish | 200; editable again |
| `/notifications/published` | The active notification or 204/null |

### 4.9 WebSocket

| Case | Expected |
| --- | --- |
| `CONNECT` with `accept-version:1.2` | `CONNECTED` frame |
| `SUBSCRIBE /topic/notifications` | `MESSAGE` frames on publish |
| Send a chat message | Recipient receives a frame within 2 s |
| Invalid JSON in a frame | Client ignores it without breaking the stream |
| Socket drop | Client reconnects (chat) |

## 5. Client-side contract tests

Use `HttpTestingController` to assert what the client sends and how it handles responses:

```ts
it('sends repeated status filters', () => {
  service.emailStatuses(0, 10, '', 'OTP', 'id', 'desc', ['FAILED', 'SENT']).subscribe();
  const req = httpMock.expectOne(r => r.url.includes('/emails/status'));
  expect(req.request.params.getAll('statuses')).toEqual(['FAILED', 'SENT']);
  req.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
});
```

Also assert:

- Bearer header presence and value.
- `multipart/form-data` for media endpoints.
- Normalisation of an array response.
- Fallback to the legacy path on failure.

## 6. Contract drift detection

| Signal | Action |
| --- | --- |
| A field disappears | Update the model and the UI; add a contract test |
| A new required field appears | Add it to the form and payload |
| A status code changes | Update the interceptor and the page handling |
| Pagination shape changes | Verify `normalizePaged` still works |
| A path is renamed | Update `ApiService` and the fallbacks |

## 7. Reporting

Record for each run: environment, commit, endpoint, case, expected, actual, status, evidence
(request id or screenshot), and any follow-up ticket.
