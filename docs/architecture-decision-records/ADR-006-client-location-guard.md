# ADR-006: Client-side location guard

- **Status:** Accepted (with caveat)
- **Date:** 2024

## Context

The service is intended for users in India, specifically Andhra Pradesh and Telangana. The
requirement arrived before a server-side geofence was available, and the backend has no
geo-restriction middleware today.

## Decision

Add `locationAccessGuard` to the root and authenticated route groups. It resolves the user's
country and region using browser geolocation first and `https://ipapi.co/json` as a fallback,
caches the result for the session, and redirects to `/restricted-region` when the location is not
`IN` with region `Andhra Pradesh` or `Telangana`. The `/restricted-region` route inverts the check
so an allowed user cannot stay on it.

## Consequences

**Positive**

- The restriction is visible and explained to users instead of failing later.
- No backend change was required to ship.
- The check runs before any protected screen loads.

**Negative**

- **It is not a security boundary.** A user can deny geolocation, block `ipapi.co`, spoof
  coordinates, or patch the bundle.
- If both geolocation sources fail, legitimate users are denied access.
- A third-party request (`ipapi.co`) is made on first load, with privacy implications.
- Results are cached per page load, so a VPN switch mid-session is not detected until reload.

## Mitigations

- Add server-side or edge geofencing as the authoritative control.
- Log denied attempts server-side.
- Provide an operational path (allow-list or support override) for legitimate users who are
  wrongly blocked.
- Disclose the IP lookup in the privacy notice.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Server-side only | Not available at the time; still recommended as the real control |
| No restriction | Business requirement unmet |
| Blocking by IP range | Requires a maintained IP database and backend support |
