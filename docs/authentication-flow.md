# Authentication Flow

## 1. Overview

Golden Greetings uses JWT access and refresh tokens with four sign-in paths, an optional second
factor, an optional single-session rule and a one-time-link flow. All authentication logic lives in
`AuthService` and `authInterceptor`.

```
                 ┌────────────┐
   password ────▶│            │
   Google SSO ──▶│  /auth/*   │──▶ accessToken + refreshToken + expiresIn + role
   OTP ─────────▶│            │
   direct link ─▶│            │
                 └─────┬──────┘
                       │
              ┌────────▼─────────┐
              │ localStorage     │  remember me
              │ or sessionStorage│  otherwise
              └────────┬─────────┘
                       │
        ┌──────────────┼───────────────┐
        ▼              ▼               ▼
  bearer on every  refresh at     logout at
  API request      expiresIn-30   expiresIn
```

## 2. Storage keys

| Key | Contents | Store |
| --- | --- | --- |
| `fw_access_token` | JWT access token | `localStorage` if "remember me", else `sessionStorage` |
| `fw_refresh_token` | Refresh token | same |
| `fw_role` | `ROLE_ADMIN` or `ROLE_USER` | same |
| `fw_sso_token` | Base64 Google client id | `localStorage` |
| `fw_impersonation` | Impersonated user JSON | `sessionStorage` |

`getStoredValue` reads `localStorage` first, then `sessionStorage`, so a persisted session wins.

## 3. Password sign-in

1. The guest submits email, password and "remember me".
2. The client resolves location metadata: browser GPS first; if country/region are missing, it calls
   `https://ipapi.co/json` and merges. Failure yields `{}`.
3. `POST /auth/login` with `{email, password, rememberMe, loginLocation?, ipAddress?, latitude?, longitude?, forceMfa: true}`.
4. On success, `setSession`:
   - clears any previous tokens from **both** stores,
   - writes the new tokens to the chosen store,
   - sets `authenticated = true` and `role`,
   - schedules the refresh and the hard logout,
   - clears any concurrent-login notice.
5. The client navigates to the safe `redirectUrl` or `/dashboard`.

## 4. Google SSO

1. On `/login`, if `fw_sso_token` is absent, `GET /auth/sso/token` returns the client id, which is
   stored base64-encoded.
2. The Google script is injected once; the button renders into the reserved slot.
3. Google returns an ID token to the callback.
4. `POST /auth/sso/google` with the token, `loginLocation` and `forceMfa: true`.
5. Same `setSession` path as password sign-in.

If no client id is configured, the button is not rendered and password/OTP remain available.

## 5. OTP sign-in and MFA

### 5.1 Plain OTP sign-in

1. `POST /auth/otp/send {email}`.
2. `POST /auth/otp/verify-login {email, otp, rememberMe, loginLocation?, provider?}`.
3. Session stored; navigation continues.

### 5.2 MFA challenge

1. Password or Google sign-in returns a 401 whose message contains `MFA_OTP_REQUIRED`.
2. The client navigates to `/otp-login` with `{email, rememberMe, provider, mfaRequired: true, ...location}` in
   navigation state (not the URL).
3. `ngOnInit` sends an OTP automatically because `mfaRequired` is set.
4. The user enters the code; `verifyLoginOtp` sends the same context plus the code.
5. Session stored; navigation continues.

## 6. One-time direct login

1. An email link points at a protected route with `?token=…&email=…`.
2. `authGuard` detects the token and redirects to `/direct-login` with the same query.
3. The page resolves location metadata and posts `{token, email, ...location}` to
   `/auth/direct-login`.
4. The session is always persisted to `localStorage` (a link should survive a restart).
5. The user lands on `redirectUrl` or `/circles`.

## 7. Password reset

1. `/forgot-password` posts `{email}` to `/auth/forgot-password`.
2. The email link contains `token` and `email`.
3. `resetLinkGuard` forwards `/`, `/password-reset` and any route with those parameters to
   `/reset-password?token=…&email=…`.
4. The page requires both passwords to match and be at least 8 characters, then posts
   `/auth/password-reset/confirm`.
5. On success the user is sent to `/login` after 1.5 s.

## 8. Token lifecycle

