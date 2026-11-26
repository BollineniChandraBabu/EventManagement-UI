# Threat Model

## 1. Method

A lightweight STRIDE analysis of the client, with a focus on what the browser-side code can and
cannot control. Each threat lists the asset at risk, the attack path, the current mitigation and
the residual risk.

Scope: the Angular client, its storage, its third-party integrations and its interaction with the
backend API. Backend internals are out of scope but referenced where the client depends on them.

## 2. Assets

| Asset | Sensitivity | Where it lives |
| --- | --- | --- |
| Access/refresh tokens | High | Browser storage |
| User profile (name, email, DOB, relationship) | Personal | Backend; displayed masked |
| Events and celebrations | Personal | Backend |
| Chat messages and attachments | Confidential | Backend; streamed to the browser |
| Email delivery records and bodies | Personal | Backend; previewed |
| Sign-in locations and IPs | Personal/security | Backend; admin only |
| Failed sign-in attempts | Security | Backend; admin only |
| Greeting media and wish images | Personal | Object storage |
| Admin capability (impersonation, publish, seeds) | High | Backend |

## 3. STRIDE analysis

### 3.1 Spoofing

| ID | Threat | Path | Mitigation | Residual |
| --- | --- | --- | --- | --- |
| S-01 | Stolen token used from another device | XSS, shared device, malware | Short token lifetime, refresh rotation, optional single-session, optional MFA | Medium |
| S-02 | Phishing of credentials | Fake login page | Users must verify the domain; MFA available | Medium |
| S-03 | Forged Google credential | Modified callback | Backend verifies the ID token | Low |
| S-04 | Replay of a one-time link | Forwarded email | Backend makes the token single-use and short-lived | Low |
| S-05 | Role tampering in storage | Edit `fw_role` | UI may show admin nav, but the API rejects with 403 | Low |

### 3.2 Tampering

| ID | Threat | Path | Mitigation | Residual |
| --- | --- | --- | --- | --- |
| T-01 | Modify request payloads in DevTools | Direct API calls | Backend validation and authorisation | Low |
| T-02 | Bypass the location guard | Block `ipapi.co`, spoof GPS, patch bundle | Client guard only; server-side geofence recommended | **High** |
| T-03 | Bypass the media type check | Rename a file | Backend byte sniffing | Low |
| T-04 | Inject HTML via a message or note | Stored XSS | Angular sanitisation on `[innerHTML]`; interpolation elsewhere | Low |
| T-05 | CSV formula injection | Export then open in Excel | `csvCell` prefixes dangerous characters | Low |
| T-06 | Manipulate the publish schedule | Craft an API call | Backend validates the schedule | Low |
| T-07 | Alter a notification after publishing | Craft an API call | Backend rejects edits to published records | Low |

### 3.3 Repudiation

| ID | Threat | Path | Mitigation | Residual |
| --- | --- | --- | --- | --- |
| R-01 | Admin denies publishing an announcement | No client-side audit | Backend audit log records `createdBy`/`updatedBy` | Low |
| R-02 | Admin denies impersonating a user | No client-side audit | Backend should log impersonation; verify | Medium |
| R-03 | User denies sending a message | No client-side audit | Backend stores sender id and timestamps | Low |

### 3.4 Information disclosure

| ID | Threat | Path | Mitigation | Residual |
| --- | --- | --- | --- | --- |
| I-01 | Shoulder-surfing personal data | Screens show emails | Masking by default with explicit reveal | Low |
| I-02 | Tokens exposed via XSS | Any script on the origin | CSP recommended; sanitisation; no untrusted scripts | Medium |
| I-03 | PII in logs | Debug logging | No PII logging in the client | Low |
| I-04 | IP sent to a third party | `ipapi.co` lookup | Disclose in the privacy notice; only for the location gate | Medium |
| I-05 | Referrer leaks the app URL to CDNs | Cross-origin requests | `Referrer-Policy` recommended | Medium |
| I-06 | Chat attachment accessible to a third party | Guessed URL | Attachments served through the authenticated API | Low |
| I-07 | Email body visible to another user | Shared screen | Masking does not hide email bodies; admins should use a private screen | Medium |

### 3.5 Denial of service

