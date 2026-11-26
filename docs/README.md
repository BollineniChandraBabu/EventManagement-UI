# Golden Greetings — Documentation

Documentation for the Golden Greetings web client (`EventManagement-UI`), an Angular 17 single-page
application for planning family celebrations, sending personalised greetings, and keeping in touch
through circles and chat.

- **Product docs** explain why the product exists and what it must do.
- **Architecture and design** explain how it is built.
- **Frontend** docs explain the Angular application in detail.
- **Testing, build and deployment** explain how to verify and ship it.
- **Security and operations** explain how to run it safely.
- **Project management** explains how the work is planned and governed.

Start with the [root README](../README.md) for the quick start, then
[`project-overview.md`](project-overview.md).

---

## Product and business

| Document | Contents |
| --- | --- |
| [project-overview.md](project-overview.md) | Purpose, scope, objectives, high-level functionality |
| [business-requirements.md](business-requirements.md) | Problems, goals, expected outcomes |
| [system-requirements.md](system-requirements.md) | Functional and non-functional requirements summary |
| [functional-requirements.md](functional-requirements.md) | Detailed functionality and business rules (FR ids) |
| [non-functional-requirements.md](non-functional-requirements.md) | Performance, security, availability, scalability, usability |
| [user-stories.md](user-stories.md) | Stories from the user's perspective |
| [use-cases.md](use-cases.md) | Actors, preconditions, workflows, alternates |
| [acceptance-criteria.md](acceptance-criteria.md) | Conditions for accepting a feature (AC ids) |
| [scope-and-limitations.md](scope-and-limitations.md) | Included, excluded, known limitations |
| [glossary.md](glossary.md) | Business and domain terminology |

## Architecture and design

| Document | Contents |
| --- | --- |
| [system-architecture.md](system-architecture.md) | Overall architecture and components |
| [high-level-design.md](high-level-design.md) | Components, services, integrations, data flow |
| [system-design.md](system-design.md) | Detailed technical design |
| [low-level-design.md](low-level-design.md) | Class, method, component-level design |
| [component-diagram.md](component-diagram.md) | Components and dependencies |
| [data-flow.md](data-flow.md) | Data movement across client, API and storage |
| [sequence-diagrams.md](sequence-diagrams.md) | Step-by-step interaction for key workflows |
| [design-patterns.md](design-patterns.md) | Patterns used and why |
| [deployment-architecture.md](deployment-architecture.md) | Infrastructure and deployment topology |
| [integration-design.md](integration-design.md) | External APIs and services |
| [architecture-decision-records/](architecture-decision-records/README.md) | ADR-001 … ADR-009 |

## Frontend

| Document | Contents |
| --- | --- |
| [frontend-design.md](frontend-design.md) | Angular architecture, structure, principles |
| [ui-ux-design.md](ui-ux-design.md) | Layout, tokens, themes, interaction, tone |
| [component-documentation.md](component-documentation.md) | Reusable components, inputs, outputs |
| [routing-and-navigation.md](routing-and-navigation.md) | Routes, guards, lazy loading, redirects |
| [state-management.md](state-management.md) | Signals, services, storage, caching |
| [frontend-api-integration.md](frontend-api-integration.md) | HTTP, endpoints, normalisation, WebSocket |
| [form-validation.md](form-validation.md) | Controls, rules, error display |
| [authentication-flow.md](authentication-flow.md) | Sign-in paths, tokens, refresh, logout |
| [error-handling.md](error-handling.md) | Interceptors, status mapping, messages |
| [responsive-design.md](responsive-design.md) | Desktop, tablet, mobile behaviour |
| [accessibility-guidelines.md](accessibility-guidelines.md) | Keyboard, screen readers, contrast |
| [frontend-configuration.md](frontend-configuration.md) | Environments, API URLs, build settings |

## Testing

| Document | Contents |
| --- | --- |
| [test-strategy.md](test-strategy.md) | Approach, levels, metrics, roadmap |
| [test-plan.md](test-plan.md) | Scope, resources, schedule, responsibilities |
| [test-cases.md](test-cases.md) | Detailed scenarios and expected results |
| [test-data.md](test-data.md) | Accounts, fixtures, boundary and adversarial data |
| [unit-testing.md](unit-testing.md) | Karma/Jasmine setup, conventions, gaps |
| [integration-testing.md](integration-testing.md) | Client↔backend, WebSocket, third parties |
| [api-testing.md](api-testing.md) | REST and WebSocket contract testing |
| [e2e-testing.md](e2e-testing.md) | Critical journeys and tooling |
| [performance-testing.md](performance-testing.md) | Targets, measurement, budgets |
| [security-testing.md](security-testing.md) | Threat-focused test cases |
| [test-coverage-report.md](test-coverage-report.md) | Coverage baseline and gaps |
| [defect-tracking.md](defect-tracking.md) | Severity, priority, lifecycle |

