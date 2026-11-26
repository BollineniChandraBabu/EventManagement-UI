# Contribution Guide

## 1. Before you start

1. Read [`onboarding-guide.md`](onboarding-guide.md) and `AGENTS.md`.
2. Get access to the repository and a dev account.
3. Install dependencies and confirm the app runs (`npm ci`, `npx ng serve`).
4. Check [`known-issues.md`](known-issues.md) so you do not re-report a known limitation.

## 2. Branching

| Branch | Use |
| --- | --- |
| `feature/<short-name>` | New functionality |
| `fix/<short-name>` | Defect fix |
| `hotfix/<short-name>` | Urgent production fix |
| `docs/<short-name>` | Documentation only |
| `chore/<short-name>` | Tooling, dependencies |

Branch from `main`; keep branches short-lived.

## 3. Commit messages

Use a conventional style:

```
<type>(<scope>): <summary>

<body explaining what and why>

<footer: refs, breaking change>
```

| Type | Use |
| --- | --- |
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `refactor` | No behaviour change |
| `test` | Tests |
| `chore` | Tooling, deps |
| `perf` | Performance |
| `style` | Formatting only |

Examples:

```
feat(calendar): roll festivals forward to the next occurrence
fix(auth): keep the concurrent-login notice during token expiry
docs(readme): document the build and deploy commands
```

Rules:

- Imperative mood, lower case summary, no trailing period.
- Explain *why* in the body when it is not obvious.
- Reference the issue where applicable.
- One logical change per commit.

## 4. Pull requests

### 4.1 Checklist

- [ ] Branched from `main` and up to date.
- [ ] Builds locally (`npx ng build`).
- [ ] Tests added/updated and passing (once Karma is configured).
- [ ] No unrelated changes.
- [ ] Docs updated in the same PR.
- [ ] Screenshots for UI changes.
- [ ] Accessibility considered (labels, keyboard, focus).
- [ ] No new secret, no unsafe HTML, no new `HttpClient` use in a component.
- [ ] Bundle size impact considered.

### 4.2 Description template

```md
## What
Short description of the change.

## Why
The problem and the expected outcome.

## How
Key implementation notes.

## Testing
Steps to verify, plus automated tests added.

## Screenshots
Before/after for UI changes.

## Risks
Anything that could break, and the rollback.

## Checklist
- [ ] Build green
- [ ] Tests green
- [ ] Docs updated
```

### 4.3 Review

- At least one approval.
- Address every comment or explain why not.
- Do not merge with a red build.
- Squash or rebase per the repository preference; keep history readable.

## 5. Coding rules (summary)

The full rules are in [`coding-standards.md`](coding-standards.md). The essentials:

1. Standalone components with explicit imports.
2. `inject()` for dependencies.
3. `takeUntilDestroyed` for subscriptions.
4. Pure logic in `*.utils.ts` with tests.
5. All HTTP through `ApiService`/`AuthService`/`ChatService`/`CircleService`.
6. No secrets, no token logging, no `bypassSecurityTrust*` on untrusted data.
7. Mask personal data with the pipes.
8. Confirm destructive actions.
9. `aria-label` on icon-only buttons.
10. Do not write signals inside `effect()`; use `queueMicrotask`.

## 6. Testing expectations

| Change | Required |
| --- | --- |
| Pure utility | Unit tests for each rule |
| Service | Unit tests for request shape and error paths |
| Guard/interceptor | Unit tests |
| Component with logic | Component test for the main behaviour |
| Template-only/CSS | Manual verification + screenshot |
| Documentation | None |

Run locally:

```bash
npx ng build
npx ng test --watch=false --browsers=ChromeHeadless
```

## 7. Documentation expectations

Update in the same PR:

| Change | Update |
| --- | --- |
| New route | [`routing-and-navigation.md`](routing-and-navigation.md), [`access-control-matrix.md`](access-control-matrix.md) |
| New endpoint | [`frontend-api-integration.md`](frontend-api-integration.md) |
| New storage key | [`state-management.md`](state-management.md) |
| New validation | [`form-validation.md`](form-validation.md) |
| New theme | [`ui-ux-design.md`](ui-ux-design.md) |
| New dependency | [`vulnerability-management.md`](vulnerability-management.md) |
| New limitation | [`known-issues.md`](known-issues.md) |
| Architectural change | A new ADR and [`decision-log.md`](decision-log.md) |
| User-visible change | [`changelog.md`](changelog.md) |

## 8. Dependencies

Before adding one:

1. Is there a small utility that would do?
2. Is it maintained and licence-compatible?
3. What does it add to the bundle? (Check the initial chunk.)
4. Can it be lazy-loaded?
5. Record it in the PR description.

Use `npm ci` for installs; commit `package-lock.json`.

## 9. Secrets

Never commit secrets. See [`secrets-management.md`](secrets-management.md). If you suspect a leak,
tell the team immediately; do not just delete the commit.

## 10. Definition of done

- [ ] Acceptance criteria met.
- [ ] Reviewed and approved.
- [ ] Build, lint and tests green.
- [ ] Docs and changelog updated.
- [ ] Deployed to a preview and verified.
- [ ] No new known issue without a record.
