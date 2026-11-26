# Component Documentation

Reusable and significant components, their responsibilities, inputs, outputs and behaviour.
Page-level components are documented in [`functional-requirements.md`](functional-requirements.md)
and [`low-level-design.md`](low-level-design.md); this document focuses on the components that are
shared, embedded or independently meaningful.

---

## Shared components

### `MultiSelectFilterComponent`

`shared/multi-select-filter.component.ts`

A funnel button that opens a searchable checkbox list. The parent owns the selection.

| Input | Type | Default | Purpose |
| --- | --- | --- | --- |
| `label` | `string` | `'Filter'` | Button label / accessible name |
| `icon` | `string` | `'fa-solid fa-filter'` | Leading icon |
| `searchPlaceholder` | `string` | `'Search…'` | Search box hint |
| `searchable` | `boolean` | `true` | Show the search box |
| `disabled` | `boolean` | `false` | Disable the control |
| `emptyText` | `string` | `'No options'` | Message when there are no options |
| `options` | `MultiSelectOption[]` | `[]` | `{value, label, hint?}` |
| `selected` | `string[]` | `[]` | Current selection (setter) |

| Output | Payload | When |
| --- | --- | --- |
| `applied` | `string[]` | The user presses Apply |

**Behaviour:** keeps a draft selection while open; Apply commits and emits; outside click and
Escape close without applying; "select all" toggles only the filtered options; the badge shows the
number of active filters.

### `SensitiveInfoToggleComponent`

`shared/sensitive-info-toggle.component.ts`

Toggles `SensitiveDataService.hidden`. Every masked value on the screen updates because the masking
pipes are impure and read the same signal.

No inputs or outputs. Renders a labelled button with an eye icon.

### `ToastContainerComponent`

`shared/toast-container.component.ts`

Renders `ToastService.toasts` in a fixed region. Each toast has a level (`success`, `error`,
`info`, `warning`), a message and a duration (default 5 s), and can be dismissed manually. Toasts
stack and auto-dismiss.

### `ConfirmDialogComponent` and `ConfirmDialogService`

`shared/confirm-dialog.component.*`, `core/services/confirm-dialog.service.ts`

The service exposes:

```ts
confirm(options: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'primary' | 'danger';
  icon?: string;
}): Observable<boolean>

confirmDelete(options: { itemLabel: string; detail?: string }): Observable<boolean>
```

The component renders the pending request with a focus trap and returns `true` only on confirm.
Callers pipe through `filter(Boolean)`.

### `LoadingOverlayComponent`

`shared/loading-overlay.component.ts`

Shows while `LoadingService.loading()` is true (reference-counted by `loadingInterceptor`).
Includes a short delay/threshold so fast requests do not flash the overlay.

### `OfflineOverlayComponent`

`shared/offline-overlay.component.ts`

Full-screen notice while `ConnectivityService.online()` is false. Two states:

1. **Offline:** icon, explanation, animated dots, "Retry now" (disabled while checking).
2. **Restored:** "You're back online" with a progress bar, auto-dismissed so the user stays on the
   same route.

It owns no polling; `ConnectivityService` does.

### `ConcurrentLoginOverlayComponent`

`shared/concurrent-login-overlay.component.ts`

Full-screen blocking notice while `AuthService.concurrentLoginNotice()` is non-null. Explains that
only one session is allowed and offers "Sign out & sign in again" (calls `logout()`). It does not
navigate on its own, so the explanation cannot be missed.

### `CanvasJsLineChartComponent`

`features/dashboard/canvasjs-line-chart.component.ts`

| Input | Purpose |
| --- | --- |
| series data (array of `{name, series:[{name,value}]}`) | Sent and failed series |

Loads `canvasjs.min.js` once on first render, then creates the chart. Destroys the chart on
component destruction. A page without this component never downloads CanvasJS.

### `CopilotChatComponent`

`features/agents/copilot-chat.component.ts`

| Input | Type | Default | Purpose |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | When false, the transcript is visible but the composer is locked |

Renders a transcript, four suggested questions, a 500-character composer and error turns. Sends
`POST /agent/admin/ask` and scrolls to the newest turn.

---

## Embedded feature components

### `FestivalWishesPanelComponent`

`features/calendar/festival-wishes-panel.component.ts`

| Input | Type | Required | Purpose |
| --- | --- | --- | --- |
| `festivalId` | `number` | yes | Festival whose mappings are shown |
| `festivalName` | `string` | no | Heading text |

**Behaviour**

- Reloads when `festivalId` changes; resets the editor and the new-user selection.
- Admins: load users, link one or many, edit note (≤ 500), wishes link, image and active state,
  toggle, remove.
- Non-admins: load their own mapping via `GET /festival-wish-mappings/me` and render read-only.
- Shows last-sent information and a failed marker.

