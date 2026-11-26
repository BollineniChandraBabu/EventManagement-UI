# ADR-009: Firebase Hosting for deployment

- **Status:** Accepted
- **Date:** 2024

## Context

The team needed a low-maintenance way to host a static Angular bundle with HTTPS, a global CDN,
preview deployments per pull request and simple rollback, without operating servers.

## Decision

Deploy to Firebase Hosting:

- Project `chandu-goldengreetings`, region `asia-east1`.
- `firebase.json` sets immutable caching for hashed assets and a one-hour cache for HTML/text/XML.
- GitHub Actions deploy a preview channel per pull request and the live channel on merge to `main`.
- The service-account credential lives in the GitHub secret
  `FIREBASE_SERVICE_ACCOUNT_CHANDU_GOLDENGREETINGS`.

## Consequences

**Positive**

- HTTPS and CDN included; no certificate or server maintenance.
- Preview channels make review of real builds easy.
- Release history gives a one-click rollback.
- Caching rules express exactly the "hashed assets forever, HTML briefly" policy.

**Negative**

- Vendor lock-in to Firebase for hosting.
- No server-side logic; anything dynamic must live in the API.
- Only one long-lived environment (production); no persistent staging.
- Security headers beyond caching must be configured explicitly and are currently absent.

## Alternatives considered

| Alternative | Why rejected |
| --- | --- |
| Netlify / Vercel | Comparable; Firebase was already in use by the project |
| S3 + CloudFront | More setup and IAM management |
| Nginx on a VM | Operational burden with no benefit for a static bundle |
