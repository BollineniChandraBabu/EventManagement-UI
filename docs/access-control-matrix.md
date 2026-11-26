# Access Control Matrix

## 1. Roles

| Role | Constant | Description |
| --- | --- | --- |
| Guest | — | No session |
| User | `ROLE_USER` | Signed-in account; sees Main navigation |
| Admin | `ROLE_ADMIN` | Sees Main, Admin and Seeds navigation |
| Impersonating admin | — | Admin viewing as a non-admin; admin navigation hidden |

The client hides UI by role; the **backend enforces** it. A hidden control is not a permission.

## 2. Route access

| Route | Guest | User | Admin | Guard |
| --- | --- | --- | --- | --- |
| `/` (reset entry) | Redirect to reset or login | Redirect | Redirect | `locationAccessGuard`, `resetLinkGuard` |
| `/login` | Yes | Redirect to dashboard | Redirect | `guestGuard` |
| `/otp-login` | Yes | Yes | Yes | `locationAccessGuard` |
| `/forgot-password` | Yes | Yes | Yes | `locationAccessGuard` |
| `/reset-password` | Yes (needs token) | Yes | Yes | `locationAccessGuard` |
| `/password-reset` | Redirect | Redirect | Redirect | `resetLinkGuard` |
| `/direct-login` | Yes (needs token) | Yes | Yes | `locationAccessGuard` |
| `/restricted-region` | Yes | Yes | Yes | `locationAccessGuard` (inverted) |
| `/dashboard` | No | Yes | Yes | `authGuard` |
| `/account` | No | Yes | Yes | `authGuard` |
| `/events` | No | Yes | Yes | `authGuard` |
| `/events/new`, `/events/:id/edit` | No | **No** | Yes | `adminGuard` |
| `/calendar` | No | Yes | Yes | `authGuard` |
| `/circles` | No | Yes | Yes | `authGuard` |
| `/email-status` | No | Yes | Yes | `authGuard` |
| `/email-status/festival-wishes` | No | Yes | Yes | `authGuard` |
| `/email-status/unread-chat` | No | Yes | Yes | `authGuard` |
| `/email-status/otp` | No | **No** | Yes | `adminGuard` |
| `/email-status/forgot-password` | No | **No** | Yes | `adminGuard` |
| `/email-status/circle-request` | No | **No** | Yes | `adminGuard` |
| `/email-preview` | No | Yes | Yes | `authGuard` |
| `/users`, `/users/new`, `/users/:id/edit` | No | **No** | Yes | `adminGuard` |
| `/login-locations` | No | **No** | Yes | `adminGuard` |
| `/violated-users` | No | **No** | Yes | `adminGuard` |
| `/notifications`, `/notifications/new`, `/notifications/:id/edit` | No | **No** | Yes | `adminGuard` |
| `/schedulers` | No | **No** | Yes | `adminGuard` |
| `/agents` | No | **No** | Yes | `adminGuard` |
| `/wish-images` | No | **No** | Yes | `adminGuard` |
| `/festival-wish-mappings` | No | **No** | Yes | `adminGuard` |
| `/relationship-seeds*` | No | **No** | Yes | `adminGuard` |
| `/event-type-seeds*` | No | **No** | Yes | `adminGuard` |
| Unknown path | Redirect to dashboard | Redirect | Redirect | wildcard |

## 3. Feature-level access

