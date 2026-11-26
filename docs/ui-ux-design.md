# UI/UX Design

## 1. Design intent

Golden Greetings should feel warm, personal and trustworthy. The interface is calm and
information-dense where operators need it (tables, filters) and celebratory where users
experience it (calendar, wishes, chat). Eleven themes let a user make the product feel personal
without changing its structure.

## 2. Layout system

### 2.1 Shell

```
┌────────────┬──────────────────────────────────────────────────────┐
│            │ [impersonation banner, if active]                    │
│  Sidebar   │ [notification banner, if active]                     │
│            ├──────────────────────────────────────────────────────┤
│  brand     │                                                      │
│  Main      │   <router-outlet>  (page content)                    │
│  Admin     │                                                      │
│  Seeds     │                                                      │
│            │                                                      │
│  Account   │  © year Golden Greetings                             │
│            │                                        [chat bubble]  │
└────────────┴──────────────────────────────────────────────────────┘
```

- Sidebar sections: **Main** (Dashboard, Events, Calendar, Family & Friends, Email Status,
  Festival Wish Emails, Unread Chat Emails), **Admin** (OTP Emails, Forgot Password, Circle
  Request Emails, Schedulers, AI Agents, Users, Login Locations, Violated Users, Notifications,
  Wish Images), **Seeds** (Relationship Seeds, Event Type Seeds, Festival Wishes).
- The Admin and Seeds sections are hidden for non-admins and while impersonating.
- The sidebar collapses to icons on desktop and to a slide-down panel on mobile.
- Guests see only the page content (no sidebar).

### 2.2 Page composition

Every feature page follows the same rhythm:

1. **Page header** — title, short description, primary action on the right.
2. **Toolbar** — search, multi-select filters, page size, sort.
3. **Content** — table (desktop) or stacked cards (mobile), or a bespoke layout (calendar,
   dashboard).
4. **Pagination footer** — range ("1–10 of 240"), page controls.
5. **Empty state** — what happened and what to do next.
6. **Loading state** — skeleton or spinner inside the content area; the global overlay is reserved
   for navigation-level calls.

## 3. Design tokens

Defined in `styles.css` under `:root`, overridden per theme in `themes.css`.

| Group | Tokens | Purpose |
| --- | --- | --- |
| Brand | `--c-primary`, `--c-primary-hover`, `--c-primary-light`, `--c-primary-muted`, `--c-primary-ring` | Actions, links, focus rings |
| Background | `--c-bg`, `--c-surface`, `--c-surface-alt`, `--c-surface-hover` | Page, cards, rows |
| Text | `--c-text`, `--c-text-secondary`, `--c-text-muted` | Hierarchy |
| Borders | `--c-border`, `--c-border-subtle`, `--c-border-strong` | Structure |
| Semantic | `--c-success`, `--c-error`, `--c-warning`, `--c-info` (+ `-bg`, `-border`) | Status |
| Shadows | `--shadow-xs` … `--shadow-xl` | Elevation |
| Radii | `--r-sm` … `--r-2xl`, `--card-radius` | Shape |
| Motion | `--t-fast`, `--t-base`, `--t-slow` | Transitions |
| Type | `--font-body`, `--font-heading` | Plus Jakarta Sans with system fallback |
| Navigation | `--nav-bg`, `--nav-accent`, `--nav-accent-fg`, `--nav-panel-bg`, `--nav-panel-blur` | Sidebar and mobile panel |
| Surface extras | `--modal-bg`, `--switch-track`, `--page-bg-image`, `--header-bg` | Components |

**Rule:** components must use tokens, never literal colours, so themes apply automatically.

## 4. Colour usage

