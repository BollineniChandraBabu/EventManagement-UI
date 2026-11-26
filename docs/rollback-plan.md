# Rollback Plan

## 1. When to roll back

Roll back if a release causes any of the following and a forward fix is not quick and safe:

| Trigger | Example |
| --- | --- |
| The app cannot authenticate | Sign-in fails for all users |
| A core screen is broken | Dashboard, events or calendar fails to render |
| A security regression | Tokens exposed, authorisation bypass, unsafe rendering |
| Data corruption via the UI | A write path sends wrong data |
| Severe performance regression | The app is unusable on mobile |
| A backend contract mismatch | Most requests fail after a coordinated deploy |

Do **not** roll back for a cosmetic issue or a single-user problem that a forward fix can address.

## 2. Rollback options

| Option | Speed | Effect | Preferred for |
| --- | --- | --- | --- |
| Firebase Hosting release rollback | Seconds | Restores the previous release | Most cases |
| Redeploy the previous commit | Minutes | Rebuilds and deploys an older commit | When the previous release is not in history |
| Revert the merge commit and deploy | Minutes | Clean history and a new release | When a permanent revert is wanted |
| Hotfix forward | Varies | Fixes the defect in place | Small, well-understood issues |
| Disable a feature | Seconds–minutes | Backend flag off | When the backend supports a flag |

## 3. Firebase Hosting rollback (primary)

1. Open the Firebase console for project `chandu-goldengreetings`.
2. Go to **Hosting** → **Release history**.
3. Identify the last known-good release (timestamp and the commit shown by the CI run).
4. Choose **Roll back** on that release.
5. Confirm.
6. Verify: open the app, sign in, check the dashboard and one admin page.

The CDN updates quickly, but clients holding cached HTML (up to one hour) may still run the old
bundle until they refresh.

## 4. Redeploy the previous commit

```bash
git log --oneline -5          # find the last good commit
git checkout <good-commit>
npm ci
npm run build
firebase deploy --only hosting --project chandu-goldengreetings
```

After verification, return to `main` and create a forward fix.

## 5. Revert the merge

```bash
git revert -m 1 <merge-commit>
git push origin main          # triggers the live deploy workflow
```

Use this when the change must leave the codebase, not just the deployment.

## 6. Rollback and the backend

The client and backend are deployed separately.

| Situation | Action |
| --- | --- |
| Backend broke the contract | Roll back the backend first, then the client if needed |
| Client broke with an unchanged backend | Roll back the client only |
| Both changed together | Roll back in reverse order of deployment: client, then backend |
| A database migration is involved | Follow the backend's migration rollback plan; do not roll back the client into an incompatible schema |

Never roll back the client to a version that requires a field the backend has already removed.

## 7. Verification after rollback

- [ ] Login page loads and sign-in succeeds.
- [ ] Dashboard loads real data.
- [ ] The broken feature behaves as it did before the release.
- [ ] Chat connects.
- [ ] No console errors.
- [ ] The served bundle hash matches the rolled-back release.

## 8. Communication

| Audience | Message |
| --- | --- |
| Team | What broke, when, the rollback decision, the current status |
| Support | What users may see and what to tell them |
| Users | Only if the impact was visible and lasting (use the in-app notification or email) |

## 9. Post-rollback

1. Keep the failed release branch for investigation.
2. Reproduce the failure in a preview channel.
3. Add a regression test.
4. Fix forward and re-release through the normal process.
5. Record the incident in [`incident-management.md`](incident-management.md) and, if needed,
   [`known-issues.md`](known-issues.md).

## 10. Rollback drills

Twice a year, practise a rollback on a preview channel:

1. Deploy two preview releases.
2. Roll back the second.
3. Time the operation and record gaps in this plan.

## 11. Limitations

| Limitation | Impact |
| --- | --- |
| HTML cached for up to one hour | Some users stay on the broken bundle briefly |
| No feature flags in the client | Cannot disable a single feature without a deploy |
| Client-side tokens survive a rollback | Users stay signed in across the rollback |
| Backend rollback is a separate team | Coordination is required |
