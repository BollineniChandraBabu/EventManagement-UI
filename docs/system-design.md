# System Design

## 1. Purpose

Technical design of the Angular client: how the application is composed, how each concern is
implemented, and the contracts it relies on. For the broader picture see
[`system-architecture.md`](system-architecture.md); for class-level detail see
[`low-level-design.md`](low-level-design.md).

## 2. Bootstrap and providers

`main.ts` bootstraps `AppComponent` with:

| Provider | Purpose |
| --- | --- |
| `provideAnimations()` | Angular animations (Material CDK dialogs, overlays) |
| `provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true })` | Fewer change-detection cycles by coalescing events |
| `provideRouter(routes, withPreloading(IdlePreloadingStrategy))` | Lazy routes plus idle preloading |
| `provideHttpClient(withInterceptors([loadingInterceptor, authInterceptor]))` | HTTP stack; loading runs before auth so retries also show loading |

Order matters: `loadingInterceptor` wraps the whole pipeline, so a refresh-and-retry triggered by
`authInterceptor` keeps a single loading session.

## 3. Module and folder design

| Folder | Contents | Rules |
| --- | --- | --- |
| `core/constants` | Role constants | No imports from features |
| `core/guards` | Route guards | Depend only on services |
| `core/interceptors` | HTTP interceptors | Depend only on services |
| `core/models` | Interfaces and type aliases | No runtime logic |
| `core/pipes` | Masking pipes | Impure because they read a signal |
| `core/services` | Singletons | `providedIn: 'root'` |
| `core/strategies` | Preloading strategy | Router-only |
| `core/utils` | Pure functions | Fully unit-testable, no Angular imports except types |
| `features/*` | Screens | One folder per screen; may use core and shared |
| `shared/*` | Reusable UI | No feature imports |

## 4. Routing design

- Every route uses `loadComponent`, so each screen is its own chunk.
- The authenticated area is a single parent route with `authGuard` and
  `canActivateChild: [locationAccessGuard]`.
- Admin routes add `adminGuard`.
- A wildcard route redirects to `/dashboard`.
- Public routes are `login`, `otp-login`, `forgot-password`, `reset-password`, `password-reset`,
  `direct-login` and `restricted-region`.
- The root path (`''`) is the reset-password entry point because emailed reset links use `/`.

Details in [`routing-and-navigation.md`](routing-and-navigation.md).

## 5. State design

| Kind of state | Mechanism | Example |
| --- | --- | --- |
| Session | Signals in `AuthService` | `authenticated`, `role`, `concurrentLoginNotice` |
| Global UI | Signals in singleton services | `LoadingService.loading`, `SensitiveDataService.hidden`, `ToastService.toasts` |
| Cross-component real-time | RxJS `Subject`/`Observable` | `ChatService.socketEvents$`, `NotificationRealtimeService.published$` |
| Page state | Component fields | `events`, `page`, `totalPages`, `loading` |
| Form state | Reactive forms | `EventEditorComponent.form` |
| Server cache | `Map` in the component | `CalendarComponent.monthCache` |
| Preferences | `localStorage`/`sessionStorage` | theme, calendar view/kinds |

There is no NgRx or other global store. See [`state-management.md`](state-management.md).

## 6. HTTP design

### 6.1 One façade

`ApiService` (1014 lines) exposes every REST endpoint as a typed method. It centralises:

- URL construction from `environment.apiUrl`.
- Query parameter building (`pagedParams`, `idsParams`).
- Multipart body construction for media.
- Response normalisation (`unwrap`, `normalizePaged`, `normalizeCollection`).
- Legacy path fallbacks (`requestWithFallback`).
- Payload aliasing (`normalizeUserPayload`, `normalizeEnumSeedPayload`).

### 6.2 Error semantics

| Status | Meaning in this app | Handling |
| --- | --- | --- |
| 0 | Network/CORS | Probe connectivity; do not assume offline |
| 400 | Validation | Show backend message |
| 401 | Expired or superseded session | Refresh once, or show the concurrent-login notice |
| 403 | Forbidden | Sign out |
| 404 | Missing endpoint/resource | Feature-specific fallback or message |
| 409 | Conflict (e.g. triage already running) | Specific message |
| 429 | Rate limited | Shared rate-limit message |
| 5xx | Server error | Fallback message |

### 6.3 Timeouts

No client-side HTTP timeout is configured. A slow backend is covered by the connectivity probe
(8 s) only for the offline decision, not for individual requests. This is a known gap.

## 7. Authentication and session design

```
AuthService
  state: isAuthed (signal), currentRole (signal), concurrentLoginState (signal)
  storage keys: fw_access_token, fw_refresh_token, fw_role
  timers: tokenExpiryTimeout (hard logout), refreshTimerSub (refresh at expiresIn-30s)

  login / googleSsoLogin / directLogin / loginAsUser / switchBackToAdmin / verifyOtp /
  verifyLoginOtp → setSession(response, rememberMe)

  setSession: clear old, write to chosen storage, set signals, schedule timers
  refreshToken: POST /auth/refresh with the stored refresh token
  logout: stop timers, clear storage, reset role, navigate /login (preserving redirectUrl)
  flagConcurrentLogin: stop timers, clear storage, set notice, no navigation
```

