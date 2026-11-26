# System Architecture

## 1. Architectural style

Golden Greetings is a **client-rendered single-page application** backed by a **stateless REST
API**. The browser holds the presentation, navigation, session tokens and client-side rules; the
backend holds all data, authorisation, scheduling, mail delivery and AI integration.

| Characteristic | Choice |
| --- | --- |
| Rendering | Client-side only (no SSR/prerender) |
| Component model | Angular 17 standalone components (no NgModules) |
| State | Signals for shared/synchronous state, RxJS observables for async streams |
| Communication | HTTPS JSON REST + STOMP over WebSocket |
| Authentication | JWT access + refresh tokens held in browser storage |
| Deployment | Static bundle on Firebase Hosting CDN |
| Backend | Spring Boot service (separate repository) |
| Data store | Relational database behind JPA (backend) |

## 2. Context diagram

```
        ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  Guest   │   │   User   │   │  Admin   │   │  Support │
        └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
             │              │              │              │
             └──────────────┴──────┬───────┴──────────────┘
                                   │  HTTPS
                        ┌──────────▼───────────┐
                        │  Golden Greetings    │
                        │  Angular 17 SPA      │
                        │  (Firebase Hosting)  │
                        └──┬────────┬───────┬──┘
                           │        │       │
          REST + WebSocket │        │       │  CDN assets
                           │        │       │
             ┌─────────────▼──┐  ┌──▼─────┐ │ ┌──────────────────┐
             │ Spring Boot API│  │ipapi.co│ └─▶ MDB, Font Awesome│
             │  /api/**       │  │ (geo)  │   │ Google Fonts,     │
             │  /ws-chat/**   │  └────────┘   │ CanvasJS, Google  │
             └──┬────┬────┬───┘               │ Identity Services │
                │    │    │                   └──────────────────┘
        ┌───────▼┐ ┌─▼────┐ ┌▼──────────────┐
        │Database│ │ SMTP │ │ Object storage│
        └────────┘ └──────┘ └───────────────┘
```

## 3. Major components

### 3.1 Front-end layers

| Layer | Responsibility | Key artefacts |
| --- | --- | --- |
| Bootstrap | Start the app, register providers (router, HTTP, interceptors, animations, zone coalescing) | `main.ts` |
| Shell | Layout, navigation, banners, global overlays, chat widget, wish preview | `app.component.ts/html` |
| Routing | Lazy route table, guards, idle preloading | `app.routes.ts`, `core/guards`, `core/strategies` |
| Feature screens | One folder per screen; page-level state and orchestration | `features/**` |
| Shared UI | Reusable presentational components and helpers | `shared/**` |
| Core services | API access, auth, chat, circles, theme, connectivity, toasts, dialogs, impersonation, loading | `core/services/**` |
| Cross-cutting | Interceptors, pipes, guards, pure utilities | `core/interceptors`, `core/pipes`, `core/utils` |
| Contracts | TypeScript models mirroring the backend | `core/models/**` |

### 3.2 Backend surfaces consumed

| Surface | Purpose |
| --- | --- |
| `/auth/**` | Login, SSO, OTP, direct login, refresh, password reset/change, impersonation switch-back |
| `/users/**` | Users, directory, profile, wish settings, MFA, concurrent login, profile picture |
| `/events/**`, `/festivals/**`, `/seed/special-events` | Event and festival data |
| `/calendar` | Calendar entries for a month/year |
| `/festival-wish-mappings/**` | Festival wish mappings and summary |
| `/circles/**` | Circle list, requests, status |
| `/chat/**` | Conversations, messages, attachments, reactions, presence |
| `/emails/**` | Delivery log, image, retry, delete, test |
| `/notifications/**` | Announcements and publish state |
| `/schedulers/**` | Job list and manual trigger |
| `/agent/**` | Agent status, admin copilot, delivery-ops run |
| `/themes/**` | Theme catalog and preference |
| `/seed/**`, `/relation-seeds`, `/event-types-seeds` | Reference data |
| `/admin/wish-images/**` | Greeting image library |
| `/dashboard/**` | KPIs, charts, login locations, violated users |
| `/ws-chat/websocket` | STOMP: chat events and notification topics |

## 4. Runtime topology

```
Browser
 ├── Angular app (static bundle, cached by CDN)
 ├── localStorage  : fw_access_token, fw_refresh_token, fw_role, fw_theme, fw_sso_token
 ├── sessionStorage: tokens when "remember me" is off, fw_impersonation,
 │                   fw_wish_preview_seen_token, fw_published_notification_dismissed_id
 └── Network
      ├── REST → API origin
      ├── WS   → API origin (STOMP)
      └── CDN  → fonts, icons, MDB, CanvasJS, Google Identity

Firebase Hosting (CDN)
 └── index.html + hashed JS/CSS chunks (immutable, 1 year)

Backend host (Render/other)
 ├── REST controllers + services
 ├── Schedulers (birthday, festival, unread-chat, etc.)
 ├── Mail sender + delivery log
 ├── STOMP broker
 └── Database + object storage + AI providers
```

