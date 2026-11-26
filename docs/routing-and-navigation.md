# Routing and Navigation

## 1. Router setup

`main.ts`:

```ts
provideRouter(routes, withPreloading(IdlePreloadingStrategy))
```

All routes are lazy (`loadComponent`). The wildcard route redirects to `/dashboard`.

## 2. Route table

### 2.1 Public routes

| Path | Component | Guards | Notes |
| --- | --- | --- | --- |
| `''` | `ResetPasswordComponent` | `locationAccessGuard`, `resetLinkGuard` | Emailed reset links use `/`; the guard forwards `?token&email` to `/reset-password` |
| `login` | `LoginComponent` | `locationAccessGuard`, `guestGuard` | Signed-in users are sent to `/dashboard` |
| `otp-login` | `OtpLoginComponent` | `locationAccessGuard` | Also used for the MFA step |
| `forgot-password` | `ForgotPasswordComponent` | `locationAccessGuard` | |
| `reset-password` | `ResetPasswordComponent` | `locationAccessGuard` | Requires `token` (and normally `email`) in the query |
| `password-reset` | `ResetPasswordComponent` | `locationAccessGuard`, `resetLinkGuard` | Alternate reset entry |
| `direct-login` | `DirectLoginComponent` | `locationAccessGuard` | One-time token exchange |
| `restricted-region` | `RestrictedRegionComponent` | `locationAccessGuard` | Inverted check: allowed users are redirected home |

### 2.2 Authenticated routes

Parent route: `path: ''`, `canActivate: [locationAccessGuard, authGuard]`,
`canActivateChild: [locationAccessGuard]`.

| Path | Component | Extra guard | Roles |
| --- | --- | --- | --- |
| `dashboard` | `DashboardComponent` | — | Any |
| `account` | `AccountManagementComponent` | — | Any |
| `users` | `UsersComponent` | `adminGuard` | Admin |
| `users/new` | `UserEditorComponent` | `adminGuard` | Admin |
| `users/:id/edit` | `UserEditorComponent` | `adminGuard` | Admin |
| `login-locations` | `LoginLocationsComponent` | `adminGuard` | Admin |
| `violated-users` | `ViolatedUsersComponent` | `adminGuard` | Admin |
| `notifications` | `NotificationsComponent` | `adminGuard` | Admin |
| `notifications/new` | `NotificationEditorComponent` | `adminGuard` | Admin |
| `notifications/:id/edit` | `NotificationEditorComponent` | `adminGuard` | Admin |
| `calendar` | `CalendarComponent` | — | Any |
| `circles` | `CirclesComponent` | — | Any |
| `events` | `EventsComponent` | — | Any |
| `events/new` | `EventEditorComponent` | `adminGuard` | Admin |
| `events/:id/edit` | `EventEditorComponent` | `adminGuard` | Admin |
| `email-preview` | `EmailPreviewComponent` | — | Any (test send: admin) |
| `email-status` | `EmailStatusComponent` | — | Any |
| `email-status/otp` | `EmailStatusComponent` | `adminGuard` | Admin |
| `email-status/forgot-password` | `EmailStatusComponent` | `adminGuard` | Admin |
| `email-status/festival-wishes` | `EmailStatusComponent` | — | Any |
| `email-status/unread-chat` | `EmailStatusComponent` | — | Any |
| `email-status/circle-request` | `EmailStatusComponent` | `adminGuard` | Admin |
| `schedulers` | `SchedulersComponent` | `adminGuard` | Admin |
| `agents` | `AgentsComponent` | `adminGuard` | Admin |
| `relationship-seeds` | `RelationshipSeedsComponent` | `adminGuard` | Admin |
| `relationship-seeds/new` | `RelationshipSeedEditorComponent` | `adminGuard` | Admin |
| `relationship-seeds/:id/edit` | `RelationshipSeedEditorComponent` | `adminGuard` | Admin |
| `event-type-seeds` | `EventTypeSeedsComponent` | `adminGuard` | Admin |
| `event-type-seeds/new` | `EventTypeSeedEditorComponent` | `adminGuard` | Admin |
| `event-type-seeds/:id/edit` | `EventTypeSeedEditorComponent` | `adminGuard` | Admin |
| `festival-wish-mappings` | `FestivalWishMappingsComponent` | `adminGuard` | Admin |
| `wish-images` | `WishImagesComponent` | `adminGuard` | Admin |
| `''` (child) | redirect to `dashboard` | — | — |

