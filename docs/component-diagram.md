# Component Diagram

## 1. Purpose

Shows the major components of the Angular client, their dependencies, and the backend
boundaries they talk to. Arrows mean "depends on / calls".

## 2. Application-level components

```
                         ┌───────────────────────────────┐
                         │          main.ts              │
                         │ bootstrapApplication          │
                         │ providers: router, HTTP,      │
                         │ interceptors, animations      │
                         └───────────────┬───────────────┘
                                         │
                         ┌───────────────▼───────────────┐
                         │        AppComponent           │
                         │ shell · sidebar · banners     │
                         │ overlays · chat widget        │
                         └───┬───────┬───────┬───────┬───┘
                             │       │       │       │
              ┌──────────────▼┐ ┌────▼─────┐ │ ┌─────▼──────────────┐
              │ RouterOutlet  │ │ Chat     │ │ │ Global overlays    │
              │ (lazy pages)  │ │ Widget   │ │ │ toast · confirm ·  │
              └──────┬────────┘ └────┬─────┘ │ │ loading · offline ·│
                     │               │       │ │ concurrent login   │
                     │               │       │ └────────────────────┘
                     ▼               ▼       ▼
              ┌──────────────────────────────────────────────┐
              │              Core services                   │
              └──────────────────────────────────────────────┘
```

## 3. Feature components and their dependencies

| Feature component | Depends on (services) | Depends on (shared/components) |
| --- | --- | --- |
| `LoginComponent` | `AuthService`, `ToastService`, `LocationService` | — |
| `OtpLoginComponent` | `AuthService`, `ToastService` | — |
| `ForgotPasswordComponent` | `AuthService`, `ToastService` | — |
| `ResetPasswordComponent` | `AuthService`, `ToastService` | — |
| `DirectLoginComponent` | `AuthService`, `LocationService`, `ToastService` | — |
| `RestrictedRegionComponent` | — | — |
| `DashboardComponent` | `ApiService`, `AuthService` | `CanvasJsLineChartComponent` |
| `AccountManagementComponent` | `ApiService`, `AuthService`, `ThemeService`, `SensitiveDataService`, `ImpersonationService`, `ToastService`, `ConfirmDialogService` | `SensitiveInfoToggleComponent` |
| `EventsComponent` | `ApiService`, `AuthService`, `ToastService`, `ConfirmDialogService` | `MultiSelectFilterComponent`, `BulkSelection` |
| `EventEditorComponent` | `ApiService`, `ToastService` | `SensitiveEmailPipe`, `SensitiveInfoToggleComponent` |
| `CalendarComponent` | `ApiService` | `FestivalWishesPanelComponent` |
| `FestivalWishesPanelComponent` | `ApiService`, `AuthService`, `ToastService`, `ConfirmDialogService` | — |
| `CirclesComponent` | `ApiService`, `CircleService`, `ToastService`, `ConfirmDialogService` | `SensitiveEmailPipe` |
| `ChatWidgetComponent` | `ChatService`, `CircleService`, `AuthService`, `ApiService`, `ToastService`, `ConfirmDialogService` | `circle-chat` helpers |
| `EmailStatusComponent` | `ApiService`, `AuthService`, `ToastService`, `ConfirmDialogService` | `SensitiveEmailPipe`, `SensitiveInfoToggleComponent`, `MultiSelectFilterComponent`, `BulkSelection` |
| `EmailPreviewComponent` | `ApiService`, `AuthService` | Angular Material card/button |
| `UsersComponent` | `ApiService`, `AuthService`, `ToastService`, `ConfirmDialogService`, `ImpersonationService` | `MultiSelectFilterComponent`, `BulkSelection` |
| `UserEditorComponent` | `ApiService`, `ToastService` | — |
| `LoginLocationsComponent` | `ApiService`, `SensitiveDataService` | `SensitiveEmailPipe`, `SensitiveInfoToggleComponent`, `MultiSelectFilterComponent` |
| `ViolatedUsersComponent` | `ApiService`, `SensitiveDataService` | `SensitiveEmailPipe`, `SensitiveInfoToggleComponent` |
| `NotificationsComponent` | `ApiService`, `ToastService`, `ConfirmDialogService` | `MultiSelectFilterComponent`, `BulkSelection` |
| `NotificationEditorComponent` | `ApiService`, `ToastService` | — |
| `SchedulersComponent` | `ApiService`, `ToastService` | — |
| `AgentsComponent` | `ApiService`, `ToastService` | `CopilotChatComponent` |
| `CopilotChatComponent` | `ApiService` | — |
| `WishImagesComponent` | `ApiService`, `ToastService`, `ConfirmDialogService` | `SensitiveEmailPipe`, `SensitiveInfoToggleComponent`, `MultiSelectFilterComponent`, `BulkSelection` |
| `FestivalWishMappingsComponent` | `ApiService`, `ToastService`, `ConfirmDialogService` | `SensitiveEmailPipe`, `MultiSelectFilterComponent`, `BulkSelection` |
| `RelationshipSeedsComponent` | `ApiService`, `ToastService`, `ConfirmDialogService` | `MultiSelectFilterComponent`, `BulkSelection` |
| `EventTypeSeedsComponent` | `ApiService`, `ToastService`, `ConfirmDialogService` | `MultiSelectFilterComponent`, `BulkSelection` |