### `ChatWidgetComponent`

`shared/chat-widget/chat-widget.component.ts` (~1 416 lines)

The largest component. Responsibilities:

| Area | Details |
| --- | --- |
| Visibility | Floating bubble; opens a panel; closes on outside click and Escape |
| Conversations | List with unread counts, search, new-chat picker (circle members only when restricted) |
| Thread | Paged history, scroll-to-bottom, load older on scroll, jump to a replied message |
| Composer | Text, single attachment (≤ 50 MB), reply context, edit mode, emoji picker |
| Message actions | Reply, edit (own), delete (own), multi-select delete, react, star/pin, copy |
| Search | In-thread search with match highlighting |
| Presence | Online/last seen, typing indicator, seen receipts |
| Circle gate | Locks the composer and hides non-members with an explanation |
| Attachments | Inline image preview, download for other types |

It depends on `ChatService`, `CircleService`, `AuthService`, `ApiService`, `ToastService`,
`ConfirmDialogService` and the `circle-chat` helpers.

---

## Feature page components (summary)

| Component | Route | Responsibility | Key services |
| --- | --- | --- | --- |
| `LoginComponent` | `/login` | Password + Google SSO + MFA hand-off | `AuthService`, `LocationService` |
| `OtpLoginComponent` | `/otp-login` | Send/verify OTP, MFA continuation | `AuthService` |
| `ForgotPasswordComponent` | `/forgot-password` | Request reset link | `AuthService` |
| `ResetPasswordComponent` | `/reset-password` | Set a new password | `AuthService` |
| `DirectLoginComponent` | `/direct-login` | Exchange a one-time token | `AuthService`, `LocationService` |
| `RestrictedRegionComponent` | `/restricted-region` | Explain the region restriction | — |
| `DashboardComponent` | `/dashboard` | KPIs, flow cards, charts, date range | `ApiService` |
| `AccountManagementComponent` | `/account` | Profile, wishes, security, theme, password, picture | `ApiService`, `AuthService`, `ThemeService` |
| `EventsComponent` | `/events` | List, filter, bulk delete, media lightbox | `ApiService` |
| `EventEditorComponent` | `/events/new`, `/events/:id/edit` | Create/edit with media | `ApiService` |
| `CalendarComponent` | `/calendar` | Views, navigation, exports, festival panel | `ApiService` |
| `CirclesComponent` | `/circles` | Members, requests, directory search | `CircleService`, `ApiService` |
| `EmailStatusComponent` | `/email-status*` | Delivery log, preview, retry, delete | `ApiService` |
| `EmailPreviewComponent` | `/email-preview` | Desktop/mobile HTML preview, test send | `ApiService` |
| `UsersComponent` | `/users` | List, filters, status, impersonation | `ApiService` |
| `UserEditorComponent` | `/users/new`, `/users/:id/edit` | Create/edit a user | `ApiService` |
| `LoginLocationsComponent` | `/login-locations` | Sign-in analytics, map links, CSV | `ApiService` |
| `ViolatedUsersComponent` | `/violated-users` | Failed sign-in analytics, CSV | `ApiService` |
| `NotificationsComponent` | `/notifications` | List, publish/unpublish, delete | `ApiService` |
| `NotificationEditorComponent` | `/notifications/new`, `/:id/edit` | Draft and schedule | `ApiService` |
| `SchedulersComponent` | `/schedulers` | Job list, manual trigger | `ApiService` |
| `AgentsComponent` | `/agents` | Status, delivery-ops run | `ApiService` |
| `WishImagesComponent` | `/wish-images` | Image library CRUD | `ApiService` |
| `FestivalWishMappingsComponent` | `/festival-wish-mappings` | Mappings list, bulk link, summary | `ApiService` |
| `RelationshipSeedsComponent` | `/relationship-seeds` | Seed CRUD | `ApiService` |
| `EventTypeSeedsComponent` | `/event-type-seeds` | Seed CRUD | `ApiService` |

## Non-routed components

| Component | Status | Note |
| --- | --- | --- |
| `TemplateEditorComponent` | Not routed, empty class | `GrapesJS` dependency is unused |
| `AiWishesComponent` | Not routed | Would generate a wish via `aiWish` |
| `ChangePasswordComponent` | Not routed, empty class | Password change is on the account page |

## Component authoring checklist

- [ ] `standalone: true` with explicit imports
- [ ] `inject()` for dependencies
- [ ] `takeUntilDestroyed(this.destroyRef)` on subscriptions
- [ ] Inputs validated or defaulted; no `undefined` in templates
- [ ] Outputs typed
- [ ] Loading, empty and error states rendered
- [ ] Icon-only buttons have `aria-label`
- [ ] Destructive actions confirm
- [ ] Object URLs revoked on destroy
- [ ] No direct `HttpClient` use