## 5. Key architectural decisions (summary)

| Decision | Rationale | ADR |
| --- | --- | --- |
| Standalone components, no NgModules | Smaller mental model, better tree-shaking, Angular 17 idiom | ADR-001 |
| Signals + RxJS hybrid | Signals for synchronous shared state; RxJS for streams and HTTP | ADR-002 |
| Functional HTTP interceptors | Ordering and composition without classes | ADR-003 |
| Tokens in browser storage | Stateless API, no cookie/CSRF surface; accepted XSS trade-off | ADR-004 |
| Idle route preloading | Protect LCP on slow connections | ADR-005 |
| Client-side location guard | Cheap region gate before the API; server enforcement recommended | ADR-006 |
| No SSR | Firebase static hosting; app is behind auth so SEO is irrelevant | ADR-007 |
| Defensive response normalisation | Backend returns arrays, paged objects or `{data}` wrappers | ADR-008 |
| Firebase Hosting deployment | Static CDN, PR previews, simple rollback | ADR-009 |

## 6. Cross-cutting concerns

| Concern | Mechanism |
| --- | --- |
| Authentication | `authInterceptor` adds the bearer token, refreshes once on 401, signs out on 403 |
| Session integrity | `AuthService` timers (pre-expiry refresh, hard expiry) and the concurrent-login notice |
| Authorisation (UI) | `authGuard`, `adminGuard`, `guestGuard`, `locationAccessGuard`, `resetLinkGuard`; `isAdmin` hides admin sections |
| Loading feedback | `loadingInterceptor` + `LoadingService` + `LoadingOverlayComponent` (excludes chat/agent/image) |
| Errors | `apiErrorMessage`, `backendMessage`, toasts, per-page fallback messages |
| Connectivity | `ConnectivityService` heartbeat + `OfflineOverlayComponent` |
| Personal data | `SensitiveDataService` + impure masking pipes + reveal toggle |
| Theming | `ThemeService` writes `data-theme`; `themes.css` maps tokens |
| Performance | Budgets, lazy routes, idle preload, deferred third-party scripts |
| Validation | Reactive forms + pure validators (`wishesUrlValidator`, media rules, schedule rules) |

## 7. Boundaries and responsibilities

**The front end owns**

- Presentation, layout, responsive behaviour and theming.
- Navigation and route-level access decisions for user experience.
- Session token storage, refresh scheduling and sign-out.
- Client-side validation that mirrors backend rules (so users get fast, specific feedback).
- Real-time rendering of chat and notification events.
- Defensive normalisation of backend responses.

**The front end does not own**

- Authorisation decisions that matter for security.
- Data persistence, uniqueness, referential integrity.
- Scheduling, mail delivery, retries at the transport level.
- AI prompting and provider selection.
- Audit logging of business actions.

## 8. Constraints that shape the architecture

1. **Separate backend ownership** → the client must be tolerant of response shape variance and
   optional fields.
2. **Static hosting only** → no server-side secrets, no server-side redirects; the SPA router uses
   the hosting rewrite to `index.html`.
3. **Region restriction** → a guard must run before any protected route, and it must degrade safely
   if geolocation fails.
4. **Personal data on screen** → masking must be the default in admin screens.
5. **Large admin datasets** → every list is server-paginated and filterable server-side.

## 9. Known architectural weaknesses

| Weakness | Consequence | Mitigation |
| --- | --- | --- |
| Client-only geo restriction | Bypassable | Add edge/server enforcement |
| Tokens in web storage | XSS impact | CSP, dependency review, short lifetimes |
| No client error telemetry | Blind to production faults | Add an error-reporting service |
| Mixed styling systems (MDB/Bootstrap + Angular Material) | Inconsistent component behaviour | Standardise on one system over time |
| No automated E2E suite | Flow regressions | Add Playwright/Cypress |
| Some unrouted placeholder components | Dead code and confusion | Remove or finish |

## 10. Related documents

- Detailed design: [`system-design.md`](system-design.md)
- Components: [`component-diagram.md`](component-diagram.md)
- Data movement: [`data-flow.md`](data-flow.md)
- Interactions: [`sequence-diagrams.md`](sequence-diagrams.md)
- Deployment: [`deployment-architecture.md`](deployment-architecture.md)
- Integrations: [`integration-design.md`](integration-design.md)