## 4. Shared components

| Component | Kind | Inputs | Outputs / behaviour |
| --- | --- | --- | --- |
| `MultiSelectFilterComponent` | Reusable filter | `label`, `icon`, `searchPlaceholder`, `searchable`, `disabled`, `emptyText`, `options`, `selected` | `applied(values)` |
| `SensitiveInfoToggleComponent` | Toggle | — | Flips `SensitiveDataService.hidden` |
| `ToastContainerComponent` | Global | — | Renders `ToastService.toasts`; auto-dismiss |
| `ConfirmDialogComponent` | Global | — | Renders the pending confirmation from `ConfirmDialogService` |
| `LoadingOverlayComponent` | Global | — | Shows while `LoadingService.loading()` |
| `OfflineOverlayComponent` | Global | — | Shows while offline; retry; "back online" transition |
| `ConcurrentLoginOverlayComponent` | Global | — | Shows while `AuthService.concurrentLoginNotice()` is set |
| `ChatWidgetComponent` | Feature-sized shared | — | Full chat UI; uses `ChatService` and circle gating |
| `CanvasJsLineChartComponent` | Chart | series data | Renders with CanvasJS loaded on demand |
| `CopilotChatComponent` | Chat | `enabled` | Asks `agent/admin/ask` |
| `FestivalWishesPanelComponent` | Embedded panel | `festivalId`, `festivalName` | Loads and edits mappings |

## 5. Service dependency graph

```
AppComponent ──▶ AuthService ──▶ HttpClient
     │               ▲   ▲
     │               │   └── ImpersonationService
     ├──▶ ThemeService ──▶ ApiService ──▶ HttpClient
     ├──▶ ToastService
     ├──▶ NotificationRealtimeService ──▶ WebSocket
     ├──▶ ChatWidgetComponent ──▶ ChatService ──▶ HttpClient + WebSocket
     │                              └──▶ AuthService
     ├──▶ OfflineOverlayComponent ──▶ ConnectivityService
     └──▶ ConcurrentLoginOverlayComponent ──▶ AuthService

AuthInterceptor ──▶ AuthService, ConnectivityService
LoadingInterceptor ──▶ LoadingService
Guards ──▶ AuthService, LocationService, Router
```

Notes:

- `ApiService`, `AuthService`, `ChatService` and the other services are `providedIn: 'root'`
  singletons.
- `AuthService` and `ConnectivityService` are injected inside interceptors through
  `inject()`, which is valid because interceptors run in an injection context.
- `ChatService` depends on `AuthService` only to resolve the current user id.

## 6. Backend boundary

| Client component | Backend area |
| --- | --- |
| Auth pages, `AuthService` | `/api/auth/**` |
| Account page | `/api/users/me/**`, `/api/themes/**` |
| Users pages | `/api/users/**`, `/api/seed/relationships` |
| Events pages | `/api/events/**`, `/api/seed/event-types` |
| Calendar | `/api/calendar`, `/api/festivals`, `/api/seed/special-events` |
| Festival wishes | `/api/festival-wish-mappings/**` |
| Circles | `/api/circles/**` |
| Chat widget | `/api/chat/**`, `/ws-chat/websocket` |
| Email status | `/api/emails/**`, `/api/email/filter-values` |
| Notifications | `/api/notifications/**`, topic `/topic/notifications` |
| Schedulers | `/api/schedulers/**` |
| Agents | `/api/agent/**` |
| Wish images | `/api/admin/wish-images/**` |
| Seeds | `/api/seed/**` with legacy fallbacks |
| Dashboard, security analytics | `/api/dashboard/**` |

## 7. Dependency rules

1. **Features never call `HttpClient` directly.** All HTTP goes through `ApiService`,
   `AuthService`, `ChatService` or `CircleService`.
2. **Shared components never inject feature services.** They receive inputs and emit outputs.
3. **Pure logic lives in `*.utils.ts`** and is unit-tested without Angular.
4. **Models live in `core/models`** and are imported by services and components, never the reverse.
5. **Guards and interceptors depend on services, not components.**

Violations of these rules are defects to be raised in review. The current codebase respects
them with one exception: `CopilotChatComponent` injects `ApiService` directly (it is a shared
component with its own data need), which is acceptable but worth noting.
