# AGENTS.md

Repository notes for automated agents working on the EventManagement UI (Angular 17).

## Commands

- Install: `npm install`
- Dev server: `npx ng serve --host 0.0.0.0 --port 12000 --allowed-hosts all`
- Build: `npx ng build`
- Backend API base URL: `src/environments/environment.ts` (`environment.apiUrl`)

## Theming

- Themes are driven by a `data-theme` attribute on `<html>`; `src/themes.css` maps each theme code
  to design tokens. `src/styles.css` holds the `:root` tokens (the `default` look).
- `ThemeService` (`src/app/core/services/theme.service.ts`) loads the catalog and the signed-in
  user's preference, and falls back to a built-in catalog if the API is unavailable.
- Theme codes must stay in sync with the backend `UITheme` enum (see the backend repo).
- The mobile slide-down menu uses `--nav-panel-bg` / `--nav-panel-blur`, not `--nav-bg`. Themes
  whose `--nav-bg` is translucent (glassmorphism, liquid-glass, spatial-ui) must override
  `--nav-panel-bg` with a near-opaque colour, otherwise page content shows through behind the nav
  icons and they become unreadable.
- Active/hover nav icons paint `--nav-accent-fg` on a solid `--nav-accent` chip. Pick the glyph
  colour that contrasts with each theme's `--nav-accent` (dark glyphs for light accents such as
  maximalism/brutalism/claymorphism/bento-grid, white glyphs for the darker accents such as
  minimalism/glassmorphism/neomorphism).

## Offline handling

- `ConnectivityService` tracks `navigator.onLine` plus the `online`/`offline` events, and confirms
  recovery with a same-origin `HEAD` probe.
- `OfflineOverlayComponent` renders a full-screen notice, then a short "You're back online" state
  that auto-dismisses so the user stays on the same route.
- The HTTP interceptor only marks the app offline for status `0` responses when `navigator.onLine`
  is already `false`. Without that guard, a blocked third-party request (e.g. `ipapi.co`) makes a
  fully online app show the offline screen.

## Gotchas

- **Signal writes inside `effect()` throw NG0600.** Angular 17 does not allow writing signals in an
  effect unless `allowSignalWrites` is set. Loading data from an effect typically writes signals
  (and HTTP triggers the loading interceptor, which also writes a signal). Defer the work with
  `queueMicrotask(...)` inside the effect instead of enabling `allowSignalWrites` globally.
- The location guard restricts access to India/AP/Telangana. When testing locally from another
  region, temporarily bypass it and restore it before committing.
