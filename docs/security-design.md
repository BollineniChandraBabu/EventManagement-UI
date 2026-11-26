# Security Design

## 1. Security posture

Golden Greetings UI is a **public static client**. It holds no secrets and enforces no
authorisation by itself. Its security job is to:

1. Handle session tokens safely.
2. Not undermine the backend's authorisation.
3. Not introduce injection, XSS or data-leak paths.
4. Protect personal data on screen.
5. Fail safely (no silent re-authentication, no open redirects).

The **backend is the security boundary**. Every client-side check is convenience and defence in
depth.

## 2. Trust boundaries

```
┌─────────────────────────────┐        ┌──────────────────────────┐
│ Browser (untrusted)         │        │ Backend (trusted)        │
│  - user input               │ HTTPS  │  - authorisation         │
│  - tokens in web storage    │───────▶│  - validation            │
│  - client guards (bypassable)│       │  - rate limiting         │
│  - rendered HTML            │◀───────│  - audit logging         │
└─────────────────────────────┘        └──────────────────────────┘
         │        ▲
         │        │ CDN assets, Google, ipapi.co (third parties)
         ▼        │
   ┌──────────────────────┐
   │ Third-party origins  │
   └──────────────────────┘
```

Anything in the browser can be modified by the user. Therefore:

- Hiding a button is not authorisation.
- Client validation is not validation.
- The location guard is not a security control.

## 3. Authentication design

| Control | Implementation |
| --- | --- |
| Password sign-in | `POST /auth/login`, tokens returned |
| SSO | Google ID token exchanged at `/auth/sso/google` |
| OTP / MFA | `MFA_OTP_REQUIRED` marker → OTP page |
| One-time links | `token` + `email` exchanged at `/auth/direct-login` |
| Token storage | `localStorage` (remember me) or `sessionStorage` |
| Refresh | 30 s before expiry; one refresh-and-retry on 401 |
| Sign-out | Clears both stores, role, timers |
| Superseded session | `CONCURRENT_LOGIN` marker → blocking notice |
| Optional MFA | Per-account `mfaEnabled` |
| Optional single-session | Per-account `concurrentLoginAllowed` |

Detailed flow: [`authentication-flow.md`](authentication-flow.md).

### 3.1 Known trade-off: tokens in web storage

Web storage is readable by any script running on the origin. Mitigations:

- Angular sanitises `[innerHTML]`; the app does not bypass it with `bypassSecurityTrustHtml` for
  untrusted content.
- No third-party scripts beyond pinned CDNs; the MDB script is deferred.
- Short access-token lifetime with proactive refresh.
- Optional MFA and single-session.
- Recommended: a Content-Security-Policy (see §7).

## 4. Authorisation design

| Layer | Mechanism | Strength |
| --- | --- | --- |
| Route | `authGuard`, `adminGuard`, `guestGuard` | UX only (bypassable) |
| UI | `auth.isAdmin()` hides admin sections | UX only |
| Data | Backend checks the token and role | **Real control** |
| Impersonation | Admin token with a user identity | Admin tool; audit backend-side |

The client never treats a hidden control as a permission. If the backend rejects a request, the
client surfaces the error.

## 5. Input and output safety

| Risk | Control |
| --- | --- |
| XSS via HTML from the backend (email body, wish preview, chat formatting) | Angular's sanitiser on `[innerHTML]`; chat formatting produces sanitised HTML |
| XSS via user text | Interpolation, not HTML binding |
| `javascript:` / `data:` URLs in wishes links | `wishesUrlError` allows only `http(s)` and rejects credentials |
| Open redirect | `getSafeRedirectUrl` allows only internal paths, rejects `//` and auth pages |
| CSV formula injection | `csvCell` prefixes `= + - @` and control characters |
| Malicious uploads | Type and size checks client-side; byte sniffing server-side |
| Path traversal in file names | Browser/server handling; names are never used as paths by the client |
| Rate-limit abuse | Backend 429; the client explains it |

## 6. Personal data protection

| Control | Implementation |
| --- | --- |
| Masking by default | `SensitiveDataService.hidden = true`; impure pipes mask emails and values |
| Explicit reveal | `SensitiveInfoToggleComponent` |
| No persistence of personal data | Only tokens, theme, preferences and non-sensitive ids are stored |
| No logging of PII | The client does not log user data |
| Minimal display | Only the fields the screen needs |

Screens that mask: users, login locations, violated users, email status, wish images, festival
wishes, account.

## 7. Transport and headers

| Control | Status |
| --- | --- |
| HTTPS | Yes (Firebase) |
| HSTS | Not configured — recommended |
| CSP | Not configured — recommended |
| `X-Content-Type-Options` | Not configured — recommended |
| `Referrer-Policy` | Not configured — recommended |
| `X-Frame-Options` / `frame-ancestors` | Not configured — recommended |
| CORS | Enforced by the backend; the UI origin must be allowed |

Recommended CSP (start in report-only):

```
default-src 'self';
script-src 'self' https://cdnjs.cloudflare.com https://accounts.google.com;
style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;
img-src 'self' data: blob: https:;
connect-src 'self' https://<api-host> wss://<api-host> https://ipapi.co https://accounts.google.com;
frame-src https://accounts.google.com;
object-src 'none'; base-uri 'self'; form-action 'self'
```

## 8. Third-party exposure

| Third party | Data shared | Control |
| --- | --- | --- |
| Google Identity | Browser context, Google account | Loaded only on the login page, only when configured |
| `ipapi.co` | The user's IP | Only for the location gate; failure denies access |
| CDNs (cdnjs, fonts) | Browser metadata (IP, referrer) | Pinned versions; `Referrer-Policy` recommended |
| CanvasJS CDN | Browser metadata | Loaded only on chart pages |
| Google Maps | Coordinates in the URL (new tab) | User-initiated only |

The bearer token is **never** sent to a third party: the interceptor skips `ipinfo.io` explicitly.

## 9. Secure failure behaviour

| Failure | Behaviour | Why |
| --- | --- | --- |
| Refresh fails | Sign out | Do not continue with an invalid session |
| Concurrent login | Notice, no navigation | Do not silently re-authenticate |
| 403 | Sign out | The session is no longer valid |
| Location unknown | Deny access | Fail closed |
| Media invalid | Refuse before upload | Do not rely on the server alone |
| Notification schedule invalid | Refuse to publish | Prevent back-dated announcements |
| Copilot disabled | Lock the composer | Do not send requests that will fail |

## 10. Logging and monitoring

| Event | Where |
| --- | --- |
| Sign-in attempts (success/failure) | Backend; surfaced in Login Locations and Violated Users |
| Business actions | Backend audit logs |
| Client errors | **Not reported** (gap) |
| Deploy events | GitHub Actions |

## 11. Security checklist for a change

- [ ] No new secret in the bundle.
- [ ] No new `innerHTML` of untrusted data.
- [ ] No new URL constructed from user input without validation.
- [ ] New personal data is masked by default.
- [ ] New destructive action confirms.
- [ ] New API call sends the bearer token and handles 401/403.
- [ ] No PII in logs or error messages.
- [ ] New dependency reviewed and pinned.
