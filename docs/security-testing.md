# Security Testing

## 1. Objectives

Verify that the client does not introduce vulnerabilities, does not leak data, and correctly
cooperates with the backend's security controls.

## 2. Scope

**In scope (client):** token handling, session lifecycle, guards, input validation, output encoding,
file upload validation, CSV export safety, third-party script exposure, storage usage, error
messages, dependency health.

**Out of scope:** backend authorisation logic, database security, infrastructure hardening, mail
server security. These must be tested by their owners; the client tests assume the backend is the
security boundary and verify the client does not undermine it.

## 3. Threat-focused test cases

### 3.1 Authentication and session

| ID | Test | Expected |
| --- | --- | --- |
| SEC-AUTH-01 | Sign in, inspect storage | Only tokens and role are stored; no password, no PII |
| SEC-AUTH-02 | Sign out | Tokens removed from both `localStorage` and `sessionStorage` |
| SEC-AUTH-03 | Expire the access token | Refresh happens; the refresh token is never placed in a URL |
| SEC-AUTH-04 | Replay an old refresh token | Backend rejects it (verify via API) |
| SEC-AUTH-05 | Concurrent login | Notice shown; tokens cleared; no silent re-authentication |
| SEC-AUTH-06 | Tamper with `fw_role` in storage | UI may show admin nav, but API calls fail with 403; no data leak |
| SEC-AUTH-07 | Tamper with a token | Backend rejects with 401; the client signs out |
| SEC-AUTH-08 | Open redirect | `redirectUrl=https://evil.example`, `//evil`, `/\evil` are rejected |
| SEC-AUTH-09 | Reset link without a token | Refused client-side and server-side |
| SEC-AUTH-10 | Direct-login token reuse | Backend rejects the second use |

### 3.2 Authorisation

| ID | Test | Expected |
| --- | --- | --- |
| SEC-AUTHZ-01 | User opens an admin route | Redirected; API returns 403 if forced |
| SEC-AUTHZ-02 | User calls an admin API directly (DevTools) | 403 |
| SEC-AUTHZ-03 | Impersonating admin calls an admin API | Backend decision; document the accepted risk |
| SEC-AUTHZ-04 | Deactivated user keeps a token | Requests rejected |
| SEC-AUTHZ-05 | User reads another user's events by id | 403/404 |

### 3.3 Input and output

| ID | Test | Expected |
| --- | --- | --- |
| SEC-IN-01 | `<script>alert(1)</script>` in a note, message, notification, name | Rendered as text; no execution |
| SEC-IN-02 | `<img src=x onerror=alert(1)>` in a chat message | Sanitised |
| SEC-IN-03 | `javascript:` URL in the wishes link | Rejected by validation |
| SEC-IN-04 | `data:text/html,...` in the wishes link | Rejected |
| SEC-IN-05 | `https://user:pass@host` in the wishes link | Rejected |
| SEC-IN-06 | Extremely long input (10 000 chars) | Handled; server enforces limits |
| SEC-IN-07 | SQL-like input (`' OR 1=1 --`) | Stored as text; no error leakage |
| SEC-IN-08 | CSV export of a cell starting with `=` | Prefixed with `'` |
| SEC-IN-09 | CSV export of a cell containing quotes/newlines | Escaped correctly |
| SEC-IN-10 | HTML in an email body previewed in an iframe | Rendered in the preview only; scripts do not affect the app |

### 3.4 File uploads

| ID | Test | Expected |
| --- | --- | --- |
| SEC-UP-01 | Upload an SVG as event media | Refused |
| SEC-UP-02 | Upload a `.exe` renamed to `.png` | Refused by the backend's byte check |
| SEC-UP-03 | Upload a 100 MB file | Refused client-side before sending |
| SEC-UP-04 | Upload a file with a path in its name (`../../x.png`) | Name sanitised by the browser/server |
| SEC-UP-05 | Upload an HTML file as a chat attachment | Accepted as a file but never rendered as HTML |
| SEC-UP-06 | Profile picture with a non-image type | Refused |

### 3.5 Data exposure

| ID | Test | Expected |
| --- | --- | --- |
| SEC-DATA-01 | Open an admin list | Emails masked by default |
| SEC-DATA-02 | Screenshot without revealing | No full email addresses visible |
| SEC-DATA-03 | Reveal, then navigate away and back | Masking resets (per-session state is not persisted) |
| SEC-DATA-04 | Inspect network responses for other users' data | Only data the endpoint is allowed to return |
| SEC-DATA-05 | Inspect console logs | No tokens, passwords or PII |
| SEC-DATA-06 | Inspect the bundle | No secrets or private API keys |

### 3.6 Third-party and supply chain

| ID | Test | Expected |
| --- | --- | --- |
| SEC-TP-01 | Inspect `index.html` scripts | Only pinned CDN URLs; no inline event handlers |
| SEC-TP-02 | Block `ipapi.co` | Guard fails closed; no app crash |
| SEC-TP-03 | Check the bearer header on `ipinfo.io` requests | No token sent to third parties |
| SEC-TP-04 | `npm audit` | No high/critical vulnerabilities (or documented exceptions) |
| SEC-TP-05 | Review new dependencies | Justified, maintained, licence-compatible |
| SEC-TP-06 | Check `localStorage` for the Google client id | Public value only; no secret |

### 3.7 Client-side abuse

| ID | Test | Expected |
| --- | --- | --- |
| SEC-AB-01 | Bypass the location guard | Possible client-side; document and enforce server-side |
| SEC-AB-02 | Rapidly trigger actions | Backend rate limiting responds 429; UI explains |
| SEC-AB-03 | Send a huge chat message | Server rejects; UI shows the message |
| SEC-AB-04 | Replay a publish request | Backend idempotency/validation decides; no duplicate broadcast |
| SEC-AB-05 | Force a 403 | User is signed out |

## 4. Tools

| Tool | Purpose |
| --- | --- |
| `npm audit` | Dependency vulnerabilities |
| OWASP ZAP (passive) | Header and response inspection |
| Browser DevTools | Storage, network, console, CSP violations |
| axe DevTools | Accessibility-adjacent DOM issues |
| Manual review | The most valuable tool for this client |

## 5. Recommended security headers

Currently only caching headers are set. Add to `firebase.json`:

```
Content-Security-Policy: default-src 'self';
  script-src 'self' https://cdnjs.cloudflare.com https://accounts.google.com;
  style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;
  img-src 'self' data: blob: https:;
  connect-src 'self' https://<api-host> wss://<api-host> https://ipapi.co https://accounts.google.com;
  frame-src https://accounts.google.com;
  object-src 'none'; base-uri 'self'; form-action 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: geolocation=(self), camera=(), microphone=()
```

Validate the policy in report-only mode first; the app uses inline styles from MDB and Angular, so
`style-src 'unsafe-inline'` may be required initially.

## 6. Frequency

| Activity | Frequency |
| --- | --- |
| `npm audit` | Every build |
| Manual checklist (3.1–3.4) | Every release |
| Header review | Every release |
| Full security review | Quarterly |
| Penetration test (with backend) | Annually |

## 7. Reporting

Security findings are tracked like defects but with restricted visibility. Do not paste tokens or
personal data into tickets. See [`vulnerability-management.md`](vulnerability-management.md) and
[`defect-tracking.md`](defect-tracking.md).
