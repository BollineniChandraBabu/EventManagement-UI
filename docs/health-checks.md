# Health Checks

## 1. What "healthy" means for a static SPA

There is no server process to probe. Health is a combination of:

1. **Hosting** serves `index.html` and the hashed assets.
2. **Backend API** is reachable and authorised requests succeed.
3. **WebSocket** is reachable (chat and notifications).
4. **Third parties** required for specific features are reachable (Google SSO, `ipapi.co`,
   CDNs).

## 2. Signals available today

| Signal | Where | Notes |
| --- | --- | --- |
| HTTP 200 on `/` | Any uptime monitor | The app shell |
| Hashed asset 200 | Any uptime monitor | e.g. the current `main*.js` |
| Sign-in success | Manual | Requires credentials |
| Dashboard data | Manual | Proves API + auth |
| Delivery health card | In-app | Business health |
| Scheduler status | In-app | Job health |
| Connectivity overlay | In-app | Client-side reachability |
| GitHub Actions status | GitHub | Deploy health |

## 3. Client-side reachability

`ConnectivityService` already performs a health probe:

| Aspect | Value |
| --- | --- |
| Method | `HEAD` with `mode: 'no-cors'` |
| Target | The API **origin** (`https://<api-host>/?_=<timestamp>`) |
| Interval | Every 10 s |
| Timeout | 8 s |
| Offline threshold | 2 consecutive heartbeat failures; 1 failed probe after a real status-0 request (conclusive) |
| Recovery | Any successful probe |

This is a browser-side check, not an external monitor. It tells the user; it does not alert the
team.

## 4. Recommended external checks

| Check | URL | Frequency | Pass condition |
| --- | --- | --- | --- |
| App shell | `https://<app-host>/` | 1 min | 200 and contains `app-root` |
| Asset integrity | A known hashed asset (updated per release) | 5 min | 200 |
| API health | `https://<api-host>/api/...` public endpoint, or a TCP/TLS check | 1 min | 200 or expected status |
| WebSocket port | TLS handshake to the API host | 5 min | Handshake succeeds |
| TLS certificate | App host | Daily | Valid and > 14 days to expiry |
| DNS | App host | 5 min | Resolves |

**Note:** an authenticated check needs a dedicated monitor account. Do not use a real user's
credentials; create a service account with the least privilege and rotate its password.

## 5. Synthetic journey (recommended)

Once a day, run a headless browser that:

1. Opens `/login`.
2. Signs in with the monitor account.
3. Waits for the dashboard KPI cards.
4. Opens `/calendar` and checks a month renders.
5. Signs out.

Alert if any step fails or takes longer than a threshold.

## 6. In-app health surfaces

| Surface | Shows | Who |
| --- | --- | --- |
| Dashboard | Users, upcoming events, sent/failed today, delivery health, charts | Admins and users |
| Email Status | Individual delivery records | Users/admins |
| Schedulers | Job runs, failures, next fire | Admins |
| Agents | Agent enablement, dry-run, failed email count | Admins |
| Violated Users | Failed sign-in volume | Admins |
| Offline overlay | Client cannot reach the API | Everyone |

## 7. Health-check responses

| Result | Interpretation | Action |
| --- | --- | --- |
| App shell 200, API unreachable | Backend outage or CORS change | Escalate to the backend |
| App shell 200, assets 404 | Bad deploy or cache issue | Roll back |
| App shell 404 | Hosting misconfiguration | Check the Firebase project |
| Certificate expiring | Renewal failure | Renew via the hosting provider |
| WebSocket unreachable | Proxy/ingress change | Escalate |
| Dashboard data stale | Backend scheduler or query issue | Escalate |

## 8. Adding a health endpoint

The client cannot add a server endpoint, but the backend could expose:

```
GET /api/health  →  { status: "UP", db: "UP", mail: "UP", version: "…" }
```

Then a monitor can assert `status === "UP"` and surface the version. This is the single most useful
addition for operations.

## 9. Dashboard for operations

A simple status page (external or internal) should show:

- App shell: up/down, response time.
- API: up/down, response time.
- Last deploy: commit and time.
- Certificate expiry.
- Open high-severity incidents.

## 10. What is not covered

| Gap | Impact |
| --- | --- |
| No client error reporting | Silent failures |
| No real-user monitoring | Performance regressions go unnoticed |
| No backend health endpoint known to the client | Limited synthetic checks |
| No alerting on failed deploys | Relies on someone watching Actions |
