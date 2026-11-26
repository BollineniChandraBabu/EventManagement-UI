# High-Level Design

## 1. Overview

This document describes the shape of the solution at a level above individual classes: the main
building blocks, the services they use, how requests flow, and which external systems are
involved.

## 2. Building blocks

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Browser (SPA)                                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ Shell: AppComponent                                                    │  │
│  │  sidebar · impersonation banner · notification banner · wish preview   │  │
│  │  <router-outlet> · chat widget · toast/confirm/loading/offline overlays │  │
│  └───────────────┬────────────────────────────────────────────────────────┘  │
│                  │                                                           │
│  ┌───────────────▼────────────────────────────────────────────────────────┐  │
│  │ Feature screens (lazy)                                                 │  │
│  │  auth · dashboard · events · calendar · circles · email-status ·        │  │
│  │  users · account · notifications · schedulers · agents · wish-images ·  │  │
│  │  festival-wish-mappings · seeds · login-locations · violated-users      │  │
│  └───────────────┬────────────────────────────────────────────────────────┘  │
│                  │ injects                                                   │
│  ┌───────────────▼────────────────────────────────────────────────────────┐  │
│  │ Core services                                                          │  │
│  │  ApiService (REST façade)   AuthService    ChatService                 │  │
│  │  CircleService  ThemeService  ConnectivityService  ToastService        │  │
│  │  ConfirmDialogService  LoadingService  ImpersonationService            │  │
│  │  SensitiveDataService  NotificationRealtimeService  LocationService    │  │
│  └───────────────┬────────────────────────────────────────────────────────┘  │
│                  │ HttpClient                                               │
│  ┌───────────────▼────────────────────────────────────────────────────────┐  │
│  │ HTTP pipeline: loadingInterceptor → authInterceptor → backend          │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴───────────────┐
                    │                              │
        ┌───────────▼───────────┐      ┌───────────▼───────────┐
        │ REST API (/api/**)    │      │ STOMP (/ws-chat/…)    │
        └───────────────────────┘      └───────────────────────┘
```

## 3. Services and responsibilities

| Service | Responsibility | State held |
| --- | --- | --- |
| `ApiService` | Single façade over every REST endpoint; normalises responses | none |
| `AuthService` | Sign-in flows, token storage, role, timers, concurrent-login notice | signals: authenticated, role, notice; timers |
| `ChatService` | Chat REST + STOMP, conversations, messages, reactions, presence | socket, current user id, event stream |
| `CircleService` | Circle list, requests, status | none |
| `ThemeService` | Theme catalog, preference, `data-theme` application | catalog, active code, saving code |
| `ConnectivityService` | Online/offline detection with heartbeat probe | online, checking, failure count |
| `ToastService` | Transient notifications | toast list |
| `ConfirmDialogService` | Promise/observable confirmation dialogs | pending request |
| `LoadingService` | Reference-counted global loading state | active request count |
| `ImpersonationService` | "Viewing as" state | impersonated user (sessionStorage) |
| `SensitiveDataService` | Global reveal/hide of personal values | hidden signal |
| `NotificationRealtimeService` | STOMP subscription for published notifications | socket, published stream |
| `LocationService` | Browser GPS then IP geolocation | none |

## 4. Integration points

| Integration | Direction | Purpose | Failure behaviour |
| --- | --- | --- | --- |
| REST API | Outbound | All data operations | Toast + page-level fallback; offline overlay on confirmed connectivity loss |
| STOMP WebSocket | Outbound | Chat events, notifications | Silent degradation; REST fallback on refresh |
| Google Identity Services | Outbound | SSO | Button hidden; password/OTP remain |
| `ipapi.co` | Outbound | Region detection | Guard denies access if GPS also fails |
| Object storage | Outbound (via backend) | Profile picture upload | Error toast |
| CDN (MDB, Font Awesome, Google Fonts, CanvasJS) | Outbound | Styling, icons, charts | Appearance degrades; charts fail visibly |
| Google Maps link | Outbound (new tab) | Show a sign-in location | Browser handles |

## 5. Data flow at a glance

1. **Read:** component calls `ApiService` → `HttpClient` → interceptors add token and loading →
   backend → response normalised (`unwrap`, `normalizePaged`) → component state → template.
2. **Write:** form validation → payload construction (often `FormData` for media) → `ApiService` →
   backend → toast → list reload or navigation.
3. **Real time:** STOMP `MESSAGE` frames parsed by `ChatService`/`NotificationRealtimeService` →
   subject → component subscribers → UI update.
4. **Session:** tokens written on sign-in → interceptor reads them per request → refresh timer
   renews them → logout or notice clears them.

Detailed flows are in [`data-flow.md`](data-flow.md); step-by-step interactions are in
[`sequence-diagrams.md`](sequence-diagrams.md).

## 6. Screen inventory and access

| Screen | Route | Roles | Primary service calls |
| --- | --- | --- | --- |
| Login | `/login` | Guest | `auth/login`, `auth/sso/token`, `auth/sso/google` |
| OTP login | `/otp-login` | Guest | `auth/otp/send`, `auth/otp/verify-login` |
| Forgot password | `/forgot-password` | Guest | `auth/forgot-password` |
| Reset password | `/reset-password`, `/password-reset`, `/` | Guest | `auth/password-reset/confirm` |
| Direct login | `/direct-login` | Guest | `auth/direct-login` |
| Restricted region | `/restricted-region` | Any | none |
| Dashboard | `/dashboard` | User | `dashboard/*` |
| Account | `/account` | User | `users/me`, `users/me/wish-settings`, `users/me/mfa`, `users/me/concurrent-login`, `themes/*`, `auth/change-password` |
| Events | `/events` | User | `events`, `events/filter-values`, `seed/event-types` |
| Event editor | `/events/new`, `/events/:id/edit` | Admin | `events/*`, `users`, `seed/event-types` |
| Calendar | `/calendar` | User | `calendar` |
| Circles | `/circles` | User | `circles/*`, `users/directory` |
| Email status | `/email-status` and typed variants | User / Admin (typed OTP, forgot-password, circle-request) | `emails/status/*`, `email/filter-values` |
| Email preview | `/email-preview` | User (send test: Admin) | `emails/test` |
| Users | `/users`, `/users/new`, `/users/:id/edit` | Admin | `users/*`, `seed/relationships` |
| Login locations | `/login-locations` | Admin | `dashboard/chart/login-locations` |
| Violated users | `/violated-users` | Admin | `dashboard/violated-users` |
| Notifications | `/notifications`, `/notifications/new`, `/notifications/:id/edit` | Admin | `notifications/*` |
| Schedulers | `/schedulers` | Admin | `schedulers`, `schedulers/{name}/trigger` |
| Agents | `/agents` | Admin | `agent/status`, `agent/admin/ask`, `agent/delivery-ops/run` |
| Wish images | `/wish-images` | Admin | `admin/wish-images/*` |
| Festival wishes | `/festival-wish-mappings` | Admin | `festival-wish-mappings/*` |
| Relationship seeds | `/relationship-seeds` (+ editor) | Admin | `seed/relationships` (fallback `/relation-seeds`) |
| Event-type seeds | `/event-type-seeds` (+ editor) | Admin | `seed/event-types` (fallback `/event-types-seeds`) |

## 7. Quality attributes in the design

| Attribute | Design response |
| --- | --- |
| Fast first paint | Lazy routes, idle preloading, deferred third-party JS, on-demand charts |
| Resilience | Defensive normalisation, per-call error handling, offline overlay, session notices |
| Security | Bearer tokens, guards, masking, validated URLs and uploads, safe CSV |
| Usability | Toasts, confirmations, inline validation, persisted preferences |
| Maintainability | Standalone components, pure utility modules with tests, single API façade |
| Accessibility | Semantic buttons, ARIA labels, Escape handling, focus-visible styling |

## 8. Related documents

- [`system-architecture.md`](system-architecture.md)
- [`system-design.md`](system-design.md)
- [`low-level-design.md`](low-level-design.md)
- [`frontend-design.md`](frontend-design.md)
- [`integration-design.md`](integration-design.md)
