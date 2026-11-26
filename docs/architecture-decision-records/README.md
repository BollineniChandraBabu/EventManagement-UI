# Architecture Decision Records

An ADR captures a decision that is expensive to reverse, the context that forced it, and the
consequences accepted. Format: Title, Status, Context, Decision, Consequences, Alternatives.

| ID | Title | Status |
| --- | --- | --- |
| [ADR-001](ADR-001-standalone-components.md) | Standalone components instead of NgModules | Accepted |
| [ADR-002](ADR-002-signals-and-rxjs.md) | Signals for state, RxJS for streams | Accepted |
| [ADR-003](ADR-003-functional-interceptors.md) | Functional HTTP interceptors | Accepted |
| [ADR-004](ADR-004-token-storage.md) | JWT tokens in browser storage | Accepted |
| [ADR-005](ADR-005-idle-preloading.md) | Idle route preloading | Accepted |
| [ADR-006](ADR-006-client-location-guard.md) | Client-side location guard | Accepted (with caveat) |
| [ADR-007](ADR-007-no-ssr.md) | No server-side rendering | Accepted |
| [ADR-008](ADR-008-response-normalisation.md) | Defensive response normalisation | Accepted |
| [ADR-009](ADR-009-firebase-hosting.md) | Firebase Hosting for deployment | Accepted |

## Writing a new ADR

1. Copy the structure of an existing record.
2. Number it sequentially (`ADR-010-…`).
3. State the status (`Proposed`, `Accepted`, `Superseded by ADR-XXX`, `Deprecated`).
4. Describe the forces, not just the preference.
5. List the consequences honestly, including the bad ones.
6. Add it to the table above and to [`decision-log.md`](../decision-log.md).
