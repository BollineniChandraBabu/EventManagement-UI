# Change Management

## 1. Purpose

How requirements, code and technical changes are proposed, reviewed, approved and recorded.

## 2. Types of change

| Type | Example | Process |
| --- | --- | --- |
| Feature | New calendar view | Product request → backlog → sprint |
| Enhancement | Better empty states | Backlog → sprint |
| Defect fix | Wrong next occurrence | Triage → fix → release |
| Technical | Split `ApiService` | Tech proposal → review → sprint |
| Configuration | API URL, CORS, headers | Change request → deploy |
| Emergency | Hotfix for S1 | Expedited review → immediate release |
| Contract | Backend field change | Joint plan → expand/contract |

## 3. Feature change flow

```
Idea → Backlog → Refinement → Acceptance criteria → Sprint → Development
     → Review → Preview → QA → UAT → Release → Retrospective
```

| Step | Artefact |
| --- | --- |
| Idea | A short problem statement and the value |
| Refinement | Scope, affected screens, requirements (FR ids) |
| Acceptance criteria | Given/When/Then per [`acceptance-criteria.md`](acceptance-criteria.md) |
| Development | Branch, commits, tests |
| Review | Pull request with a description and screenshots |
| Preview | Firebase preview URL |
| QA | Test cases executed |
| UAT | Product owner sign-off |
| Release | Changelog, release notes |

## 4. Technical change flow

1. Write a short proposal: problem, options, recommendation, impact, risks.
2. For architectural changes, create an ADR in
   [`architecture-decision-records/`](architecture-decision-records/).
3. Review with the tech lead (and the backend team if the contract is affected).
4. Record the decision in [`decision-log.md`](decision-log.md).
5. Implement behind the normal PR process.

## 5. Pull request requirements

| Requirement | Detail |
| --- | --- |
| Title | Conventional and specific |
| Description | What, why, how, testing, screenshots |
| Linked issue | Where applicable |
| Scope | One concern per PR |
| Tests | Added or updated where logic changed |
| Docs | Updated in the same PR |
| Accessibility | Keyboard and contrast considered |
| Performance | Bundle impact considered |
| Security | No new secret, no unsafe HTML |

## 6. Review standards

Reviewers check:

- Correctness against the acceptance criteria.
- Adherence to [`coding-standards.md`](coding-standards.md) and
  [`secure-coding-guidelines.md`](secure-coding-guidelines.md).
- Error handling and loading states.
- Accessibility (`aria-label`, keyboard, focus).
- Test coverage of new logic.
- No unrelated changes.

## 7. Approval and release authority

| Change | Approver |
| --- | --- |
| Feature | Product owner (scope) + peer (code) |
| Defect fix | Peer |
| Technical refactor | Tech lead |
| Configuration (API URL, CORS) | Tech lead + ops |
| Security-sensitive | Security lead |
| Emergency hotfix | Tech lead (post-hoc review acceptable) |

## 8. Configuration changes

| Change | Steps |
| --- | --- |
| API URL | Edit `environment.prod.ts` → PR → deploy → verify |
| CORS origin | Coordinate with backend → add origin → verify from the UI |
| Cache headers | Edit `firebase.json` → PR → deploy → verify headers |
| CDN version | Edit `index.html` → PR → verify icons/styling |
| Firebase project | Update `.firebaserc`, the CI secret and docs |

Always verify after deploying a configuration change.

## 9. Emergency changes

1. Declare the incident (see [`incident-management.md`](incident-management.md)).
2. Create a `hotfix/*` branch.
3. Make the smallest safe fix; add a regression test if feasible.
4. Get expedited review (one approver).
5. Deploy and verify.
6. Document in the changelog and a retrospective.

## 10. Backend contract changes

Follow the expand–contract pattern in [`database-migration.md`](database-migration.md):

1. Backend adds the new field and keeps the old.
2. Client adopts the new field.
3. Client deploys.
4. Backend removes the old field.

Never remove a field the deployed client still reads.

## 11. Records

| Record | Where |
| --- | --- |
| Decisions | [`decision-log.md`](decision-log.md), ADRs |
| Changes | [`changelog.md`](changelog.md) |
| Releases | [`release-notes.md`](release-notes.md) |
| Defects | Defect tracker |
| Incidents | Incident records and retrospectives |

## 12. Rollback of a change

Every change must be reversible:

- Code: revert the merge or roll back the hosting release.
- Configuration: restore the previous value and redeploy.
- Contract: follow the backend rollback plan.

See [`rollback-plan.md`](rollback-plan.md).