`isAdmin` is a computed signal that returns `false` while impersonating, which hides admin UI
without changing the token.

Full details in [`authentication-flow.md`](authentication-flow.md).

## 8. Real-time design

Both sockets speak STOMP 1.2 over a raw WebSocket:

```
CONNECT\naccept-version:1.2\nheart-beat:10000,10000\n\n\0
SUBSCRIBE\nid:<id>\ndestination:<topic>\n\n\0
MESSAGE\ndestination:<topic>\n\n<json>\0
```

| Service | Topics | Reconnect |
| --- | --- | --- |
| `NotificationRealtimeService` | `/topic/notifications` | Reconnects on the next `connect()` call (after a sign-in transition) |
| `ChatService` | Chat user queue and conversation topics | Timed reconnect with resubscription of known topics |

Frames are parsed manually: the body is everything after the first blank line, with `\0`
stripped. JSON parse failures are swallowed so one bad frame cannot break the stream.

## 9. Theming design

- `ThemeService` holds the catalog (server list merged with a built-in list of 11) and the active
  code.
- The active code is written to `document.documentElement[data-theme]`.
- `themes.css` defines token overrides per `data-theme`, including the mobile nav panel variables
  (`--nav-panel-bg`, `--nav-panel-blur`) and the active nav chip (`--nav-accent`,
  `--nav-accent-fg`).
- The choice is cached in `localStorage` so the first paint after a reload uses the right theme.

## 10. Validation design

| Rule | Implementation | Mirrors |
| --- | --- | --- |
| Email format | `Validators.email` | Backend |
| Required fields | `Validators.required` | Backend |
| Password length ≥ 8 | `Validators.minLength(8)` | Backend |
| Password confirmation | Explicit comparison in `submit()` | UI only |
| Wishes URL | `wishesUrlValidator` → `wishesUrlError` | Backend `WishesUrls` |
| Media type and size | `mediaError` / `imageError` | Backend `MediaValidation` |
| Schedule window | `scheduleError` | Backend notification rules |
| OTP length 4–6 | `minLength(4)`, `maxLength(6)` | Backend |
| Positive user id | `Validators.min(1)` | Backend |
| Copilot question ≤ 500 | `canSend` getter | Backend |

## 11. Performance design

| Technique | Where |
| --- | --- |
| Lazy routes | `app.routes.ts` |
| Idle preloading | `IdlePreloadingStrategy` |
| Deferred MDB script | `index.html` (`defer`) |
| Font Awesome preload + `noscript` | `index.html` |
| CanvasJS injected on first render | `canvasjs-line-chart.component.ts` |
| On-demand email images | `EmailStatusComponent` |
| Debounced search | Circles, violated users |
| Paged lists | All list screens |
| Bounded caches | Calendar months, email images (20) |
| Zone event coalescing | `main.ts` |
| Budgets | `angular.json` |

## 12. Security design (client side)

- Bearer token injected per request; third-party `ipinfo.io` requests are excluded from the header.
- Route guards for authentication, role, location and reset links.
- Impersonation keeps the admin token and hides admin UI; the backend must still authorise.
- Masking by default for emails and values.
- URL validation for user-supplied links.
- CSV formula-injection protection.
- Angular's sanitiser handles `[innerHTML]` for email bodies, wish previews and chat formatting.
- No secrets in the bundle; the Google client id is fetched at runtime.

## 13. Failure design

| Failure | User experience |
| --- | --- |
| API 5xx | Toast with a fallback message; page keeps prior data |
| API 401 | Silent refresh and retry |
| API 403 | Immediate sign-out |
| Superseded session | Blocking notice with a single action |
| Offline | Full-screen notice with retry, then a "back online" state |
| Geodata unavailable | Restricted-region page |
| Socket failure | No live updates; REST still works |
| Missing image | Placeholder with retry |
| Route not found | Redirect to `/dashboard` |

## 14. Extensibility points

- **New screen:** add a folder under `features`, a lazy route, a navigation entry, and (if needed)
  methods on `ApiService`.
- **New theme:** add a code to the backend `UITheme` seed, the fallback catalog in `ThemeService`,
  and a `html[data-theme='code']` block in `themes.css`.
- **New notification type:** extend `emailType` route data and the `emailStatuses` switch.
- **New media kind:** extend `MEDIA_KIND_RULES`, `previewKindFor` and the backend `MediaValidation`.

## 15. Technical debt register

| Item | Impact | Suggested action |
| --- | --- | --- |
| `ApiService` is very large | Hard to navigate | Split by domain (`UserApi`, `EventApi`, …) |
| Unrouted placeholder components | Confusion | Delete or implement |
| No lint config | Inconsistent style | Add ESLint + Prettier |
| No `karma.conf.js` | Tests cannot run as configured | Commit a Karma config |
| No HTTP timeout | Requests can hang indefinitely | Add a timeout with a user-facing error |
| Mixed styling systems | Inconsistent UX | Choose MDB or Material |
| No error telemetry | Blind operations | Add Sentry or similar |
| Duplicated list-page logic | Repetition across six screens | Extract a list-page base class or directive |
