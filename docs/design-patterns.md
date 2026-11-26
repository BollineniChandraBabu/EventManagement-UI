# Design Patterns

Patterns actually used in this codebase, why they were chosen, and where to find them. Patterns
listed here are observable in the source, not aspirational.

## 1. Structural patterns

### 1.1 Facade — `ApiService`

**Where:** `core/services/api.service.ts` (1 014 lines, ~120 methods).

**Problem:** ~40 screens each need HTTP calls with query parameters, multipart bodies and
heterogeneous response shapes.

**Solution:** one injectable facade exposes typed methods. Components never touch `HttpClient`.

**Why:** a single place for URL construction, parameter building, normalisation and legacy path
fallbacks. Changing a path or response shape is one edit.

**Trade-off:** the facade is large. A future split by domain (`UserApi`, `EventApi`, …) would keep
the benefit with smaller files.

### 1.2 Adapter — response normalisation

**Where:** `unwrap`, `normalizePaged`, `normalizeCollection`, `normalizeUserPayload`,
`normalizeEnumSeedPayload`, `normalizeWishPreview`.

**Problem:** the backend sometimes returns `T`, sometimes `{data: T}`, sometimes a raw array,
sometimes a paged object; field names have aliases (`dob`/`dateOfBirth`,
`relationShip`/`relationship`).

**Solution:** adapt every response and payload at the boundary so the rest of the app sees one
stable shape.

**Why:** decouples UI code from backend evolution and prevents `undefined` crashes.

### 1.3 Composite — shell plus lazy feature trees

**Where:** `AppComponent` hosts `<router-outlet>`, global overlays and the chat widget.

**Why:** consistent chrome (sidebar, banners, toasts, overlays) without duplicating it in each
screen, while feature trees stay independently loadable.

### 1.4 Decorator — functional HTTP interceptors

**Where:** `loadingInterceptor`, `authInterceptor`.

**Problem:** cross-cutting behaviour (loading indicator, bearer token, refresh, connectivity
signal) on every request.

**Solution:** wrap the request pipeline. `loadingInterceptor` runs outside `authInterceptor`, so a
refresh-and-retry stays inside one loading session.

### 1.5 Proxy / gatekeeper — guards

**Where:** `authGuard`, `adminGuard`, `guestGuard`, `locationAccessGuard`, `resetLinkGuard`.

**Why:** navigation-level decisions (authenticated? admin? allowed region? reset link?) are
centralised and composable per route.

### 1.6 Mapper — pure view-model functions

**Where:** `calendar.utils.ts` (`toEntry`, `buildDays`), `dashboard.component.ts`
(`toLineChartData`), `login-locations.utils.ts`, `violated-users.utils.ts`.

**Why:** converting API models into view models in pure functions makes them trivially testable and
keeps templates simple.

## 2. Behavioural patterns

### 2.1 Observer — services expose streams

**Where:** `ChatService.socketEvents$`, `NotificationRealtimeService.published$`,
`ChatService.currentUserId$`, `ToastService.toasts` (signal), dashboard `selectedDateRange$`.

**Why:** many consumers (widget, shell, pages) react to one source without coupling to it.

### 2.2 Mediator — shared UI services

**Where:** `ToastService`, `ConfirmDialogService`, `LoadingService`, `SensitiveDataService`.

**Problem:** a page deep in the tree needs a toast/dialog/overlay rendered by the shell.

**Solution:** the page calls a singleton; the shell renders whatever the singleton publishes.

**Why:** no prop-drilling, no duplicate dialog markup.

### 2.3 Command — action objects for confirmations

**Where:** `ConfirmDialogService.confirm({title, message, confirmText, tone, icon})` and
`confirmDelete({itemLabel, detail})`.

**Why:** destructive actions are described declaratively, and the shell renders a consistent
dialog. Callers get an observable that emits only on confirm.

### 2.4 State / Strategy — token storage and preloading

**Where:** `AuthService.getStorage(rememberMe)` returns `localStorage` or `sessionStorage`;
`IdlePreloadingStrategy` implements Angular's `PreloadingStrategy`.

**Why:** interchangeable behaviour selected at runtime without branching at every call site.

### 2.5 Template Method (informal) — list page lifecycle

**Where:** every list page follows the same shape: `load()` → subscribe → assign rows, totals,
`retainOnly` → `loading = false`; `onSearchInput`, `applySearch`, `onPageSizeChange`,
`toggleSort`, `nextPage`, `prevPage`.

**Why:** consistent behaviour across six screens. The duplication is a candidate for extraction
into a base class or directive.

### 2.6 Null Object / safe defaults

**Where:** `normalizeWishPreview` returns `{showMessage:false}` for missing data;
`deliveryHealth` treats a day with no mail as 100%; `toSafeMetric` coerces `NaN`/negative to 0;
`normalizeCollection` returns `[]`.

**Why:** the UI never crashes on absent optional data.

## 3. Angular-specific patterns

### 3.1 Standalone components with explicit imports

Every component declares `standalone: true` and lists exactly the directives/pipes it uses. This
makes dependencies visible and improves tree-shaking.

### 3.2 Smart/presentational split

- **Smart:** feature components inject services and own state (`EventsComponent`,
  `CalendarComponent`, `AccountManagementComponent`).
- **Presentational:** `MultiSelectFilterComponent`, `SensitiveInfoToggleComponent`,
  `CanvasJsLineChartComponent` receive inputs and emit outputs.

### 3.3 Signal-based shared state

`signal` + `computed` in `AuthService`, `ThemeService`, `LoadingService`, `ToastService`,
`SensitiveDataService`, `ImpersonationService`, `ConnectivityService`, `BulkSelection`.

Why: synchronous reads in templates with no subscription management, and derived values that
cannot drift.

### 3.4 Reactive forms with pure validators

`FormBuilder.nonNullable.group` plus `Validators` and a custom `wishesUrlValidator` that delegates
to the pure `wishesUrlError`.

### 3.5 Impure pipes for global masking

`SensitiveEmailPipe` and `SensitiveValuePipe` are impure because their output depends on a shared
signal, not on the input. This is deliberate and documented in the source.

### 3.6 Effect with deferred work

`AppComponent` reads signals in `effect()` but defers side effects with `queueMicrotask` to avoid
NG0600 (signal writes inside an effect are not allowed in Angular 17 without
`allowSignalWrites`).

## 4. Anti-patterns avoided

| Anti-pattern | How it is avoided |
| --- | --- |
| Direct `HttpClient` use in components | All calls go through services |
| Storing derived state | `computed()` derives it |
| `any` for API payloads | Typed models in `core/models` |
| Silent failures | Toasts, inline messages, overlays |
| Unvalidated user input in URLs | `wishesUrlError` |
| Unescaped CSV | `csvCell` formula guard |
| Destructive action without confirmation | `ConfirmDialogService` |
| Subscriptions left open | `takeUntilDestroyed` |
| Global `allowSignalWrites` | Local `queueMicrotask` instead |
| Eager loading of everything | Lazy routes + idle preload |

## 5. Patterns considered and rejected

| Pattern | Why not used |
| --- | --- |
| NgRx / Redux store | The app has little shared state; signals and services cover it with far less ceremony |
| Class-based interceptors | Functional interceptors are the Angular 17 idiom and compose more simply |
| Resolver-based data loading | Components need interactive reloads (filters, paging); loading in the component keeps state local |
| Generic table component | The six list screens differ enough in columns and actions that a generic table would add configuration complexity |
| Custom event bus | The two existing subjects are narrow and typed; a bus would hide dependencies |
