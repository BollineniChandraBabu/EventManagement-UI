# Database Migration

## 1. Scope and ownership

**This repository contains no database, schema or migration tooling.** Golden Greetings UI is a
static Angular client. All persistence, schema evolution and migrations belong to the Spring Boot
backend repository, which owns the relational database and the JPA/Flyway (or equivalent)
migrations.

This document therefore describes:

1. What the client assumes about the schema.
2. How client releases must be coordinated with backend migrations.
3. What to do when a migration changes the contract.

## 2. What the client assumes

| Assumption | Where it matters |
| --- | --- |
| `AppUser.id` is a stable numeric id | Links, filters, impersonation |
| Email is unique | User creation error handling |
| Events belong to exactly one user | Event editor requires `userId` |
| Event types and relationships are reference data | Pickers load from seed endpoints |
| Festivals are stored per year | Calendar requests `month` and `year` |
| `active` flags exist on users, events, seeds and wish images | Filters and soft deactivation |
| Published notifications are immutable | UI blocks edit and delete |
| `concurrentLoginAllowed` exists on users | Account and user editor |
| `mfaEnabled` exists on users | Account and user editor |
| Chat messages keep their sender id | "mine" rendering and delete rules |
| Deletes cascade to stored media | UI states that media is removed |

Any schema change that breaks one of these must be coordinated with a client release.

## 3. Coordination rules

| Backend change | Client impact | Required action |
| --- | --- | --- |
| Add a nullable column | None | Optional: surface it in the UI later |
| Add a required column with a default | None if the backend defaults it | Verify create/update still succeed |
| Rename a column exposed in the API | Breaks the UI | Add a new field, keep the old one until the client is deployed, then remove |
| Remove a field the client reads | Breaks the UI | Remove from the client first, deploy, then remove from the API |
| Change a type (e.g. number → string) | May break comparisons | Version the field or add a new one |
| Add an enum value | UI may not label it | Update the client's label maps and fallbacks |
| Change pagination | Paged lists break | Verify `normalizePaged` still works |
| Cascade delete changes | UI text may be wrong | Update copy |

### Expand–contract pattern (recommended)

```
1. Expand: add the new column/field; keep the old one; backend writes both.
2. Migrate: backfill data.
3. Client: deploy the client that reads the new field.
4. Contract: remove the old field after the client is verified.
```

The client already tolerates some variance (arrays vs paged objects, `{data}` wrappers, optional
fields, `dob`/`dateOfBirth`, `relationShip`/`relationship`), which buys time during a migration.

## 4. Migration procedure (backend-owned, summarised)

For reference when planning a coordinated release:

1. **Plan** the schema change and its reversibility.
2. **Write** the migration and test it on a copy of production-like data.
3. **Back up** the database before applying it.
4. **Apply** the migration in a maintenance window if it locks large tables.
5. **Verify** the API against the new schema (contract checks).
6. **Deploy** the compatible client.
7. **Monitor** errors and delivery metrics.
8. **Remove** deprecated fields only after the client is stable.

## 5. Client-side data considerations

The client stores almost nothing, which limits migration risk:

| Stored value | Risk on schema change |
| --- | --- |
| Tokens | None unless the token format changes |
| `fw_theme` | None unless theme codes change (then the theme falls back to `default`) |
| `fw_impersonation` | A stored user object may lack new fields; the UI tolerates missing fields |
| `fw_calendar_view`, `fw_calendar_kinds` | None unless view or kind names change |
| `fw_sso_token` | None unless the Google client id changes (clear it if so) |

If a migration invalidates cached client state (e.g. a theme code rename), bump the storage key or
clear it on load.

## 6. Rollback of a migration

- Follow the backend's documented down-migration or restore-from-backup procedure.
- Roll back the client only if the previous client version is compatible with the restored schema.
- Never leave the client on a version that expects a column that no longer exists.

## 7. Testing a schema change

| Test | Purpose |
| --- | --- |
| API contract tests | Confirm shapes |
| Client unit tests with new fixtures | Confirm normalisation |
| Manual smoke of every affected screen | Confirm rendering |
| Create/update/delete round trip | Confirm writes |
| Pagination and filtering | Confirm query parameters still work |
| Analytics screens | Confirm date ranges and aggregations |

## 8. Checklist for a contract-affecting release

- [ ] Backend migration reviewed and tested.
- [ ] Backup taken.
- [ ] Expand phase deployed (old and new fields coexist).
- [ ] Client updated and tested against the expanded API.
- [ ] Client deployed.
- [ ] Contract phase scheduled (old field removal).
- [ ] Rollback plan agreed with the backend team.
