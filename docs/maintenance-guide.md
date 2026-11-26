# Maintenance Guide

## 1. Routine maintenance calendar

| Cadence | Task | Owner |
| --- | --- | --- |
| Every build | `npm ci`, build, `npm audit --audit-level=high` | CI / developer |
| Weekly | Review Dependabot PRs and security alerts | Front-end |
| Weekly | Check failed emails, scheduler health, suspicious sign-ins | Operations |
| Monthly | Patch/minor dependency updates with a test pass | Front-end |
| Monthly | Review open defects and known issues | Team |
| Quarterly | Angular minor upgrade and a performance check | Front-end |
| Quarterly | Accessibility pass (keyboard, axe, contrast per theme) | QA |
| Quarterly | Security review and accepted-risk register | Security |
| Quarterly | Documentation review | Team |
| Twice a year | Rollback drill | Operations |
| Annually | Major framework upgrade plan | Tech lead |

## 2. Dependency updates

### 2.1 Patch and minor

```bash
npm outdated
npm update
npm ci
npm run build
npx ng test --watch=false --browsers=ChromeHeadless   # once Karma is configured
```

Commit `package.json` and `package-lock.json` together. Review the diff for transitive changes.

### 2.2 Major (Angular, TypeScript, RxJS)

1. Read the official update guide.
2. Create a branch.
3. Run `ng update @angular/core@<n> @angular/cli@<n>` (and related packages).
4. Fix breaking changes; run the build and tests.
5. Check the bundle budget and Lighthouse.
6. Deploy to a preview channel and exercise the critical journeys.
7. Merge when green.

### 2.3 Pinned CDN assets

`index.html` pins Font Awesome `6.5.2` and MDB `8.2.0`. When updating:

1. Change the version in the CSS/JS URLs.
2. Verify icons, modals and toasts still render.
3. Re-check the preload/noscript pair.
4. Consider self-hosting to remove the CDN dependency.

## 3. Theme maintenance

Adding or changing a theme:

1. Update the backend `UITheme` seed (codes must match).
2. Update `FALLBACK_THEMES` in `theme.service.ts`.
3. Add an `html[data-theme='<code>']` block in `themes.css`.
4. If `--nav-bg` is translucent, set `--nav-panel-bg`.
5. Choose `--nav-accent-fg` for contrast against `--nav-accent`.
6. Test the login page, dashboard, a table, the calendar and the chat at 360 px.
7. Verify text contrast ≥ 4.5:1.

## 4. Reference-data maintenance

| Data | Page | Notes |
| --- | --- | --- |
| Relationship seeds | `/relationship-seeds` | Code is derived from the name |
| Event types | `/event-type-seeds` | Used by the event editor |
| Festivals | Backend sync | Per year; confirm the year is synced |
| Wish images | `/wish-images` | Keep an active image per event type |
| Festival wish mappings | `/festival-wish-mappings` | Review failures monthly |

## 5. Housekeeping

| Item | Action |
| --- | --- |
| Stale PR preview channels | Firebase expires them automatically; delete manually if needed |
| Old branches | Delete merged branches |
| Old release tags | Keep; they are cheap and useful |
| Logs | Provider retention |
| Test accounts | Rotate passwords; deactivate unused |
| `fw_*` storage keys | Do not rename without a migration note |

## 6. Monitoring the health of the maintenance itself

| Signal | Healthy |
| --- | --- |
| Dependencies more than two majors behind | 0 runtime packages |
| `npm audit` high/critical | 0 |
| Bundle size | Under the 2 MB warning |
| Lighthouse LCP | ≤ 2.5 s |
| Open S1/S2 defects | 0 |
| Known issues older than 6 months | Reviewed and either fixed or accepted |

## 7. Documentation maintenance

Update the relevant document in the same pull request as the change:

| Change | Update |
| --- | --- |
| New route | [`routing-and-navigation.md`](routing-and-navigation.md), [`access-control-matrix.md`](access-control-matrix.md) |
| New API call | [`frontend-api-integration.md`](frontend-api-integration.md) |
| New storage key | [`state-management.md`](state-management.md), [`frontend-configuration.md`](frontend-configuration.md) |
| New validation rule | [`form-validation.md`](form-validation.md) |
| New theme | [`ui-ux-design.md`](ui-ux-design.md) |
| New dependency | [`vulnerability-management.md`](vulnerability-management.md) |
| New known limitation | [`known-issues.md`](known-issues.md) |
| Architectural change | A new ADR |

## 8. Retiring a feature

1. Confirm with the product owner.
2. Remove the route, navigation entry, component and service calls.
3. Remove the model fields only when the backend no longer sends them.
4. Update the docs and the changelog.
5. Keep the data until the backend confirms it is no longer needed.

## 9. Quarterly checklist

- [ ] Dependencies current within one major
- [ ] No high/critical audit findings
- [ ] Bundle within budget
- [ ] Lighthouse targets met
- [ ] Accessibility pass recorded
- [ ] Themes verified at three widths
- [ ] Known issues reviewed
- [ ] Docs reviewed
- [ ] Rollback drill (twice a year)
- [ ] Test accounts rotated
