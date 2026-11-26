# Security Requirements

Requirements are grouped and stated so they can be verified. "Client" means this repository;
"backend" means the API, which must enforce anything marked as such.

## 1. Authentication

| ID | Requirement | Owner | Verification |
| --- | --- | --- | --- |
| SEC-A-01 | All sign-in paths shall use HTTPS. | Both | Network trace |
| SEC-A-02 | Passwords shall never be stored or logged by the client. | Client | Code review, DevTools |
| SEC-A-03 | Access and refresh tokens shall be stored only in `localStorage` or `sessionStorage`, chosen by "remember me". | Client | Code review, DevTools |
| SEC-A-04 | Sign-out shall clear tokens from **both** stores. | Client | Manual test |
| SEC-A-05 | The access token shall be refreshed before expiry and never placed in a URL. | Client | Code review |
| SEC-A-06 | A 401 shall cause at most one refresh-and-retry. | Client | Unit test |
| SEC-A-07 | A concurrent-login rejection shall clear tokens and show a blocking notice without navigating away. | Client | Unit test |
| SEC-A-08 | MFA shall be available per account and enforced by the backend. | Backend | API test |
| SEC-A-09 | One-time login tokens shall be single-use and short-lived. | Backend | API test |
| SEC-A-10 | Password reset tokens shall be single-use and expire. | Backend | API test |
| SEC-A-11 | Passwords shall be at least 8 characters (client) and meet backend policy. | Both | Form test |

## 2. Authorisation

| ID | Requirement | Owner | Verification |
| --- | --- | --- | --- |
| SEC-Z-01 | Every API endpoint shall authenticate the caller, except public auth endpoints. | Backend | API test |
| SEC-Z-02 | Every admin endpoint shall require `ROLE_ADMIN`. | Backend | API test |
| SEC-Z-03 | Users shall only read and modify resources they own or are entitled to. | Backend | API test |
| SEC-Z-04 | The client shall hide admin navigation and routes from non-admins. | Client | Manual test |
| SEC-Z-05 | Impersonation shall not be possible for admin targets. | Both | Manual + API test |
| SEC-Z-06 | Security settings shall not be changeable while impersonating. | Both | Manual test |
| SEC-Z-07 | Impersonation shall be auditable. | Backend | Log review |
| SEC-Z-08 | Deactivated accounts shall be denied access. | Backend | API test |

## 3. Input and output

| ID | Requirement | Owner | Verification |
| --- | --- | --- | --- |
| SEC-I-01 | All user-supplied content shall be rendered as text or sanitised HTML. | Client | XSS tests |
| SEC-I-02 | `[innerHTML]` shall only be used with Angular's sanitiser; no bypass for untrusted content. | Client | Code review |
| SEC-I-03 | Wishes links shall be absolute `http(s)` URLs with no credentials. | Both | Unit + API test |
| SEC-I-04 | Redirect targets shall be internal paths only. | Client | Unit test |
| SEC-I-05 | CSV exports shall neutralise formula-leading characters. | Client | Unit test |
| SEC-I-06 | Inputs shall be length-limited; the backend shall enforce the real limits. | Both | API test |
| SEC-I-07 | Error messages shall not reveal stack traces or internal details. | Both | Manual test |

## 4. File uploads

| ID | Requirement | Owner | Verification |
| --- | --- | --- | --- |
| SEC-U-01 | Only supported MIME types shall be offered and accepted. | Both | Upload tests |
| SEC-U-02 | Size limits: image 5 MB, video 50 MB, audio 10 MB, PDF 20 MB, chat attachment 50 MB. | Both | Upload tests |
| SEC-U-03 | The backend shall sniff file bytes, not trust the extension. | Backend | Upload tests |
| SEC-U-04 | Uploaded files shall not be served as executable HTML from the app origin. | Backend | Header/response test |
| SEC-U-05 | Profile pictures shall be images only. | Both | Upload test |

## 5. Session and data protection

