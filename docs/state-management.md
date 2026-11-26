# State Management

## 1. Approach

There is **no global store** (no NgRx, Akita or similar). State is held in three places:

1. **Singleton services** for state that outlives a screen (session, theme, loading, toasts,
   sensitive-data visibility, impersonation, connectivity, real-time streams).
2. **Components** for page state (lists, filters, pagination, dialogs, forms).
3. **Browser storage** for state that must survive a reload (tokens, theme, preferences).

Reactivity uses Angular signals for synchronous state and RxJS for asynchronous streams. See
[ADR-002](architecture-decision-records/ADR-002-signals-and-rxjs.md).

## 2. Global state inventory

| Service | Signal / stream | Written by | Read by |
| --- | --- | --- | --- |
| `AuthService` | `isAuthed` → `authenticated`, `currentRole` → `role`, `isAdmin` (computed), `concurrentLoginState` → `concurrentLoginNotice` | Sign-in, refresh, logout, flag | Guards, shell, every page |
| `ThemeService` | `catalogState` → `catalog`, `activeCodeState` → `activeCode`, `savingState` → `savingCode`, `activeLabel` | `load`, `select`, `activate`, `reset` | Account page, shell |
| `LoadingService` | `activeRequests` → `loading` | `loadingInterceptor` | `LoadingOverlayComponent` |
| `ToastService` | `toasts` | Any page/service | `ToastContainerComponent` |
| `SensitiveDataService` | `hidden` | Reveal toggle | Masking pipes |
| `ImpersonationService` | `_impersonatedUser` → `impersonatedUser`, `isImpersonating` | Start/stop | Shell, account page, `AuthService.isAdmin` |
| `ConnectivityService` | `onlineState` → `online`, `checkingState` → `checking` | Heartbeat, events, interceptor | `OfflineOverlayComponent` |
| `ChatService` | `socketEventsSubject` → `socketEvents$`, `currentUserIdSubject` → `currentUserId$` | Socket, REST calls | Chat widget |
| `NotificationRealtimeService` | `subject` → `published$` | Socket | `AppComponent` |
| `ConfirmDialogService` | Pending request (observable) | Any page | `ConfirmDialogComponent` |

## 3. Page state

A typical list page holds:

```ts
items: T[] = [];
page = 0;
pageSize = 10;
totalPages = 0;
totalElements = 0;
filterText = '';
selectedFilters: string[] = [];
sortBy = '…';
sortDir: 'asc' | 'desc' = 'desc';
loading = false;
readonly selection = new BulkSelection();
```

All of it is local to the component. Navigating away discards it; returning re-fetches from the
backend. This is deliberate: it avoids stale cross-page state.

## 4. Form state

Reactive forms own field values, validity and dirty/touched flags:

| Form | Controls | Validators |
| --- | --- | --- |
| Login | `email`, `password`, `rememberMe` | required, email |
| OTP | `email`, `otp` | required, email, length 4–6 |
| Reset password | `email`, `newPassword`, `confirmPassword` | required, email, min 8, manual match |
| User editor | `name`, `email`, `gender`, `dob`, `role`, `relationShip`, `wish toggles`, `birthdayWishesUrl`, `mfaEnabled`, `concurrentLoginAllowed` | required, email, `wishesUrlValidator` |
| Event editor | `userId`, `eventType`, `eventDate`, `recurring`, `wishesUrl` | required, min 1, `wishesUrlValidator` |
| Notification editor | template-driven object: `title`, `message`, `canSendEmail`, `scheduledFrom`, `scheduledTo` | manual `scheduleError` |
| Account | profile, wish settings, MFA, concurrent login, change password | required, min 8 |

`markAllAsTouched()` is used on submit so errors appear without losing data.

## 5. Derived state

Computed signals and pure getters avoid storing values that can drift:

