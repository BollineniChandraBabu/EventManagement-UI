# Responsive Design

## 1. Breakpoints

The layout uses Bootstrap/MDB breakpoints, which the global CSS extends:

| Name | Width | Layout |
| --- | --- | --- |
| Extra small | < 576 px | Single column; slide-down nav; stacked cards |
| Small | ≥ 576 px | Single column, wider padding |
| Medium | ≥ 768 px | Two-column forms and KPI grids |
| Large | ≥ 992 px | Persistent sidebar; tables |
| Extra large | ≥ 1200 px | Wider content, three/four-column KPI grids |

Design targets: **360 px** minimum width and **1920 px** maximum tested width.

## 2. Shell behaviour

| Viewport | Sidebar | Mobile menu button | Content |
| --- | --- | --- | --- |
| ≥ 992 px | Persistent, collapsible to icons | Hidden (`d-lg-none`) | Offset by sidebar width |
| < 992 px | Off-canvas panel opened by the hamburger | Visible | Full width |

- The mobile panel slides down and closes when a navigation item is clicked
  (`closeMobileMenu()`).
- The panel uses `--nav-panel-bg` and `--nav-panel-blur` so it stays opaque over page content, even
  in glass-like themes.
- The chat widget hides while the mobile menu is open (`hide-on-mobile-menu`) so it does not overlap
  the panel.
- The impersonation and notification banners stack above the content and wrap their text.

## 3. Page patterns

### 3.1 Lists and tables

| Viewport | Presentation |
| --- | --- |
| ≥ 992 px | Table with sortable headers, row actions, checkbox column |
| 768–991 px | Table with fewer columns or horizontal scroll inside a container |
| < 768 px | Stacked cards or horizontally scrollable table (varies by screen) |

Login locations has an explicit desktop-table / mobile-card switch. Other admin tables rely on a
horizontal scroll container.

### 3.2 Forms

- Single column below 768 px; two columns above.
- Labels stay above their inputs (no floating labels that hide on small screens).
- Full-width primary buttons on small screens.
- File inputs and previews scale to the container.

### 3.3 Dashboard

- KPI cards: 1 column on phones, 2 on small tablets, 4 on desktop.
- Charts stack vertically on small screens and share a row on large screens.
- The date range controls wrap; presets stay on one line where possible.

### 3.4 Calendar

- Month view on phones shows compact day cells with a dot or count instead of chips.
- Week and day views scroll horizontally where needed.
- The day sheet becomes a bottom sheet on mobile.
- Swipe left/right changes the period (minimum 60 px horizontal movement, and only when the
  vertical movement is smaller, so vertical scrolling is not hijacked).

### 3.5 Chat

- The widget opens as a near-full-screen panel on phones and as a floating panel on desktop.
- The conversation list and the thread are separate views on small screens (list → thread → back).
- Message action menus open on tap rather than hover on touch devices (hover capability detected
  once).

## 4. Typography and spacing

- Body text stays at least 16 px on phones to avoid iOS input zoom.
- Touch targets are at least 40 × 40 px (icon buttons include padding).
- Spacing uses consistent scale (`py-3`, `mb-3`, `gap-2`), reducing on phones.
- Tables use smaller type than cards, but never below ~12 px.

## 5. Images and media

- Preview images use `max-width: 100%` and preserve aspect ratio.
- Video and audio previews are constrained to the container width.
- PDF previews use an iframe sized to the container with a download fallback.
- Profile pictures use fixed circular dimensions with `object-fit: cover`.

## 6. Themes and responsiveness

Every theme must be verified at 360 px, 768 px and 1280 px. Themes with translucent surfaces
(glassmorphism, liquid-glass, spatial-ui) are the highest risk because translucency can reduce
contrast over page content, especially in the mobile nav panel.

## 7. Testing the responsive layout

| Check | How |
| --- | --- |
| No horizontal scroll at 360 px | Browser device toolbar; check `document.body.scrollWidth` |
| Sidebar opens and closes | Tap the hamburger; tap a nav item |
| Chat does not overlap the menu | Open the menu with the chat closed and open |
| Tables remain usable | Scroll the table container; ensure actions are reachable |
| Modals fit | Open the day sheet, confirm dialog and wish preview on a phone |
| Landscape phones | Rotate; ensure the sidebar and chat still fit |
| 200% zoom | Zoom to 200%; content must reflow without clipping |

## 8. Known responsive issues

| Issue | Impact | Fix |
| --- | --- | --- |
| Admin tables rely on horizontal scroll | Awkward on phones | Add card layouts as done for login locations |
| Dense filter toolbars wrap unpredictably | Hard to scan | Collapse filters into a sheet on small screens |
| Calendar month cells are cramped below 400 px | Hard to read entries | Show counts instead of titles |
| Chat action menus can overflow near edges | Actions partly off-screen | Clamp menu position to the viewport |
| Long email addresses in tables | Column blowout | Truncate with ellipsis and a title attribute |

## 9. Related documents

- [`ui-ux-design.md`](ui-ux-design.md)
- [`accessibility-guidelines.md`](accessibility-guidelines.md)
