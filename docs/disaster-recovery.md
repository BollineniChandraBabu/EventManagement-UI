# Disaster Recovery

## 1. Purpose

How to restore the Golden Greetings front end after a major disruption. Because the app is a static
bundle, most front-end disasters are recoverable quickly; the hard cases involve losing access to
the hosting project or losing the source.

## 2. Scope and dependencies

| Component | Failure impact | Recovery owner |
| --- | --- | --- |
| Source repository | Cannot build or deploy | Front-end team |
| Firebase project / hosting | App unavailable | Operations |
| DNS / domain | App unreachable by name | Operations |
| CI (GitHub Actions) | Cannot deploy automatically | Operations (manual deploy) |
| Backend API | App loads but no data | Backend team |
| Database | Backend fails | Backend team |
| Object storage | Media missing | Backend/cloud team |
| CDN assets | Styling/icons/charts degrade | Front-end team |
| Third-party geolocation | Location gate denies access | Front-end/product |

## 3. Recovery objectives

| Objective | Target | Notes |
| --- | --- | --- |
| RTO (front end) | ≤ 1 hour | Static redeploy or rollback |
| RPO (front end) | 0 | Source is in git; no client data |
| RTO (with backend) | Backend-dependent | Coordinate |
| RPO (user data) | Backend-defined | Backend responsibility |

## 4. Scenarios and playbooks

### 4.1 Bad release (most common)

**Detect:** users report breakage immediately after a deploy; errors in the console.

**Recover:**
1. Firebase console → Hosting → Release history → roll back.
2. Verify sign-in and the dashboard.
3. If history is unavailable, redeploy the previous commit.

**Time:** minutes.

### 4.2 Hosting outage

**Detect:** the app returns errors or times out; the provider status page reports an incident.

**Recover:**
1. Confirm it is provider-wide.
2. If the impact is severe and long, deploy the same bundle to a backup host (see §5).
3. Update DNS if needed.
4. Communicate with users.

**Time:** provider-dependent.

### 4.3 Lost access to the Firebase project

**Detect:** deploys fail with permission errors; the console is inaccessible.

**Recover:**
1. Use a second Google Cloud owner account to restore access.
2. If the project is unrecoverable, create a new project, deploy the bundle, and update DNS.
3. Update `.firebaserc` and the CI secret.

**Time:** hours.

### 4.4 Repository lost or corrupted

**Detect:** clone fails; history is gone.

**Recover:**
1. Restore from a mirror or a developer's clone.
2. Recreate `.github/workflows` if missing.
3. Rebuild and deploy.
4. Re-tag the current release.

**Time:** hours. **Prevention:** a second remote mirror and release tags.

### 4.5 CI unavailable

**Recover:** deploy manually:

```bash
npm ci
npm run build
firebase deploy --only hosting --project chandu-goldengreetings
```

**Time:** minutes.

### 4.6 DNS or certificate failure

**Recover:**
1. Check the DNS records at the registrar.
2. Check the certificate in the hosting console.
3. Re-issue or re-attach the domain.
4. Verify HTTPS.

**Time:** minutes to hours depending on DNS TTL.

### 4.7 Backend outage

The front end cannot fix this. It should:

1. Show the offline overlay (already implemented).
2. Show error toasts with retry.
3. Communicate via other channels.

Coordinate with the backend team; see [`incident-management.md`](incident-management.md).

### 4.8 Third-party failure

| Failure | User impact | Mitigation |
| --- | --- | --- |
| `ipapi.co` down | Location gate denies access if GPS is also unavailable | Server-side geofence; operational override |
| Google Identity down | SSO unavailable | Password/OTP still work |
| cdnjs down | Styling/icons missing | Self-host assets |
| CanvasJS down | Charts blank | Self-host the script |
| Google Fonts down | Fallback font | Acceptable |

## 5. Backup hosting plan (optional)

If Firebase is unavailable for an extended period:

1. Build the bundle with the production environment.
2. Deploy to a secondary static host (Netlify, CloudFront, an nginx VM).
3. Configure the SPA fallback and cache headers.
4. Point DNS at the secondary host.
5. Confirm the backend CORS allows the secondary origin.

This plan requires the backend CORS allow-list to include the secondary origin **before** an
emergency, so plan it in advance.

## 6. Communication during a disaster

| Audience | Channel | Message |
| --- | --- | --- |
| Team | Incident channel | Status every 15–30 min |
| Users | In-app (if reachable), email, social | What is down, what to do |
| Stakeholders | Direct | Impact and ETA |

## 7. Post-recovery

1. Confirm all critical journeys.
2. Monitor for 24 hours.
3. Write a retrospective.
4. Update this plan with what was learned.
5. Fix the root cause.

## 8. Preparedness checklist

- [ ] At least two owners on the Google Cloud/Firebase project.
- [ ] A second remote for the repository (mirror).
- [ ] Release tags per deploy.
- [ ] The Firebase service account can be recreated (documented).
- [ ] A documented manual deploy path.
- [ ] A backup hosting plan (optional but recommended).
- [ ] Backend contacts and escalation path.
- [ ] Rollback drill performed twice a year.
- [ ] This plan reviewed annually.
