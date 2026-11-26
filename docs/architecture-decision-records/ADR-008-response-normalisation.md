# ADR-008: Defensive response normalisation

- **Status:** Accepted
- **Date:** 2024

## Context

The backend contract evolved during development. Some endpoints return a bare object, some wrap it
in `{data: …}`, some return `{content: …}`, and list endpoints sometimes return a raw array instead
of a paged object. Field names also have aliases (`dob`/`dateOfBirth`,
`relationShip`/`relationship`), and optional fields are frequently absent.

## Decision

Normalise at the boundary in `ApiService`:

- `unwrap()` extracts `T` from `T`, `{data: T}` or `{content: T}`.
- `normalizePaged()` returns a complete `PagedResponse` for arrays or partial pages.
- `normalizeCollection()` extracts a list from either shape.
- Payload builders send both alias field names so either backend version accepts them.
- `normalizeWishPreview()` supplies defaults for a nullable response.

Components therefore only ever see one shape.

## Consequences

**Positive**

- UI code is simple and free of defensive branching.
- Backend shape changes are absorbed in one place.
- Screens degrade gracefully instead of crashing on missing optional data.

**Negative**

- The normalisation hides contract drift; a genuinely broken backend may appear to "work" with
  empty data.
- Extra code paths to maintain and test.
- Sending alias fields bloats payloads slightly.

## Mitigations

- Unit-test the normalisers with fixtures for each shape.
- Log (in development) when a fallback path is taken.
- Eventually converge the backend on one envelope and delete the aliases.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Strict typing with no normalisation | Frequent runtime errors during backend changes |
| Ask the backend to change immediately | Not always possible; the client must ship independently |
