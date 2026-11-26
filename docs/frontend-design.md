# Frontend Design

## 1. Framework and toolchain

| Item | Choice |
| --- | --- |
| Framework | Angular 17.3 |
| Language | TypeScript 5.4, `strict` + `strictTemplates` |
| Component style | Standalone components, `inject()` |
| Reactivity | Signals + RxJS |
| Forms | Reactive forms (`FormBuilder.nonNullable`) |
| Styling | Global CSS with design tokens, per-theme overrides, Bootstrap/MDB utility classes, component-scoped CSS |
| UI kit | MDB UI Kit 8.2 (CDN) + Font Awesome 6.5 (CDN); Angular Material 17 used by the email-preview screen only |
| Charts | CanvasJS, injected on first chart render |
| Build | `@angular-devkit/build-angular:application` (esbuild) |
| Tests | Karma + Jasmine |
| Hosting | Firebase Hosting |

## 2. Application structure

```
src/
├── main.ts                     bootstrapApplication + providers
├── index.html                  metadata, CDN links, preconnects
├── styles.css                  design tokens, global layout, components
├── themes.css                  11 theme overrides keyed by [data-theme]
├── test.ts                     Karma test environment
├── environments/
│   ├── environment.ts          dev: apiUrl
│   └── environment.prod.ts     prod: apiUrl, googleClientId
└── app/
    ├── app.component.{ts,html,css}   shell
    ├── app.routes.ts                 route table
    ├── core/
    │   ├── constants/roles.constants.ts
    │   ├── guards/                  5 guards (+ specs)
    │   ├── interceptors/            auth, loading (+ specs)
    │   ├── models/                  api, auth, chat, circle
    │   ├── pipes/                   sensitive-email, sensitive-value
    │   ├── services/                13 singleton services (+ specs)
    │   ├── strategies/              idle preloading
    │   └── utils/                   media, api-error, csv, schedule, wishes-url, circle-chat
    ├── features/                    21 feature folders
    └── shared/                      reusable UI + bulk-selection helper
```

## 3. Design principles

1. **The backend owns truth.** The client never assumes its cached state is authoritative; lists
   reload after writes.
2. **Explicit dependencies.** Standalone imports and `inject()` make every dependency visible.
3. **Pure logic is separated.** Date maths, validation, formatting and CSV live in `*.utils.ts`
   with unit tests; components orchestrate.
4. **One façade for HTTP.** `ApiService` centralises URLs, parameters, multipart bodies and
   normalisation.
5. **Fail visibly.** Every failure produces a toast, inline message or overlay — never silence.
6. **Protect the first paint.** Lazy routes, idle preloading, deferred third-party scripts and
   on-demand charts.
7. **Defensive rendering.** Optional fields are normalised; missing data renders as `—` or a
   placeholder, not an error.
8. **Reversible choices.** Preferences (theme, calendar view) persist; destructive actions confirm.

## 4. Component conventions

| Convention | Detail |
| --- | --- |
| Selector | `app-<name>` (kebab-case) |
| File naming | `name.component.ts/html/css`, `name.service.ts`, `name.utils.ts`, `name.models.ts` |
| State | Private fields; signals where the template reads shared state |
| Subscriptions | `takeUntilDestroyed(this.destroyRef)` |
| Change detection | Default strategy (OnPush not yet adopted consistently) |
| Templates | Control flow with `*ngIf`/`*ngFor`; `@if`/`@for` not yet used |
| Inputs | `@Input()` with sensible defaults; `@Input({required:true})` where mandatory |
| Outputs | `@Output()` `EventEmitter<T>` |
| Accessibility | `aria-label` on icon-only buttons; `role="dialog"`/`aria-modal` on overlays |

## 5. Services and dependency injection

All services are `providedIn: 'root'` singletons. There are no feature-scoped providers, so state
such as the theme or the loading counter is application-wide.

| Service | Type of state |
| --- | --- |
| `AuthService` | Session, role, notice, timers |
| `ThemeService` | Catalog, active theme |
| `LoadingService` | Reference count |
| `ToastService` | Toast list |
| `SensitiveDataService` | Reveal flag |
| `ImpersonationService` | Impersonated user |
| `ConnectivityService` | Online/offline + failure count |
| `ChatService` | Socket, current user, event stream |
| `NotificationRealtimeService` | Socket, published stream |
| `ApiService`, `CircleService`, `LocationService`, `ConfirmDialogService` | Stateless (or transient) |

## 6. Styling architecture

- `styles.css` defines the token set: colours (`--c-*`), surfaces, text, borders, semantic colours,
  shadows, radii, transitions, typography and theming hooks (`--page-bg-image`, `--card-radius`,
  `--nav-bg`, `--nav-accent`, `--nav-accent-fg`, `--nav-panel-bg`, `--modal-bg`, …).
- `themes.css` overrides those tokens per `html[data-theme='<code>']` and adds a few structural
  tweaks (e.g. glassmorphism's translucent nav).
- Component CSS uses the tokens, so every theme applies without component changes.
- Utility classes come from MDB/Bootstrap (`d-flex`, `mb-3`, `container`, `row`, `col-*`).

**Rule for new themes:** a theme with a translucent `--nav-bg` must set a near-opaque
`--nav-panel-bg`, otherwise page content shows through the mobile nav panel. Active/hover nav icons
must use a glyph colour that contrasts with that theme's `--nav-accent`.

## 7. Error and loading strategy

- A single `loadingInterceptor` drives one overlay, excluding chat, agent and email-image requests.
- `apiErrorMessage(error, fallback)` chooses between the backend message, a 429 message and a
  concurrent-login message.
- Each page supplies a contextual fallback ("Unable to load events right now.").
- Connectivity failures escalate to a full-screen notice only after a confirming probe.

## 8. Performance strategy

| Technique | Effect |
| --- | --- |
| Lazy `loadComponent` per route | Small initial bundle |
| Idle preloading | Warm routes without competing with the first paint |
| `outputHashing: "all"` | Immutable long-term caching |
| Deferred MDB script | Removes a blocking script |
| Font Awesome preload swap | Removes render-blocking CSS |
| CanvasJS on demand | No chart library on non-chart pages |
| On-demand email images | Avoids large base64 payloads in lists |
| Debounced search | Fewer API calls |
| Server-side pagination | Bounded payloads |
| Zone event coalescing | Fewer change-detection cycles |

## 9. Known deviations and debt

| Item | Note |
| --- | --- |
| `ChangeDetectionStrategy.OnPush` not used | More change detection than necessary |
| `@if`/`@for` not used | Older structural directives still in templates |
| Angular Material used in one screen | Two styling systems coexist |
| `ApiService` is very large | Candidate for splitting |
| Unrouted placeholder components (`templates`, `ai-wishes`, `change-password`) | Dead code |
| No lint configuration | Style relies on review |
| No `karma.conf.js` | `ng test` cannot run as configured |

## 10. Related documents

- [`ui-ux-design.md`](ui-ux-design.md)
- [`component-documentation.md`](component-documentation.md)
- [`routing-and-navigation.md`](routing-and-navigation.md)
- [`state-management.md`](state-management.md)
- [`coding-standards.md`](coding-standards.md)
