# Incident Management

## 1. What counts as an incident

| Type | Example |
| --- | --- |
| Availability | The app or API is unreachable |
| Functional | Sign-in, events or calendar broken for many users |
| Security | Token exposure, unauthorised access, data leak |
| Data | Loss or corruption of user data |
| Performance | The app is unusably slow |
| Delivery | Greeting emails failing in volume |

A single-user problem with a workaround is a support ticket, not an incident.

## 2. Severity levels

| Level | Definition | Examples | Response |
| --- | --- | --- | --- |
| SEV1 | Total outage or active security breach | App down for all; tokens leaked | Immediate, all hands |
| SEV2 | Major function unavailable for many | Cannot sign in; emails not sending | Immediate, on-call |
| SEV3 | Degraded function with a workaround | Chat live updates down; charts blank | Same day |
| SEV4 | Minor impact | A cosmetic issue affecting many | Next working day |

## 3. Roles

| Role | Responsibility |
| --- | --- |
| Incident commander | Coordinates, decides, communicates |
| Technical lead | Diagnoses and fixes |
| Communications lead | Updates stakeholders and users |
| Scribe | Timeline, decisions, actions |
| Security lead (SEV1 security) | Containment and notification |

For small teams one person may hold several roles; say so explicitly in the channel.

## 4. Process

### 4.1 Detect

Sources: uptime monitor, error reporting (when added), user reports, team observation.

### 4.2 Declare

1. Open an incident channel.
2. State the severity, the impact and who is coordinating.
3. Start a timeline.

### 4.3 Triage

| Question | Action |
| --- | --- |
| Is the app reachable? | Check hosting; roll back if a deploy caused it |
| Is the API reachable? | Check the backend; escalate to the backend on-call |
| Did a deploy just happen? | Consider immediate rollback ([`rollback-plan.md`](rollback-plan.md)) |
| Is it one user or many? | One → support; many → incident |
| Is it a security event? | Involve the security lead immediately |

### 4.4 Mitigate

Prefer the fastest safe mitigation:

1. Roll back the front end.
2. Ask the backend to roll back or disable a flag.
3. Publish an in-app notification if the impact is user-visible and lasting.
4. Post a status update.

### 4.5 Resolve

1. Confirm the symptom is gone.
2. Verify the critical journeys.
3. Close the incident and record the end time.

### 4.6 Learn

1. Write a retrospective within five working days.
2. Identify contributing causes (not just "human error").
3. Create action items with owners and dates.
4. Update runbooks, tests and documentation.

## 5. Communication

| Audience | Cadence | Content |
| --- | --- | --- |
| Incident channel | Every 15–30 min | Status, impact, next step, owner |
| Stakeholders | At declaration, mitigation, resolution | Plain language |
| Users | If impact is visible | In-app notification or email |
| Support | At declaration | What to tell users |

Template:

> **Update [time]** — [SEV level] — [what is affected]. We are [action]. Next update at [time].

## 6. Specific playbooks

### 6.1 App not loading

1. Check hosting status and the latest deploy.
2. If the deploy is the cause, roll back.
3. Verify `index.html` and the hashed assets return 200.
4. Check the certificate.

### 6.2 Sign-in broken

1. Check `/auth/login` responses (Network tab or API test).
2. Check the backend and its database.
3. Check for a CORS change.
4. Check the token lifetime configuration.

### 6.3 Everyone signed out

1. Check whether refresh is failing.
2. Check for a backend change to token format or lifetime.
3. Check for a clock skew on the backend.
4. Communicate: users must sign in again.

### 6.4 Emails not sending

1. Check Email Status for failures.
2. Check the Schedulers page.
3. Check the mail provider with the backend team.
4. Retry failed records once the cause is fixed.

### 6.5 Suspected token or data leak

1. Involve the security lead.
2. Contain: rotate credentials, revoke sessions, disable the affected path.
3. Assess scope: which users, what data.
4. Notify per policy.
5. Preserve evidence; do not destroy logs.

## 7. Post-incident review template

| Field | Content |
| --- | --- |
| Incident id / date | |
| Severity | |
| Duration | Detection → resolution |
| Impact | Users, features, data |
| Timeline | Key events with times |
| Root cause | Technical and process |
| Detection | How it was found; how it could be faster |
| Mitigation | What worked, what did not |
| Action items | Owner, due date, ticket |
| Documentation updates | Runbooks, known issues, tests |

## 8. Blameless principle

Focus on systems and processes, not individuals. Ask "what allowed this to happen?" and "what would
have caught it sooner?".

## 9. Preparedness

| Item | Status |
| --- | --- |
| Rollback plan | Documented; drill twice a year |
| On-call rotation | Define |
| Contact list | Backend, hosting, security |
| Status page | Recommended |
| Uptime monitoring | Recommended |
| Error reporting | Recommended |
| Runbooks | This documentation set |