| ID | Threat | Path | Mitigation | Residual |
| --- | --- | --- | --- | --- |
| D-01 | Backend overload from many clients | Repeated list loads | Pagination, debounce, caching | Medium |
| D-02 | User hammering an action | Rapid clicks | Buttons disable while in flight; backend rate limits | Low |
| D-03 | Huge upload blocks the browser | Very large file | Client-side size check before upload | Low |
| D-04 | Socket flood | Many messages | Backend limits; client renders incrementally | Medium |

### 3.6 Elevation of privilege

| ID | Threat | Path | Mitigation | Residual |
| --- | --- | --- | --- | --- |
| E-01 | User reaches an admin screen | URL guessing | `adminGuard` redirects; backend rejects | Low |
| E-02 | User calls an admin API | DevTools | Backend authorisation | Low |
| E-03 | Impersonating admin retains admin power | Admin token retained | Accepted tool behaviour; backend should scope | Medium |
| E-04 | Location restriction bypassed | See T-02 | Server-side enforcement | **High** |
| E-05 | Seed deletion escalates data damage | Admin only | Confirmation + backend checks | Low |

## 4. Attack trees (selected)

### 4.1 Steal a session token

```
Steal token
├── XSS
│   ├── inject via chat message → sanitised (blocked)
│   ├── inject via email body → sanitised (blocked)
│   ├── inject via wishes URL → rejected (blocked)
│   └── compromise a CDN script → possible (no CSP) ← highest risk
├── Malicious browser extension → outside app control
├── Shared device with saved session → "remember me" trade-off
└── Network interception → HTTPS (blocked)
```

### 4.2 Bypass the region restriction

```
Bypass region gate
├── Deny geolocation and block ipapi.co → app denies access (guard fails closed)
├── Spoof GPS coordinates → country/region may still be missing → IP fallback → possible
├── VPN through an allowed region → succeeds (client-only check)
└── Patch the bundle / call the API directly → succeeds
```

**Conclusion:** the restriction is a UX gate, not a security control. Server-side enforcement is
required for a real guarantee.

### 4.3 Publish a misleading announcement

```
Publish without authorisation
├── Open /notifications as a user → redirected (blocked)
├── Call POST /notifications/{id}/publish → backend rejects non-admin (blocked)
├── Publish a back-dated draft → client blocks stale schedules; backend validates (blocked)
└── Edit a published record → backend rejects (blocked)
```

## 5. Third-party risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| CDN compromise (cdnjs) | Arbitrary script execution | Pin versions; add CSP with SRI where possible; consider self-hosting MDB and Font Awesome |
| Google script changes | Login page breakage | Script loaded on demand; password/OTP remain |
| `ipapi.co` outage | Legitimate users blocked | Add server-side geofence; allow operational override |
| CanvasJS compromise | Dashboard script execution | Add CSP; consider self-hosting |
| AI provider outage | Copilot/wish failure | Clear error messages; features fail closed |

## 6. Risk ranking

| Rank | Threat | Why |
| --- | --- | --- |
| 1 | T-02 / E-04 location bypass | No server-side control |
| 2 | I-02 token theft via a compromised CDN script | No CSP, third-party scripts |
| 3 | S-01 stolen token reuse | Client-side storage |
| 4 | E-03 impersonation power | Admin token retained |
| 5 | I-04/I-05 third-party metadata leakage | No referrer policy |
| 6 | D-01/D-04 load amplification | Depends on backend limits |

## 7. Recommended actions

| # | Action | Addresses |
| --- | --- | --- |
| 1 | Enforce the region restriction on the backend or edge | T-02, E-04 |
| 2 | Add a Content-Security-Policy (report-only first) | I-02, third-party risk |
| 3 | Add `Referrer-Policy` and `X-Content-Type-Options` | I-05 |
| 4 | Self-host or add SRI for MDB and Font Awesome | CDN compromise |
| 5 | Audit impersonation server-side | E-03, R-02 |
| 6 | Add client error reporting with PII scrubbing | I-03, operations |
| 7 | Review dependency updates monthly | Supply chain |

## 8. Assumptions

- The backend validates every request and enforces role checks.
- HTTPS is enforced end to end.
- No untrusted third-party script is added without review.
- Users do not share accounts (and single-session exists for those who must not).
