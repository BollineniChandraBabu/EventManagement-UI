# ADR-005: Idle route preloading

- **Status:** Accepted
- **Date:** 2025 (Lighthouse performance work)
- **Deciders:** Front-end team

## Context

Lighthouse audits showed a poor Largest Contentful Paint on mobile. The app used
`PreloadAllModules`, which downloads every lazy chunk immediately after the initial route starts.
On a slow connection that competes with the initial route's own chunk and roughly doubles LCP.

## Decision

Replace `PreloadAllModules` with `IdlePreloadingStrategy`:

- Preload each eligible route only when the browser is idle (`requestIdleCallback`, 3 s timeout).
- Fall back to a 2 s `setTimeout` where `requestIdleCallback` is unavailable.
- Honour `route.data.preload === false` to opt a route out.

## Consequences

**Positive**

- The first route's chunk gets the bandwidth, improving FCP and LCP.
- Other routes are still warm by the time the user navigates.
- Per-route opt-out is available for heavy screens.

**Negative**

- Navigation to an unpreloaded route may show a brief loading state on slow connections.
- Idle callbacks can be delayed on busy pages, so preloading may happen later than expected.
- No route currently opts out, so the opt-out path is untested.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| `PreloadAllModules` | Competes with the initial route; hurt LCP |
| No preloading | Slower subsequent navigation |
| Time-based preload after N seconds | Less adaptive than the idle callback |
