# Monitoring and Alerting

## 1. Current state

| Capability | Status |
| --- | --- |
| Hosting uptime | Not monitored externally |
| Client errors | Not reported |
| Performance (RUM) | Not measured |
| Deploy status | Visible in GitHub Actions |
| Business metrics | In-app dashboard |
| Security events | In-app analytics pages |
| Backend health | Backend team |

The application is largely **observable in-app but not alertable**. This document proposes a
practical target state.

## 2. What to monitor

### 2.1 Availability

| Metric | Source | Alert threshold |
| --- | --- | --- |
| App shell HTTP status | External monitor | 2 consecutive failures |
| Response time | External monitor | p95 > 3 s for 5 min |
| TLS certificate | External monitor | < 14 days to expiry |
| API reachability | External monitor | 2 consecutive failures |
| WebSocket reachability | External monitor | 3 consecutive failures |

### 2.2 Errors

| Metric | Source | Alert threshold |
| --- | --- | --- |
| Unhandled JS errors | Error reporting (Sentry) | > 10 in 5 min or any new issue |
| Failed API requests (5xx) | Error reporting / backend | > 1% of requests |
| 401 spikes | Backend logs | Unusual increase |
| 429 spikes | Backend logs | Unusual increase |

### 2.3 Performance

| Metric | Source | Alert threshold |
| --- | --- | --- |
| LCP (p75) | RUM | > 2.5 s |
| CLS (p75) | RUM | > 0.1 |
| TBT (p75) | RUM | > 200 ms |
| Bundle size | CI | > 2 MB warning |

### 2.4 Business

| Metric | Source | Alert threshold |
| --- | --- | --- |
| Delivery success rate | Dashboard | < 98% |
| Failed emails | Dashboard | > 20 in an hour |
| Scheduler failures | Schedulers page | Any job with a failure in the last run |
| Sign-in failures | Violated Users | High-suspicion IP appears |
| AI balance | Account page | Below an agreed floor |

## 3. Recommended tooling

| Need | Tool | Notes |
| --- | --- | --- |
| Uptime + TLS | UptimeRobot, Pingdom, Better Stack | Free tiers suffice |
| Client errors | Sentry (browser SDK) | Add `ErrorHandler` + HTTP error hook |
| RUM | Sentry Performance or Firebase Performance | Core Web Vitals |
| Alerts | Email + team chat webhook | Route by severity |
| Dashboards | Sentry + the in-app dashboard | Avoid duplicating |

## 4. Adding client error reporting (Sentry example)

1. `npm i @sentry/angular`.
2. Initialise in `main.ts`:

```ts
Sentry.init({
  dsn: environment.sentryDsn,
  environment: environment.production ? 'production' : 'development',
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Scrub tokens and personal data.
    return scrub(event);
  }
});
```

3. Provide `Sentry.createErrorHandler()` and `Sentry.TracingService`.
4. Add an HTTP interceptor that reports 5xx responses (never the request body).
5. Scrub `Authorization`, `fw_access_token`, `fw_refresh_token` and email addresses.

**Important:** do not send request bodies, tokens or personal data to the error service.

## 5. Alert routing

| Severity | Channel | Response |
| --- | --- | --- |
| Site down | Team chat + on-call | Immediate |
| API unreachable | Team chat + backend on-call | Immediate |
| Error spike | Team chat | Within business hours |
| Performance regression | Team chat | Next working day |
| Delivery rate below target | Team chat + operations | Within business hours |
| Security signal (high-suspicion IP) | Security channel | Same day |

## 6. Runbooks linked to alerts

| Alert | Runbook |
| --- | --- |
| Site down | [`rollback-plan.md`](rollback-plan.md), [`incident-management.md`](incident-management.md) |
| API unreachable | [`operations-runbook.md`](operations-runbook.md) §11 |
| Error spike | [`troubleshooting-guide.md`](troubleshooting-guide.md) |
| Delivery failures | [`operations-runbook.md`](operations-runbook.md) §9 |
| Security signal | [`support-guide.md`](support-guide.md), [`incident-management.md`](incident-management.md) |

## 7. Dashboards

### 7.1 Operations dashboard (proposed)

| Panel | Data |
| --- | --- |
| App availability | Uptime monitor |
| API availability | Uptime monitor |
| Error rate | Sentry |
| Core Web Vitals (p75) | RUM |
| Last deploy | GitHub |
| Open incidents | Incident tracker |

### 7.2 Business dashboard (exists in-app)

| Panel | Where |
| --- | --- |
| Users, upcoming events | Dashboard |
| Sent/failed today | Dashboard |
| Delivery health | Dashboard |
| Mail flow charts | Dashboard |
| Scheduler health | Schedulers |
| Sign-in analytics | Login Locations, Violated Users |

## 8. Logging

| What | Where | Retention |
| --- | --- | --- |
| Hosting access logs | Firebase | Provider policy |
| CI logs | GitHub Actions | 90 days |
| Client errors | None today | — |
| Business audit | Backend | Backend policy |

Do not log tokens or personal data. If client logging is added, scrub aggressively.

## 9. Thresholds tuning

Start with the values in §2, review after two weeks, and adjust to avoid alert fatigue. Prefer a
small number of meaningful alerts over comprehensive noise.

## 10. Responsibilities

| Area | Owner |
| --- | --- |
| Uptime monitoring | Operations |
| Error reporting | Front-end |
| Performance | Front-end |
| Business metrics | Operations |
| Security alerts | Security |
| Backend health | Backend team |
