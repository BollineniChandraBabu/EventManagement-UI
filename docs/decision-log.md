# Decision Log

A chronological record of important project decisions. Architectural decisions have full ADRs in
[`architecture-decision-records/`](architecture-decision-records/); this log also captures product
and process decisions.

| # | Date | Decision | Type | Rationale | Status | Reference |
| --- | --- | --- | --- | --- | --- | --- |
| D-01 | 2024 | Use Angular 17 standalone components | Architecture | Explicit dependencies, better tree-shaking | Accepted | ADR-001 |
| D-02 | 2024 | Signals for state, RxJS for streams | Architecture | Simplicity plus stream operators | Accepted | ADR-002 |
| D-03 | 2024 | Functional HTTP interceptors | Architecture | Less boilerplate, clear order | Accepted | ADR-003 |
| D-04 | 2024 | JWT tokens in browser storage | Security | Stateless API, no CSRF surface | Accepted | ADR-004 |
| D-05 | 2024 | Deploy to Firebase Hosting | Infrastructure | Static CDN, previews, rollback | Accepted | ADR-009 |
| D-06 | 2024 | No server-side rendering | Architecture | Private content, static hosting | Accepted | ADR-007 |
| D-07 | 2024 | Client-side location guard | Security/Product | Ship the region restriction quickly | Accepted with caveat | ADR-006 |
| D-08 | 2024 | Defensive response normalisation | Engineering | Tolerate backend shape variance | Accepted | ADR-008 |
| D-09 | 2024 | Restrict access to India (AP/Telangana) | Product | Business requirement | Accepted | ADR-006 |
| D-10 | 2024 | Circles are mutual and require acceptance | Product | Privacy and consent | Accepted | BR-01 |
| D-11 | 2024 | Chat can be restricted to circle members | Product | Privacy | Accepted | BR-03 |
| D-12 | 2024 | Festivals stored per year, shown recurring | Product | Regional accuracy | Accepted | BR-04 |
| D-13 | 2024 | Published notifications are immutable | Product | Avoid changing live announcements | Accepted | BR-07 |
| D-14 | 2024 | Notification schedules must be in the future | Product | Prevent back-dated publishing | Accepted | BR-08 |
| D-15 | 2024 | Impersonation keeps the admin token | Engineering | Simplifies switching back | Accepted | ADR-006 note |
| D-16 | 2024 | Mask emails by default with a reveal toggle | Security/UX | Reduce accidental disclosure | Accepted | security-design |
| D-17 | 2024 | Client-side media validation mirrors the backend | Engineering | Fast, specific feedback | Accepted | media.ts |
| D-18 | 2025 | Replace `PreloadAllModules` with idle preloading | Performance | Improve LCP | Accepted | ADR-005 |
| D-19 | 2025 | Inject CanvasJS on first chart render | Performance | Avoid downloading it on other pages | Accepted | frontend-design |
| D-20 | 2025 | Reserve the Google button slot | Performance | Avoid CLS on login | Accepted | frontend-design |
| D-21 | 2025 | Add a concurrent-login blocking notice | Security/UX | Explain a superseded session | Accepted | authentication-flow |
| D-22 | 2025 | Add a wish-preview modal once per session | Product | Engagement | Accepted | app.component |
| D-23 | 2025 | Bulk actions apply to the current page only | Engineering | Avoid stale-id deletes | Accepted | BulkSelection |
| D-24 | 2025 | Add 11 selectable themes | Product | Personalisation | Accepted | ui-ux-design |
| D-25 | 2025 | Keep `ApiService` as a single façade (for now) | Engineering | One place for normalisation | Provisional | system-design |
| D-26 | 2025 | Do not add a state-management library | Engineering | Little shared state | Accepted | ADR-002 |
| D-27 | 2025 | Keep the location guard client-side pending backend work | Security | Interim | Provisional | threat-model |
| D-28 | 2025 | Do not containerize or use Kubernetes | Infrastructure | Static hosting is sufficient | Accepted | containerization |
| D-29 | 2025 | Documentation lives in `docs/` in this repository | Process | Versioned with the code | Accepted | docs/README.md |
| D-30 | 2025 | Release by merging to `main` (no release branch) | Process | Simple, always releasable | Accepted | ci-cd-pipeline |

## How to add a decision

1. Assign the next number.
2. Write the decision in one sentence.
3. State the rationale, including what was rejected.
4. Set the status (`Accepted`, `Provisional`, `Superseded by D-xx`).
5. Link an ADR if the decision is architectural.
6. Add it in the same pull request as the change.