## Build, deployment and environments

| Document | Contents |
| --- | --- |
| [build-and-run.md](build-and-run.md) | Install, serve, build, common commands |
| [environment-setup.md](environment-setup.md) | Developer machine setup |
| [environment-configuration.md](environment-configuration.md) | DEV/QA/UAT/PROD differences, CORS |
| [deployment-guide.md](deployment-guide.md) | Step-by-step deployment and verification |
| [ci-cd-pipeline.md](ci-cd-pipeline.md) | Current workflows and recommended gates |
| [release-management.md](release-management.md) | Versioning, approvals, hotfixes |
| [rollback-plan.md](rollback-plan.md) | Restoring the previous version |
| [database-migration.md](database-migration.md) | Backend-owned migrations and client coordination |
| [infrastructure-requirements.md](infrastructure-requirements.md) | Hosting, build, network, devices |
| [containerization.md](containerization.md) | Not used; reference Dockerfile |
| [kubernetes-deployment.md](kubernetes-deployment.md) | Not used; reference manifests |
| [secrets-management.md](secrets-management.md) | Credentials, tokens, rotation |

## Security

| Document | Contents |
| --- | --- |
| [security-design.md](security-design.md) | Security posture and controls |
| [threat-model.md](threat-model.md) | STRIDE analysis, attack trees, risk ranking |
| [access-control-matrix.md](access-control-matrix.md) | Roles, routes, features, data |
| [data-classification.md](data-classification.md) | Public → Restricted, storage inventory |
| [security-requirements.md](security-requirements.md) | Verifiable security requirements |
| [secure-coding-guidelines.md](secure-coding-guidelines.md) | Practical rules with examples |
| [vulnerability-management.md](vulnerability-management.md) | Scanning, severity, remediation |
| [privacy-and-data-retention.md](privacy-and-data-retention.md) | Personal data, retention, rights |

## Operations

| Document | Contents |
| --- | --- |
| [operations-runbook.md](operations-runbook.md) | Daily, weekly and release procedures |
| [troubleshooting-guide.md](troubleshooting-guide.md) | Symptom → cause → resolution |
| [health-checks.md](health-checks.md) | What to probe and how |
| [monitoring-and-alerting.md](monitoring-and-alerting.md) | Metrics, thresholds, routing |
| [backup-and-recovery.md](backup-and-recovery.md) | What to back up and how to restore |
| [disaster-recovery.md](disaster-recovery.md) | Major-outage playbooks |
| [known-issues.md](known-issues.md) | Current limitations and workarounds |
| [support-guide.md](support-guide.md) | Investigating user reports |
| [incident-management.md](incident-management.md) | Severity, roles, process, reviews |
| [maintenance-guide.md](maintenance-guide.md) | Routine maintenance and upgrades |

## Project management

| Document | Contents |
| --- | --- |
| [project-plan.md](project-plan.md) | Phases, milestones, cadence, capacity |
| [work-breakdown-structure.md](work-breakdown-structure.md) | Workstreams, tasks, estimates, sequence |
| [risk-register.md](risk-register.md) | Risks, scores, mitigations, owners |
| [change-management.md](change-management.md) | Change types, approvals, records |
| [decision-log.md](decision-log.md) | Chronological decisions |
| [release-notes.md](release-notes.md) | User-facing release content |
| [changelog.md](changelog.md) | Chronological change record |
| [contribution-guide.md](contribution-guide.md) | Branching, commits, PRs, definition of done |
| [coding-standards.md](coding-standards.md) | Naming, TypeScript, Angular, CSS, tests |
| [onboarding-guide.md](onboarding-guide.md) | A guided first month |

---

## Conventions used in this documentation

- **Requirement ids:** `FR-*` (functional), `NFR-*` (non-functional), `AC-*` (acceptance),
  `UC-*` (use case), `SEC-*` (security), `TC-*` (test case), `R-*` (risk), `D-*` (decision),
  `KI-*` (known issue), `ADR-*` (architecture decision record).
- **Status markers:** documents distinguish what **exists today** from what is **recommended**.
  Gaps are stated explicitly rather than glossed over.
- **Scope:** the client in this repository. The Spring Boot backend is referenced where the client
  depends on it, but it is documented in its own repository.

## Keeping these documents current

Update the relevant document in the same pull request as the change. The mapping from change type to
document is in [`maintenance-guide.md`](maintenance-guide.md) §7 and
[`contribution-guide.md`](contribution-guide.md) §7.