| ID | Requirement | Owner | Verification |
| --- | --- | --- | --- |
| SEC-D-01 | Personal data shall be masked on screen by default. | Client | Manual test |
| SEC-D-02 | Tokens and personal data shall never be logged. | Client | Code review |
| SEC-D-03 | The client shall not persist personal data beyond tokens and preferences. | Client | Storage inspection |
| SEC-D-04 | The bearer token shall not be sent to third-party hosts. | Client | Network trace |
| SEC-D-05 | Object URLs shall be revoked when no longer needed. | Client | Code review |
| SEC-D-06 | Only the data needed for a screen shall be requested. | Both | API review |

## 6. Transport and headers

| ID | Requirement | Owner | Verification |
| --- | --- | --- | --- |
| SEC-T-01 | HTTPS shall be enforced for the app and API. | Both | Manual test |
| SEC-T-02 | HSTS shall be set. | Hosting | Header check |
| SEC-T-03 | A Content-Security-Policy shall be set and monitored. | Hosting | Header check |
| SEC-T-04 | `X-Content-Type-Options: nosniff` shall be set. | Hosting | Header check |
| SEC-T-05 | A `Referrer-Policy` shall be set. | Hosting | Header check |
| SEC-T-06 | The API CORS allow-list shall contain only intended UI origins. | Backend | API test |

## 7. Availability and abuse

| ID | Requirement | Owner | Verification |
| --- | --- | --- | --- |
| SEC-AV-01 | Auth and write endpoints shall be rate limited. | Backend | Load test |
| SEC-AV-02 | The client shall explain a 429 clearly. | Client | Manual test |
| SEC-AV-03 | Failed sign-ins shall be recorded and visible to admins. | Backend | UI check |
| SEC-AV-04 | The client shall not retry a concurrent-login rejection. | Client | Unit test |
| SEC-AV-05 | The client shall not create request storms (debounce, explicit search). | Client | Code review |

## 8. Supply chain

| ID | Requirement | Owner | Verification |
| --- | --- | --- | --- |
| SEC-S-01 | Dependencies shall be pinned by lockfile. | Client | `npm ci` |
| SEC-S-02 | `npm audit` shall show no unresolved high/critical issues. | Client | CI |
| SEC-S-03 | New dependencies shall be reviewed for maintenance, licence and size. | Client | PR review |
| SEC-S-04 | CDN scripts shall be pinned to exact versions. | Client | `index.html` review |
| SEC-S-05 | No secrets shall be committed. | Both | Secret scanning |

## 9. Privacy

| ID | Requirement | Owner | Verification |
| --- | --- | --- | --- |
| SEC-P-01 | Data shall be classified per [`data-classification.md`](data-classification.md). | Both | Review |
| SEC-P-02 | Retention shall follow [`privacy-and-data-retention.md`](privacy-and-data-retention.md). | Backend | Audit |
| SEC-P-03 | The IP geolocation third party shall be disclosed. | Business | Notice review |
| SEC-P-04 | Users shall be able to disable optional greetings and remove their picture. | Both | Manual test |

## 10. Compliance mapping (indicative)

| Standard | Relevance | Notes |
| --- | --- | --- |
| OWASP ASVS L1 | Baseline web security | Most items above map to it |
| OWASP Top 10 | Common risks | A01 broken access control, A03 injection, A05 misconfiguration, A07 auth failures |
| WCAG 2.1 AA | Accessibility | See [`accessibility-guidelines.md`](accessibility-guidelines.md) |
| GDPR-style principles | Personal data | Lawful basis, minimisation, retention, rights |

## 11. Verification schedule

| Requirement group | When |
| --- | --- |
| Auth, authorisation | Every release |
| Input/output, uploads | Every release |
| Session/data protection | Every release |
| Transport/headers | Every release; re-check after hosting changes |
| Availability/abuse | Quarterly |
| Supply chain | Every build (audit), monthly (review) |
| Privacy | Annually and on change |
