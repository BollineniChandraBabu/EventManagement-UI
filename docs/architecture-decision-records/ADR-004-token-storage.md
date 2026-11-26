# ADR-004: JWT tokens in browser storage

- **Status:** Accepted
- **Date:** 2024

## Context

The backend is a stateless Spring Boot API issuing an access token and a refresh token. The client
must keep them across navigation, and optionally across browser restarts when the user chooses
"remember me". Cookie-based sessions would require CSRF protection and tighter backend/browser
coupling.

## Decision

- Store `fw_access_token`, `fw_refresh_token` and `fw_role` in `localStorage` when "remember me" is
  checked, otherwise in `sessionStorage`.
- Read from `localStorage` first, then `sessionStorage`.
- Send the access token as `Authorization: Bearer …` on every API call except third-party
  geolocation.
- Refresh 30 seconds before expiry and sign out at expiry.

## Consequences

**Positive**

- Stateless API; no server session store or sticky routing.
- No cookie/CSRF surface.
- "Remember me" maps naturally to the storage choice.

**Negative**

- Any XSS can read the tokens; the app must keep its dependency and rendering hygiene high.
- Tokens are shared across tabs in `localStorage` (usually desirable, but worth knowing).
- Logout must clear both stores to avoid a stale token in the other one.

## Mitigations

- No `innerHTML` of untrusted content outside Angular's sanitiser.
- No third-party scripts except pinned CDNs; MDB is deferred.
- Short access-token lifetime with proactive refresh.
- Optional MFA and single-session enforcement per account.
- Recommended: add a Content-Security-Policy header (see `security-design.md`).

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| HttpOnly cookies | Requires CSRF handling and backend changes; not supported by the current API |
| In-memory only | Loses the session on refresh; poor usability |
| Web Crypto-encrypted storage | The key would have to live in the bundle, so it adds no real protection |
