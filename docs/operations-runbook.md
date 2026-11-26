# Operations Runbook

Routine procedures for the Golden Greetings front end. Each procedure lists when to run it, the
steps and the expected outcome.

## 1. Service overview

| Item | Value |
| --- | --- |
| Type | Static Angular SPA |
| Hosting | Firebase Hosting, project `chandu-goldengreetings`, region `asia-east1` |
| Backend | Spring Boot API (separate team) |
| Deploy trigger | Merge to `main` (GitHub Actions) |
| Rollback | Firebase release history |
| Logs | Firebase Hosting logs; GitHub Actions runs |
| Error reporting | None (gap) |

## 2. Daily checks

| Check | How | Expected |
| --- | --- | --- |
| Site is up | Open the production URL | Login page renders |
| Latest deploy succeeded | GitHub Actions on `main` | Green |
| Backend reachable | Sign in | Dashboard loads |
| Delivery health | Dashboard card | ≥ 98% |
| Failed emails | Dashboard / Email Status | Triaged or retryable |
| Chat | Open the widget | Connects, no errors |

## 3. Weekly checks

| Check | How |
| --- | --- |
| Security alerts | GitHub Dependabot, `npm audit` |
| Scheduler health | `/schedulers` — success rates, last errors |
| Failed sign-ins | `/violated-users` — high-suspicion IPs |
| Sign-in locations | `/login-locations` — impossible travel |
| Pollinations balance | Account page (admin) |
| Open defects | Tracker |

## 4. Deploy a release

1. Confirm the release checklist in [`release-management.md`](release-management.md).
2. Merge to `main` (or run the manual deploy in [`deployment-guide.md`](deployment-guide.md)).
3. Watch the Actions run.
4. Run the post-deployment verification.
5. Announce in the team channel.

## 5. Roll back a release

Follow [`rollback-plan.md`](rollback-plan.md). In short: Firebase console → Hosting → Release
history → Roll back → verify.

## 6. Rotate the Firebase deploy credential

1. Create a new service-account key in Google Cloud.
2. Update `FIREBASE_SERVICE_ACCOUNT_CHANDU_GOLDENGREETINGS` in GitHub.
3. Re-run a workflow to confirm.
4. Delete the old key.

## 7. Investigate a user report

1. Get the email, time, browser and a description.
2. Check `/violated-users` for failed attempts.
3. Check `/login-locations` for their sign-in.
4. Check `/email-status` for their emails.
5. Check `/users` for the account state (active, MFA, single-session).
6. Reproduce with a test account if possible.
7. Reply with what you found; log a defect if it is a code issue.

See [`support-guide.md`](support-guide.md).

## 8. Publish an announcement

1. `/notifications/new` → title, message, optional email, optional schedule.
2. Save as a draft.
3. Publish (the schedule must be in the future).
4. Confirm the banner appears for a test user.
5. Unpublish before editing later.

## 9. Retry failed emails

1. `/email-status` → filter status `FAILED`.
2. Inspect a record (body, image).
3. Retry.
4. If it fails again, check the backend/mail provider and escalate.

## 10. Trigger a scheduler

1. `/schedulers`.
2. Find the job; confirm it is not running.
3. Trigger and read the message.
4. Verify the effect in Email Status or the dashboard.

## 11. Handle an offline report

The overlay means the client could not reach the API.

1. Check the backend health.
2. Check the user's network.
3. If the backend is down, follow the incident process.
4. If only one user is affected, check for a blocked `ipapi.co` or a corporate proxy.

## 12. Handle a "signed in elsewhere" report

Expected for accounts with `concurrentLoginAllowed = false`. Explain the single-session setting; the
user can turn it off on the account page (or an admin can in the user editor).

## 13. Handle a region-blocked user

1. Confirm the user's country/region.
2. The restriction is intentional (India, AP/Telangana).
3. If an exception is needed, that is a product/security decision; the client cannot override it.

## 14. Escalation

| Situation | Escalate to |
| --- | --- |
| Backend errors or outages | Backend on-call |
| Mail delivery failures | Backend/operations |
| Security incident | Security lead + incident process |
| Data loss or corruption | Backend + incident process |
| Front-end defect | Front-end team |

## 15. Routine maintenance windows

| Task | Cadence |
| --- | --- |
| Dependency updates | Monthly |
| Angular minor upgrade | Quarterly |
| Security review | Quarterly |
| Rollback drill | Twice a year |
| Documentation review | Quarterly |

See [`maintenance-guide.md`](maintenance-guide.md).
