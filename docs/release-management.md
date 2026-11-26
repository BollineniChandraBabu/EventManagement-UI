# Release Management

## 1. Versioning

The package version is `1.0.0` in `package.json` and has not been used for release tracking. The
recommended scheme is **Semantic Versioning** with a git tag per release:

| Change | Version bump | Example |
| --- | --- | --- |
| Breaking change to a user flow or the API contract | Major | `2.0.0` |
| New feature | Minor | `1.1.0` |
| Fix or internal change | Patch | `1.0.1` |

Tags: `v1.1.0`. Add the same version to the footer or an `appVersion` environment value so support
can identify the running build.

## 2. Release cadence

| Release type | Cadence | Notes |
| --- | --- | --- |
| Regular | Weekly or per sprint | Batches merged features |
| Hotfix | As needed | For S1/S2 defects |
| Preview | Per pull request | Not a release, but used for review |

## 3. Release roles

| Role | Responsibility |
| --- | --- |
| Release manager | Coordinates the checklist, schedules, communicates |
| Tech lead | Approves technical readiness and the rollback plan |
| QA | Runs regression and signs off |
| Product owner | UAT and acceptance sign-off |
| Operations | Deploys and monitors |

## 4. Release process

### 4.1 Plan

1. Confirm the scope (merged PRs since the last tag).
2. Identify user-visible changes for the release notes.
3. Confirm no open S1/S2 defects.

### 4.2 Prepare

1. Ensure `environment.prod.ts` has the correct `apiUrl`.
2. Update `package.json` version.
3. Update [`changelog.md`](changelog.md) and [`release-notes.md`](release-notes.md).
4. Tag the commit: `git tag -a v1.1.0 -m "Release 1.1.0"` and push the tag.
5. Confirm the backend is deployed and compatible.

### 4.3 Verify

1. Merge to `main` (or deploy manually).
2. Run the post-deployment verification in [`deployment-guide.md`](deployment-guide.md).
3. Run the smoke journeys from [`e2e-testing.md`](e2e-testing.md).
4. Confirm the cache is serving the new hashed bundle.

### 4.4 Announce

Post in the team channel: version, commit, summary, verification result, known issues. For
user-visible changes, publish an in-app notification.

## 5. Approval gates

| Gate | Approver | Evidence |
| --- | --- | --- |
| Code review | Peer | Approved PR |
| CI build | Automated | Green build |
| Regression | QA | Test report |
| UAT | Product owner | Signed acceptance criteria |
| Deployment | Tech lead | Checklist complete |

## 6. Hotfix process

1. Branch `hotfix/<issue>` from `main`.
2. Fix and add a regression test.
3. Open a PR marked as a hotfix; request expedited review.
4. Merge and deploy immediately after approval.
5. Tag a patch version.
6. Document in the changelog and known issues if anything remains.

## 7. Backend coordination

The client depends on the backend contract. For any release:

- Confirm the backend version deployed in each environment.
- Deploy backend changes before client changes that require them.
- Avoid removing fields the client still reads until the client is updated.
- Announce contract changes in advance.

## 8. Release notes content

- Date and version.
- New features.
- Improvements.
- Fixes.
- Known issues.
- Breaking changes and required actions.

## 9. Post-release review

Within a week:

- Did anything break? Any escaped defects?
- Was the rollback needed?
- Were the performance and accessibility checks done?
- Actions for the next release.

## 10. Release checklist

- [ ] Scope confirmed
- [ ] No open S1/S2
- [ ] `environment.prod.ts` correct
- [ ] Version bumped and tagged
- [ ] Changelog and release notes updated
- [ ] CI green
- [ ] Preview verified
- [ ] Deployed
- [ ] Post-deployment checks passed
- [ ] Team notified
- [ ] Post-release review scheduled
