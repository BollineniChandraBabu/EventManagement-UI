# Defect Tracking

## 1. Purpose

Defines how defects are recorded, classified, prioritised, fixed and verified.

## 2. Lifecycle

```
New → Triaged → Assigned → In Progress → Fixed → Verified → Closed
                        ↘ Deferred / Won't Fix / Duplicate / Cannot Reproduce
```

| State | Meaning |
| --- | --- |
| New | Reported, not yet reviewed |
| Triaged | Severity and priority set; owner assigned |
| Assigned | Developer has it |
| In Progress | Being fixed |
| Fixed | Code merged; awaiting verification |
| Verified | QA confirmed the fix on a deployed build |
| Closed | Done |
| Deferred | Accepted for a later release |
| Won't Fix | Accepted as-is with a rationale |
| Duplicate | Linked to an existing defect |
| Cannot Reproduce | Insufficient information or environment-specific |

## 3. Severity (impact)

| Severity | Definition | Examples |
| --- | --- | --- |
| S1 Critical | Data loss, security breach, or the app is unusable for everyone | Cannot sign in; tokens leaked; all API calls fail |
| S2 Major | A core feature is broken with no workaround | Cannot create events; calendar empty for all years; publish fails |
| S3 Moderate | A feature is impaired but a workaround exists | Filter resets unexpectedly; image preview fails for one type |
| S4 Minor | Cosmetic or low-impact | Misaligned label; typo; inconsistent spacing |

## 4. Priority (urgency)

| Priority | Meaning | Target |
| --- | --- | --- |
| P1 | Fix immediately, hotfix if needed | Same day |
| P2 | Fix in the current sprint | ≤ 5 working days |
| P3 | Fix in the next release | Next release |
| P4 | Backlog | When capacity allows |

Priority is a business decision; severity is a technical assessment. A cosmetic defect on the login
page may be P2; a minor issue in an admin-only seed screen may be P4.

## 5. Severity × priority guidance

| | P1 | P2 | P3 | P4 |
| --- | --- | --- | --- | --- |
| **S1** | Hotfix now | Hotfix now | — | — |
| **S2** | Hotfix now | Current sprint | Next release | — |
| **S3** | Current sprint | Current sprint | Next release | Backlog |
| **S4** | — | Next release | Backlog | Backlog |

## 6. Required fields

| Field | Notes |
| --- | --- |
| Title | Short, specific ("Event save fails with a video over 50 MB") |
| Environment | Local / preview / production, plus the URL |
| Build | Commit SHA or preview channel |
| Browser / device | e.g. Chrome 126, Pixel 7 |
| Steps to reproduce | Numbered, minimal |
| Expected | What should happen |
| Actual | What happens, including the exact message |
| Evidence | Screenshot, recording, console output, network HAR (redact tokens) |
| Severity / priority | Per the tables |
| Affected area | Auth, events, calendar, chat, admin, etc. |
| Related requirement | FR/AC id where applicable |

## 7. Writing a good defect

1. Reproduce it twice; note whether it is intermittent.
2. Reduce to the smallest set of steps.
3. State the expected behaviour by referencing a requirement or acceptance criterion.
4. Attach evidence, but **redact tokens, emails and personal data**.
5. Say what you already tried.

## 8. Triage meeting

Weekly (or daily during a release):

- Review new defects.
- Confirm severity and priority.
- Assign an owner.
- Decide fix / defer / won't fix.
- Identify duplicates and link them.

## 9. Verification

- A fix is verified on a deployed build, not just locally.
- The reporter confirms where possible.
- A regression test is added for S1/S2 defects (unit, component or E2E).
- The defect is closed only after verification.

## 10. Release blocking rules

A release is blocked by:

- Any open S1.
- Any open S2 with priority P1 or P2.
- A security finding rated high or critical without an approved mitigation.

Known S3/S4 defects may ship if they are documented in
[`known-issues.md`](known-issues.md) and the release notes.

## 11. Metrics

| Metric | Meaning | Target |
| --- | --- | --- |
| Defect density | Defects per feature delivered | Declining |
| Escaped defects | Found after release | ≤ 2 per release |
| Mean time to fix (S1/S2) | From triage to verified | ≤ 2 days |
| Reopen rate | Fixed then reopened | < 5% |
| Ageing | Open defects older than 30 days | Reviewed monthly |

## 12. Current known defects

See [`known-issues.md`](known-issues.md). Highlights:

| ID | Summary | Severity |
| --- | --- | --- |
| KI-01 | `ng test` fails because `karma.conf.js` is missing | S3 |
| KI-02 | `npm run lint` fails because there is no ESLint config | S4 |
| KI-03 | Production environment file contains a placeholder API URL | S2 (release blocker if unaddressed) |
| KI-04 | Unrouted placeholder components exist | S4 |
| KI-05 | No client error reporting | S3 (operational) |
