# ADR-007: No server-side rendering

- **Status:** Accepted
- **Date:** 2024

## Context

Angular supports SSR and prerendering. The app is almost entirely behind authentication; the only
public pages are sign-in, OTP, password reset, direct login and the restricted-region notice.
Hosting is Firebase Hosting, which supports server rendering through frameworks backends but adds
runtime cost and complexity.

## Decision

Ship a browser-only SPA. `index.html` carries static metadata (title, description, theme colour,
icons) for crawlers and link previews; everything else renders in the browser.

## Consequences

**Positive**

- Simplest possible deployment: static files on a CDN.
- No Node server to operate, monitor or scale.
- No SSR-specific bugs (hydration mismatches, `window` guards everywhere).
- Fast TTFB from the CDN.

**Negative**

- No per-route SEO or social preview; acceptable because content is private.
- The first paint depends on downloading and executing JS.
- Users on very slow devices see a blank page until the bundle runs.

## Mitigations

- Aggressive code splitting, idle preloading and small initial bundle.
- Static metadata and `sitemap.xml`/`robots.txt` in `public/`.
- A future marketing site could be prerendered separately.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Angular Universal SSR | Runtime cost and complexity for private pages |
| Prerender public routes only | The five public routes are trivial; not worth a separate pipeline |