| Role | Default token | Notes |
| --- | --- | --- |
| Primary action | `--c-primary` (#2563eb) | One primary button per view |
| Danger | `--c-error` (#dc2626) | Delete, deactivate, reject |
| Success | `--c-success` (#059669) | Delivery healthy, saved |
| Warning | `--c-warning` (#d97706) | Delivery degraded, stale schedule |
| Info | `--c-info` (#0284c7) | Neutral notices |
| Muted text | `--c-text-muted` (#94a3b8) | Secondary metadata |

Status is never conveyed by colour alone: labels ("failed", "inactive") accompany colour.

## 5. Typography

| Element | Size / weight | Notes |
| --- | --- | --- |
| Page title | ~1.5–1.75 rem, 700 | One per page |
| Section heading | ~1.1 rem, 600 | Card headers |
| Body | 0.95–1 rem, 400 | Default |
| Table cell | 0.875–0.95 rem | Dense but readable |
| Caption/metadata | 0.75–0.8 rem, 500 | Dates, hints, counts |
| Numeric KPI | ~1.75–2 rem, 700 | Dashboard |

The font is Plus Jakarta Sans (400/500/600/700/800) loaded from Google Fonts with `preconnect`.

## 6. Themes

Eleven themes, selected per user and stored server-side, applied through `data-theme`:

| Code | Display name | Character |
| --- | --- | --- |
| `default` | Default | Clean blue-on-white baseline |
| `skeuomorphism` | Realistic Design | Textured, dimensional |
| `neomorphism` | Soft UI | Soft shadows, low contrast |
| `glassmorphism` | Frosted Glass | Translucent panels, blur |
| `claymorphism` | Soft 3D Design | Rounded, matte, pastel |
| `minimalism` | Clean & Simple | Flat, high whitespace |
| `maximalism` | Bold & Vibrant | Saturated, expressive |
| `brutalism` | Bold & Raw | Hard edges, high contrast |
| `liquid-glass` | Liquid Glass | Fluid translucency |
| `bento-grid` | Modular Grid | Card grid emphasis |
| `spatial-ui` | 3D Spatial Design | Depth and perspective |

Theme authoring rules:

1. Override tokens only; do not restyle component internals unless unavoidable.
2. If `--nav-bg` is translucent, set `--nav-panel-bg` to a near-opaque colour.
3. Choose `--nav-accent-fg` for contrast against `--nav-accent`.
4. Verify text contrast ≥ 4.5:1 and focus visibility.
5. Test the login page, dashboard, a table page, the calendar and the chat widget.

## 7. Interaction design

| Interaction | Behaviour |
| --- | --- |
| Destructive action | Confirmation dialog naming the item, danger tone, explicit verb ("Delete", "Deactivate", "Reject") |
| Save | Button shows a progress label ("Saving…"), then a success toast and navigation or reload |
| Search | Typing does not query; clearing the field or pressing search does (circles and violated users debounce automatically) |
| Filters | Funnel button opens a searchable checkbox list; "Apply" triggers the query |
| Row selection | Header checkbox selects the page; selection clears on page change |
| Calendar | Arrow navigation, "Today", year jumps, swipe on touch, day sheet, entry dialog |
| Chat | Hover reveals actions on desktop; tap opens actions on touch; double-tap reacts |
| Notifications | Banner with Dismiss; live publications also raise a toast |
| Errors | Toast with the most specific message available |
| Empty state | Explains the situation and the next step |

## 8. Feedback and state

| State | Visual |
| --- | --- |
| Loading (navigation) | Full-screen overlay with spinner |
| Loading (page) | Inline spinner or skeleton in the content area |
| Empty | Icon, short explanation, optional action |
| Error | Toast plus a retry affordance where the page supports it |
| Offline | Full-screen notice with "Retry now", then "You're back online" |
| Superseded session | Full-screen notice with "Sign out & sign in again" |
| Impersonating | Persistent banner plus a sidebar notice |

## 9. Content and tone

- Second person, active voice: "Add a member", "Retry", "Publish".
- Errors say what happened and what to do: "Unable to load events right now." rather than "Error".
- Destructive confirmations name the object: "Delete the Birthday event for Asha?"
- Dates use the user's locale and time zone.
- Numbers use grouping where meaningful; percentages are rounded.

## 10. Accessibility commitments

- Every icon-only button has an `aria-label`.
- Overlays use `role="dialog"`/`aria-modal` and a visible close action.
- Escape closes sheets, dialogs and filter popovers.
- Focus rings are visible in every theme.
- Colour is never the only signal.
- Tables have header cells and captions where practical.

Full detail in [`accessibility-guidelines.md`](accessibility-guidelines.md).

## 11. UX risks and improvements

| Risk | Improvement |
| --- | --- |
| Long admin tables on mobile | Card layout exists for login locations; extend to other tables |
| Filter-heavy toolbars | Provide saved filter sets |
| Theme contrast varies | Add automated contrast checks per theme |
| No bulk actions across pages | Offer "select all matching" with server-side bulk endpoints |
| Chat is feature-rich | Add a short first-run hint |
| Unrouted screens in the codebase | Remove them so the product surface matches the docs |