### 2.3 Fallback

| Path | Behaviour |
| --- | --- |
| `**` | Redirect to `/dashboard` |

An unknown path therefore lands on the dashboard, which then redirects to `/login` if the user is
not authenticated.

## 3. Guards

| Guard | Decision | Redirect |
| --- | --- | --- |
| `locationAccessGuard` | Country `IN` and region in {Andhra Pradesh, Telangana} | `/restricted-region` (or `/` when already on it and allowed) |
| `authGuard` | Has an access token | `/login?redirectUrl=<url>`, or `/direct-login` when the URL has a `token` |
| `guestGuard` | Not authenticated | `/dashboard` when already signed in |
| `adminGuard` | `role() === ROLE_ADMIN` | `/dashboard` |
| `resetLinkGuard` | `token` and `email` present | `/reset-password?…`, else `/dashboard` or `/login` |

`locationAccessGuard` caches its result with `shareReplay(1)` for the page lifetime, so geolocation
is requested once.

## 4. Redirect behaviour

| Situation | Result |
| --- | --- |
| Anonymous opens a protected route | `/login?redirectUrl=<encoded path>` |
| Anonymous opens a protected route with `?token=` | `/direct-login?token=…&email=…` |
| Signed-in user opens `/login` | `/dashboard` |
| Any user outside the allowed region | `/restricted-region` |
| Allowed user opens `/restricted-region` | `/` (then the reset-link guard forwards on) |
| Non-admin opens an admin route | `/dashboard` |
| Unknown route | `/dashboard` |
| Sign-out | `/login` with the previous URL as `redirectUrl` |
| Successful sign-in | The safe `redirectUrl`, else `/dashboard` |

`AuthService.getSafeRedirectUrl` accepts only internal paths beginning with `/` (not `//`) and
rejects auth pages, preventing open redirects and loops.

## 5. Navigation structure (sidebar)

| Section | Items | Visibility |
| --- | --- | --- |
| Main | Dashboard, Events, Calendar, Family & Friends, Email Status, Festival Wish Emails, Unread Chat Emails | Authenticated |
| Admin | OTP Emails, Forgot Password, Circle Request Emails, Schedulers, AI Agents, Users, Login Locations, Violated Users, Notifications, Wish Images | Admin and not impersonating |
| Seeds | Relationship Seeds, Event Type Seeds, Festival Wishes | Admin and not impersonating |
| Footer | Return to Admin (when impersonating) or Account | Authenticated |

Active items use `routerLinkActive="active"`. Email Status uses `{exact: true}` so the typed
variants do not both highlight.

## 6. Lazy loading and preloading

- Each route is a separate chunk via `loadComponent`.
- `IdlePreloadingStrategy` preloads all other routes after the browser is idle
  (`requestIdleCallback`, 3 s timeout; 2 s `setTimeout` fallback).
- A route can opt out with `data: { preload: false }`. None currently does.

## 7. Route data

`EmailStatusComponent` is reused for five views; each route supplies:

```ts
data: { title: 'OTP Email Status', emailType: 'OTP' }
```

Supported values: `OTP`, `FORGOT_PASSWORD`, `FESTIVAL_WISH`, `UNREAD_CHAT_MESSAGE`,
`CIRCLE_REQUEST`, or empty for the generic log.

## 8. Deep linking and the SPA fallback

- All navigation is client-side; the hosting must serve `index.html` for unknown paths.
- A direct link to a protected route works: the guards redirect to login and the `redirectUrl`
  restores the destination.
- A direct link with a one-time token works through `authGuard` → `/direct-login`.
- Query parameters used by the app: `redirectUrl`, `token`, `email`.

## 9. Navigation edge cases

| Case | Behaviour |
| --- | --- |
| Browser back after sign-out | The guard sends the user to login again |
| Refresh on a detail route | The component reloads its record by id |
| Refresh while impersonating | `fw_impersonation` in `sessionStorage` restores the banner; the token is the impersonated user's |
| Two tabs, one signs out | The other tab still holds its token until its next request fails |
| Unknown email type in route data | The component falls back to the generic list |

## 10. Related documents

- [`authentication-flow.md`](authentication-flow.md)
- [`error-handling.md`](error-handling.md)
- [`frontend-design.md`](frontend-design.md)
