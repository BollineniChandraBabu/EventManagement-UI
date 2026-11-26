# Error Handling

## 1. Principles

1. **Never fail silently.** Every handled failure produces a toast, an inline message, or an overlay.
2. **Be specific when possible.** Prefer the backend's message over a generic one.
3. **Preserve the user's work.** Do not clear a form because a request failed.
4. **Keep the previous state.** A failed reload should not blank the screen.
5. **Separate transport problems from business problems.** Offline and session events get their own
   UI, not a toast.

## 2. Layers

| Layer | Responsibility |
| --- | --- |
| `authInterceptor` | 401 refresh/retry, 403 logout, concurrent-login notice, status-0 connectivity report |
| `loadingInterceptor` | Always stops the loading counter, even on error |
| `ConnectivityService` | Decides whether status 0 means offline |
| `apiErrorMessage` / `backendMessage` | Choose the message |
| Page components | Catch per call, show a toast, keep state |
| Overlays | Offline, concurrent login, loading |

## 3. Status-code handling

| Status | Meaning | Handling |
| --- | --- | --- |
| 0 | Request never reached the server (network or CORS) | `reportRequestFailure()` probes; overlay if confirmed offline; otherwise a toast |
| 400 | Validation | Show `error.error.message` |
| 401 | Expired session | Refresh and retry once |
| 401 + `CONCURRENT_LOGIN` | Session superseded | Clear tokens, show blocking notice, no navigation |
| 401 after refresh | Refresh failed | Logout |
| 403 | Forbidden | Immediate logout |
| 404 | Missing resource/endpoint | Feature fallback (seed path, email type) or a message |
| 409 | Conflict | Feature-specific message (e.g. triage already running) |
| 429 | Rate limited | "Too many attempts. Please wait a minute and try again." (or the backend text) |
| 5xx | Server error | Contextual fallback message |

## 4. Message resolution

```ts
apiErrorMessage(error, fallback):
  if status === 429 → backendMessage(error) ?? 'Too many attempts. Please wait a minute and try again.'
  if isConcurrentLoginError → concurrentLoginMessage(error)
  return backendMessage(error) ?? fallback
```

`backendMessage` reads `error.error.message` and trims it; anything else falls back.

Contextual fallbacks by page:

| Page | Fallback |
| --- | --- |
| Events | "Unable to load events right now." / "Unable to delete event right now." |
| Users | "Unable to fetch users right now." |
| Circles | "Unable to load your circle right now." |
| Email status | "Unable to load emails right now." |
| Notifications | "Unable to load notifications right now." |
| Schedulers | "Unable to fetch schedulers from /api/schedulers." |
| Account | "Unable to fetch profile right now." |
| Dashboard | Card values render as 0 rather than an error |

## 5. Feature-specific error behaviour

| Feature | Behaviour |
| --- | --- |
| Seed endpoints | Try the primary path, then the legacy path, then report the primary error |
| Email type endpoints | Try the typed path, then the generic endpoint with `emailTypes` |
| Published notification | Fall back to the newest published item in the collection |
| Email image | Placeholder with a retry action; the list is unaffected |
| Copilot | 503 shows `answer` or `message`; 400 explains the length limit; other errors are generic |
| Delivery-ops run | 409 → "A triage run is already in progress."; other errors show `report` or `message` |
| Location lookup | Returns `null`; the guard then denies access |
| Theme save | Theme applied locally even if the save fails |
| MFA / concurrent-login toggle | Switch reverts to the previous value |
| Google SSO script | Warning toast; password/OTP remain |
| Chat socket | No live updates; REST still works |

## 6. Session error handling

Detailed in [`authentication-flow.md`](authentication-flow.md). Summary:

```
401 ── concurrent marker? ── yes ──▶ clear tokens, notice, stop
                          └─ no  ──▶ refresh ── success ──▶ retry
                                            └─ failure ──▶ concurrent? notice : logout
403 ──▶ logout
```

While the notice is set, the interceptor returns errors immediately without touching auth state.

## 7. Connectivity handling

Detailed in [`troubleshooting-guide.md`](troubleshooting-guide.md). Summary:

- Status 0 to the API origin triggers a probe. That probe is **conclusive**: the real request
  already failed, so a single failed probe marks the app offline.
- The 10 s heartbeat is not conclusive; it needs two consecutive failures.
- A browser `offline` event marks the app offline immediately.
- A successful probe clears it and briefly shows "You're back online".
- Third-party URLs (e.g. `ipapi.co`) are ignored so a blocked lookup never shows the offline screen.

## 8. Validation errors

- Client-side errors appear next to the field after touch/dirty.
- Server-side errors are shown as a toast (or next to the field where the form supports it), using
  the backend message.
- A failed save never discards the user's input.

## 9. Error logging

| What | Where |
| --- | --- |
| Unhandled bootstrap error | `console.error` in `main.ts` |
| Google SSO config failure | `console.error` |
| Everything else | Not logged |

There is **no client error reporting service**. Production faults are invisible unless a user
reports them. See [`monitoring-and-alerting.md`](monitoring-and-alerting.md) for the recommended
remedy.

## 10. User-facing message catalogue

| Situation | Message |
| --- | --- |
| Wrong credentials | Backend message, e.g. "Bad credentials" |
| Rate limited | "Too many attempts. Please wait a minute and try again." |
| Concurrent login | Backend message without the marker, e.g. "Your account was signed in on another device, so this session ended." |
| Offline | "No internet connection — check your Wi-Fi or mobile data." |
| Back online | "You're back online" |
| Reset link missing token | "This reset link is missing a token. Please request a new reset email." |
| Password mismatch | "Password and confirm password must match." |
| Unsupported media | "… is not a supported media type. Use PNG, JPEG, …" |
| Media too large | "The video is 62 MB. The limit is 50 MB." |
| Invalid wishes link | Specific rule message |
| Published notification edit | "Published notifications cannot be edited." |
| Stale schedule | "… can't be published yet. … Edit the notification to set a future schedule." |
| Impersonation blocked | "Admin users cannot be impersonated." |
| Security change while impersonating | "Security settings cannot be changed while impersonating." |
| Copilot unavailable | "The admin copilot is unavailable right now." |
| Triage already running | "A triage run is already in progress." |

## 11. Anti-patterns

| Anti-pattern | Why it is avoided |
| --- | --- |
| Swallowing errors with an empty `error: () => {}` | The user would not know the action failed; the few existing empty handlers are for optional option lists |
| Showing raw stack traces | Confusing and potentially sensitive |
| Redirecting on every error | Loses context; only auth failures redirect |
| Clearing the form on failure | Loses work |
| Treating status 0 as offline immediately | It may be CORS |
| Retrying a concurrent-login rejection | It will always fail |

## 12. Improving error handling

| Improvement | Benefit |
| --- | --- |
| Add a global `ErrorHandler` that reports to Sentry | Visibility of production faults |
| Add HTTP timeouts | Prevent indefinite loading overlays |
| Standardise a per-page error banner with retry | Better recovery than a transient toast |
| Add request ids to error reports | Faster correlation with backend logs |
