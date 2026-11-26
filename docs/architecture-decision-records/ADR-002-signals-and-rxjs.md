# ADR-002: Signals for state, RxJS for streams

- **Status:** Accepted
- **Date:** 2024
- **Deciders:** Front-end team

## Context

The app needs two different kinds of reactivity:

1. **Synchronous shared state** that templates read directly — is the user signed in, what is the
   role, is a request in flight, are sensitive values hidden, what is the current theme.
2. **Asynchronous streams** — HTTP responses, WebSocket events, debounced search, timer-based
   refresh.

RxJS alone handles both but requires `async` pipes or subscriptions everywhere, and derived values
must be recomputed manually. Signals alone handle the first case elegantly but are not a stream
library.

## Decision

- Use `signal` and `computed` for shared, synchronous state in services.
- Use RxJS `Observable`/`Subject` for HTTP, WebSocket events, debouncing and timers.
- Bridge where necessary: components subscribe to observables and write results into fields or
  signals.

## Consequences

**Positive**

- Templates read state without `async` pipes or subscription leaks.
- Derived state (`isAdmin`, `activeLabel`, `loading`) cannot drift out of sync.
- Streams keep their operators (`switchMap`, `debounceTime`, `forkJoin`) where they are strongest.

**Negative**

- Two reactive models in one codebase require discipline and clear guidance.
- Writing signals inside `effect()` is not allowed in Angular 17 without `allowSignalWrites`, so
  effects that trigger HTTP must defer with `queueMicrotask` (see `AppComponent`).
- Developers must know when to convert between the two.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| RxJS only | Verbose for simple shared flags; more subscription management |
| Signals only | No ergonomic stream operators for debounce, cancellation, combining |
| NgRx store | Disproportionate ceremony for the amount of shared state |
