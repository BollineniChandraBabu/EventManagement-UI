# Backup and Recovery

## 1. What needs backing up

| Asset | Where it lives | Backup owner |
| --- | --- | --- |
| Application source | Git repository (GitHub) | GitHub + mirrors |
| Built artefacts | Rebuildable from source | Not backed up (reproducible) |
| Hosting configuration | `firebase.json`, `.firebaserc` in git | Git |
| Firebase release history | Firebase Hosting | Provider |
| CI configuration | `.github/workflows` in git | Git |
| CI secrets | GitHub secrets | GitHub; documented in the secret register |
| Backend database | Backend infrastructure | **Backend team** |
| Object storage (media) | Cloud storage | **Backend/cloud team** |
| Documentation | `docs/` in git | Git |
| Test data fixtures | Local / test environment | Recreatable |

The front end itself holds **no persistent state**. Everything user-generated lives in the backend
and object storage, which have their own backup plans.

## 2. Source code

| Control | Status |
| --- | --- |
| Remote repository | GitHub |
| Branch protection | Recommended on `main` |
| Full history | Yes (the local clone is shallow; the remote has full history) |
| Tags | Recommended per release |
| Mirror | Recommended (second remote) |

Recovery:

```bash
git clone <repository-url>
npm ci
npm run build
```

## 3. Hosting releases

Firebase Hosting keeps a release history. Each release can be restored from the console.

| Aspect | Detail |
| --- | --- |
| Retention | Provider-defined (historically several months) |
| Restore | Hosting → Release history → Roll back |
| Verification | Load the app and sign in |

If the history is insufficient, redeploy an older commit:

```bash
git checkout <commit>
npm ci && npm run build
firebase deploy --only hosting
```

## 4. CI secrets

| Secret | Backup |
| --- | --- |
| Firebase service account | Recreatable from Google Cloud; store the current key in the team vault |
| `GITHUB_TOKEN` | Automatic |

Losing the service account is recoverable by creating a new key. Losing access to the Google Cloud
project is not; ensure at least two owners.

## 5. Backend dependencies

The front end cannot function without the backend. Confirm with the backend team:

- Database backup frequency and retention.
- Point-in-time recovery availability.
- Object storage versioning and lifecycle.
- Restore testing cadence.
- Contact and escalation path.

## 6. Recovery scenarios

| Scenario | Recovery | Target time |
| --- | --- | --- |
| Bad front-end release | Firebase rollback | Minutes |
| Deleted branch | Restore from GitHub | Minutes |
| Lost local clone | Clone from GitHub | Minutes |
| Lost CI secret | Create a new service-account key | < 1 hour |
| Firebase project access lost | Restore owner access via Google Cloud | Hours |
| Hosting region issue | Provider handles; no client action | Provider SLA |
| Backend database loss | Backend restore | Backend SLA |
| Object storage loss | Backend/cloud restore | Backend SLA |
| Total loss of the repository | Restore from a mirror | Hours |

## 7. Recovery testing

| Test | Frequency |
| --- | --- |
| Roll back a preview release | Twice a year |
| Rebuild from a clean clone | Quarterly |
| Verify the CI secret works | After any rotation |
| Confirm backend restore drill evidence | Annually (with the backend team) |

## 8. Documentation recovery

All documentation lives in `docs/` in the same repository, so it is recovered with the source. Do
not store critical documentation only in a chat tool or a wiki that is not backed up.

## 9. Responsibilities

| Area | Owner |
| --- | --- |
| Source and docs | Front-end team |
| Hosting releases | Operations |
| CI secrets | Operations/security |
| Database and media | Backend team |
| Recovery drills | Operations |