| Event | Behaviour |
| --- | --- |
| Request | `authInterceptor` attaches `Authorization: Bearer <accessToken>` |
| `expiresIn − 30 s` | `POST /auth/refresh` with the stored refresh token; tokens replaced and timers rescheduled |
| `expiresIn` | `autoLogout()` → `logout()` (no-op if a concurrent-login notice is showing) |
| 401 (ordinary) | Interceptor refreshes and retries the request once |
| 401 after refresh | Logout |
| 403 | Immediate logout |
| Refresh rejected for concurrent login | Notice, not logout |

`expiresIn` is in seconds. A missing, zero or non-finite value disables the timers rather than
scheduling an immediate logout.

## 9. Concurrent login (single-session)

When an account has `concurrentLoginAllowed = false`:

1. A new sign-in revokes earlier refresh tokens and mints a new session id (backend).
2. Requests from the superseded session receive **401** with a body message beginning
   `CONCURRENT_LOGIN`.
3. `isConcurrentLoginError` detects the marker (status 401 + prefix).
4. `AuthService.flagConcurrentLogin(message)`:
   - stops impersonation if active,
   - clears tokens from both stores,
   - sets `authenticated = false`,
   - cancels timers,
   - sets `concurrentLoginNotice` to the cleaned message.
5. `ConcurrentLoginOverlayComponent` renders a blocking notice with one action: sign out and sign in
   again.
6. The user is **not** navigated away, so the explanation is read.

Guard rails:

- The interceptor ignores all later failures while the notice is set (they are expected).
- `autoLogout` and `refreshOrLogout` do nothing while the notice is set, so a timer cannot clear it.
- Only `logout()` (the notice action, or the account page) clears the notice.

## 10. Logout

| Trigger | Path |
| --- | --- |
| Account page button | `logout()` |
| 403 | `logout()` |
| Failed refresh | `logout()` |
| Token expiry | `autoLogout()` → `logout()` unless a notice is showing |
| Concurrent-login notice action | `logout()` |
| While impersonating | Stops impersonation and returns to `/dashboard` instead of signing out |

`logout()` clears both stores, resets role and auth state, cancels timers, clears the notice, and
navigates to `/login` with the current URL as `redirectUrl` when it is a safe internal path.

## 11. Impersonation

1. Admin selects "log in as" on a non-admin user.
2. `POST /auth/admin/login-as-user {email}` returns a token pair for that user.
3. `setSession` stores it; the admin's ability to switch back relies on the backend's switch-back
   endpoint rather than a locally stored admin token.
4. `ImpersonationService.startImpersonation(user)` stores the user in `sessionStorage`.
5. `AuthService.isAdmin` returns `false`, hiding admin navigation; the shell shows a banner.
6. "Return to Admin" calls `GET /auth/admin/switch-back`, stores the admin token, stops
   impersonation and navigates to `/users`.

## 12. Authorisation in the client

| Layer | Mechanism |
| --- | --- |
| Route | `authGuard`, `adminGuard`, `guestGuard` |
| UI | `auth.isAdmin()` hides admin sections and admin actions |
| Data | The backend authorises every request; the client never assumes a hidden action is safe |

The client cannot enforce authorisation. Hiding UI is a usability measure; the backend must reject
unauthorised calls.

## 13. Session-related user experience

| Situation | What the user sees |
| --- | --- |
| Wrong password | Toast with the backend message |
| Too many attempts | Rate-limit message |
| MFA required | OTP page with a toast explaining why |
| Expired session | Silent refresh; usually nothing visible |
| Signed out by expiry | Login page with the previous URL preserved |
| Signed in elsewhere | Blocking notice explaining the single-session rule |
| Impersonating | Banner: "You are viewing the app as <name>" |

## 14. Security notes

- Tokens are never logged.
- The refresh token is only sent to `/auth/refresh`.
- The `ipinfo.io` request deliberately omits the bearer token.
- `redirectUrl` is validated to prevent open redirects and loops.
- The concurrent-login marker is treated as an auth event, not a generic error.

## 15. Test coverage

| Scenario | Spec |
| --- | --- |
| Guard redirects and one-time token routing | `auth.guard.spec.ts` |
| Refresh-and-retry | `auth.interceptor.spec.ts` |
| Concurrent-login detection and notice retention | `auth.interceptor.spec.ts` |
| Session storage and timers | `auth.service.spec.ts` |
| Direct login exchange | `direct-login.component.spec.ts` |
| Notice rendering | `concurrent-login-overlay.component.spec.ts` |

See [`test-coverage-report.md`](test-coverage-report.md) for gaps.
