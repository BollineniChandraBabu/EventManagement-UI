# ADR-003: Functional HTTP interceptors

- **Status:** Accepted
- **Date:** 2024

## Context

Two cross-cutting concerns apply to every request: a global loading indicator and JWT
authentication with refresh. Angular 15+ supports functional interceptors registered with
`withInterceptors([...])`.

## Decision

Implement both interceptors as functions and register them in this order:
`loadingInterceptor`, then `authInterceptor`.

`loadingInterceptor` starts the loading state and stops it in `finalize`, skipping chat, agent and
email-image calls that show their own progress. `authInterceptor` attaches the bearer token,
detects concurrent-login rejections, refreshes on an ordinary 401 and retries once, signs out on
403, and reports status-0 failures to `ConnectivityService`.

## Consequences

**Positive**

- Composition is explicit and order is visible at the registration site.
- Loading wraps the whole pipeline, so a refresh-and-retry shows one loading session.
- No class boilerplate; easy to unit-test with `provideHttpClient(withInterceptors([...]))`.

**Negative**

- Order is significant and easy to get wrong; it must be documented and tested.
- Dependencies are resolved with `inject()`, which requires the interceptor to run in an injection
  context.
- A retry inside `authInterceptor` duplicates the original request, which must remain idempotent
  (all retried calls are GET or safe writes in practice).

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Class-based `HttpInterceptor` | More boilerplate; no benefit for two interceptors |
| Handle refresh in `ApiService` | Would duplicate logic in every method and miss calls made by `ChatService` |
