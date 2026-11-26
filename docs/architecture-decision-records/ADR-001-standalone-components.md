# ADR-001: Standalone components instead of NgModules

- **Status:** Accepted
- **Date:** 2024 (Angular 17 migration)
- **Deciders:** Front-end team

## Context

The application started as a conventional Angular app with NgModules. Angular 14+ introduced
standalone components, and Angular 17 makes them the default authoring style. The app has a large
number of small screens and shared widgets, and NgModule declarations made it hard to see what a
component actually depended on. Bundle size matters because the app is served to mobile users in
India over variable connections.

## Decision

Every component, directive and pipe is `standalone: true` and imports exactly what it uses. The
bootstrap uses `bootstrapApplication` with provider functions instead of a root `AppModule`.
Feature areas are loaded with `loadComponent` in `app.routes.ts`.

## Consequences

**Positive**

- Dependencies are explicit in each component's `imports`, which makes review and deletion safe.
- Tree-shaking is more effective; unused widgets do not end up in the initial bundle.
- Lazy routes map one-to-one to components, with no module wrapper.
- Fewer files: no module declarations to keep in sync.

**Negative**

- Every component repeats its imports, which is verbose.
- Shared imports must be listed per component rather than declared once.
- Some older documentation and third-party examples still assume NgModules.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Keep NgModules | More indirection and boilerplate; against the framework direction |
| Hybrid (modules for features, standalone for widgets) | Two mental models with no clear benefit |