| Capability | Guest | User | Admin | Notes |
| --- | --- | --- | --- | --- |
| View own profile | — | Yes | Yes | `GET /users/me` |
| Edit wish settings | — | Yes | Yes | Own account |
| Toggle own MFA | — | Yes | Yes | Blocked while impersonating |
| Toggle own single-session | — | Yes | Yes | Blocked while impersonating |
| Upload/remove own picture | — | Yes | Yes | Image only |
| Choose theme | — | Yes | Yes | Per user |
| Change own password | — | Yes | Yes | Current password required |
| View events list | — | Yes | Yes | |
| Create/edit/delete events | — | **No** | Yes | Backend must also enforce |
| View calendar | — | Yes | Yes | |
| Download day `.ics` | — | Yes | Yes | Client-side generation |
| Open festival wish panel | — | Own wish only | All mappings | Panel adapts |
| Manage festival wish mappings | — | **No** | Yes | Admin page |
| Build a circle | — | Yes | Yes | Own circle |
| Chat | — | Yes | Yes | Circle-gated when the flag is on |
| View own email records | — | Yes | Yes | Generic and festival/unread-chat views |
| Retry/delete emails | — | Yes | Yes | Per current UI; tighten if required |
| View OTP/forgot-password/circle-request email logs | — | **No** | Yes | Admin routes |
| Send test email | — | **No** (UI) | Yes | Button checks `isAdmin` |
| Publish notifications | — | **No** | Yes | |
| Trigger schedulers | — | **No** | Yes | |
| Run agents / ask copilot | — | **No** | Yes | |
| Manage wish images | — | **No** | Yes | |
| Manage seeds | — | **No** | Yes | |
| Manage users | — | **No** | Yes | |
| Impersonate a user | — | **No** | Yes | Non-admin targets only |
| View login locations | — | **No** | Yes | |
| View violated users | — | **No** | Yes | |
| Export CSV | — | Own screens | All | Formula-safe |

## 4. Data-level access (enforced by the backend)

| Data | User can access | Admin can access |
| --- | --- | --- |
| Own profile | Yes | Yes |
| Other profiles | Directory subset (name, email, relationship, presence) | Full |
| Own events | Yes | Yes |
| Other users' events | Only what the list endpoint returns (the UI does not restrict it) | Yes |
| Own circle and requests | Yes | Yes |
| Own chat conversations | Yes | Yes |
| Other users' chat | No | No (no admin chat view) |
| Own festival wish | Yes | Yes |
| All festival wishes | No | Yes |
| Email records | Per endpoint permissions | Yes |
| Notifications (published) | Yes | Yes |
| Notifications (drafts) | No | Yes |
| Schedulers, agents | No | Yes |
| Login/failed-login analytics | No | Yes |

**Note:** the events list is a shared endpoint. If it returns all users' events to a standard user,
that is a backend policy decision the client displays as-is. Confirm the intended visibility with
the backend team.

## 5. Impersonation rules

| Rule | Behaviour |
| --- | --- |
| Target role | Must not be `ROLE_ADMIN` |
| Token | The impersonated user's token is used for API calls |
| Navigation | Admin and Seeds sections hidden; `isAdmin` returns `false` |
| Security settings | MFA and single-session changes refused |
| Theme | Reloaded for the impersonated user |
| Return | `GET /auth/admin/switch-back` restores the admin session |
| Audit | Backend responsibility; verify it logs who impersonated whom |

## 6. UI hiding versus enforcement

| Control | Hides UI | Enforces |
| --- | --- | --- |
| `authGuard` | Yes | No (client) |
| `adminGuard` | Yes | No (client) |
| `auth.isAdmin()` | Yes | No (client) |
| Backend role checks | — | **Yes** |
| Backend resource ownership checks | — | **Yes** |
| Location guard | Yes | No (client) |

## 7. Verification

| Check | How |
| --- | --- |
| A user cannot open an admin route | Sign in as a user; open each admin URL |
| A user cannot see admin navigation | Inspect the sidebar |
| Admin actions call the API successfully | Sign in as an admin; exercise each |
| Impersonation hides admin UI | Impersonate; inspect the sidebar and `isAdmin` |
| Security settings blocked while impersonating | Attempt each toggle |
| Direct API calls are rejected | Use DevTools or curl with a user token |

## 8. Recommended tightenings

| Item | Recommendation |
| --- | --- |
| Email retry/delete for standard users | Confirm whether non-admins should retry or delete any record; restrict if not |
| Shared events endpoint | Confirm users only see events they own or are entitled to |
| Impersonation audit | Require a backend audit entry and a reason |
| Location restriction | Enforce server-side |