| Derived value | Where | Source |
| --- | --- | --- |
| `isAdmin` | `AuthService` | role + impersonation |
| `activeLabel` | `ThemeService` | active code + catalog |
| `loading` | `LoadingService` | request count |
| `deliveryHealth` | dashboard | sent/failed |
| `next` / `nextText` | event editor | form values + today |
| `filteredUsers` | event editor | users + search |
| `canDeleteSelected` | notifications | selection + published flags |
| `canMessage` / `messageLockReason` | chat | target + circle ids |
| `pageIds`, `allSelected` | list pages | rows + selection |
| `filteredOptions` | multi-select | options + search |

## 6. Persistent state

| Key | Store | Written by | Purpose |
| --- | --- | --- | --- |
| `fw_access_token` | `localStorage`/`sessionStorage` | `AuthService` | Bearer token |
| `fw_refresh_token` | same | `AuthService` | Refresh |
| `fw_role` | same | `AuthService` | Role without decoding the JWT |
| `fw_theme` | `localStorage` | `ThemeService` | Avoid a theme flash |
| `fw_impersonation` | `sessionStorage` | `ImpersonationService` | Restore the "viewing as" state |
| `fw_sso_token` | `localStorage` | `LoginComponent` | Cache the Google client id (base64) |
| `fw_wish_preview_seen_token` | `sessionStorage` | `AppComponent` | Show the preview once per session |
| `fw_published_notification_dismissed_id` | `sessionStorage` | `AppComponent` | Keep a dismissed banner dismissed |
| `fw_calendar_view` | `localStorage` | `CalendarComponent` | Remember month/week/day/agenda |
| `fw_calendar_kinds` | `localStorage` | `CalendarComponent` | Remember kind filters |

Rules:

- Never store passwords, OTPs, personal data or chat content.
- Always clear both stores on logout.
- Guard storage access with try/catch where it can throw (private mode, blocked storage). The
  calendar does this; `ThemeService` checks for `undefined`.

## 7. Server-state caching

Only two caches exist, both bounded and component-scoped:

| Cache | Key | Bound | Invalidation |
| --- | --- | --- | --- |
| Calendar months | `"<year>-<month>"` | Visible months plus current/next | `reload()` clears it; `force` reload refetches |
| Email images | Email id → object URL | 20 entries | Oldest evicted; revoked on destroy |

Everything else is fetched on demand. There is no offline cache or service worker.

## 8. State transitions

### Sign-in

```
anonymous ──login success──▶ authenticated (tokens, role, timers)
```

### Token refresh

```
authenticated ──refresh success──▶ authenticated (new tokens, timers reset)
authenticated ──refresh failure──▶ anonymous (logout, /login)
authenticated ──CONCURRENT_LOGIN──▶ unauthenticated + notice (no navigation)
```

### Impersonation

```
admin ──login-as──▶ impersonating (admin token retained, user token active, banner shown)
impersonating ──return──▶ admin
```

### Connectivity

```
online ──2 failed probes / offline event──▶ offline
offline ──probe success / online event──▶ online
```

## 9. Concurrency and ordering

| Situation | Handling |
| --- | --- |
| Two rapid filter changes | The last request's result is applied; there is no explicit cancellation, so a slow earlier response can briefly overwrite a newer one |
| A page load races a delete | The delete reloads the list after success |
| Chat messages arrive during paging | New messages are merged; paging state is kept |
| Theme change during impersonation | The auth effect reloads the theme for the effective user |
| Notification arrives while one is showing | The newer one replaces the banner |

**Improvement:** use `switchMap` or a request token for list loads to guarantee that only the latest
response is applied.

## 10. Anti-patterns to avoid

1. Storing derived values instead of computing them.
2. Writing signals inside `effect()` without deferring (NG0600).
3. Keeping tokens in component fields.
4. Sharing page state through services.
5. Mutating arrays that templates iterate without reassigning (signals need a new reference).
6. Persisting personal data for convenience.
