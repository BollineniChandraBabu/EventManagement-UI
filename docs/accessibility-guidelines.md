# Accessibility Guidelines

## 1. Target

**WCAG 2.1 Level AA** for all screens, with a small number of AAA aspirations (reduced motion,
larger target sizes). Accessibility is verified per release on the login page, dashboard, a table
screen, the calendar and the chat widget.

## 2. What is implemented today

| Area | Implementation |
| --- | --- |
| Landmarks | `<main>` for page content, `<aside>` for the sidebar, `<nav>` for the menu, `<footer>` |
| Page title | Static document title; no per-route update (gap) |
| Icon buttons | `aria-label` on sidebar collapse, mobile menu, wish-preview close, banner dismiss |
| Dialogs | `role="dialog"`, `aria-modal="true"`, `aria-label` on the wish preview, offline and concurrent-login overlays |
| Escape key | Closes the calendar day sheet/dialog, the multi-select popover and the chat widget |
| Focus visibility | Focus rings from the design tokens (`--c-primary-ring`) |
| Form labels | `<label for>` associated with each input; error text linked via `aria-describedby` |
| Colour | Status also carries text ("failed", "inactive", "Active"), not only colour |
| Touch targets | Icon buttons padded to at least ~40 px |
| Text alternatives | Meaningful `alt` on preview images; decorative icons marked `aria-hidden` where implemented |
| Motion | Transitions are short; no auto-playing animation beyond loading indicators |

## 3. Keyboard interaction

| Element | Keys |
| --- | --- |
| Sidebar links | Tab / Shift+Tab, Enter |
| Mobile menu button | Enter/Space toggles; Escape closes |
| Multi-select filter | Enter opens; Tab through options; Space toggles; Escape closes without applying |
| Confirm dialog | Tab cycles buttons; Enter activates the focused one; Escape cancels |
| Calendar | Tab to the grid and controls; Enter opens a day or entry; Escape closes |
| Chat | Tab through conversations; Enter sends; Shift+Enter inserts a newline; Escape closes menus |
| Tables | Tab to row actions; Space toggles a row checkbox |
| Toasts | Announced via `role="status"`/`role="alert"` where implemented; dismissible by button |

**Rule:** no functionality may be reachable only by hover or only by touch.

## 4. Screen reader guidance

- Each page should have one `<h1>`; sections use `<h2>`/`<h3>`.
- Tables use `<th scope="col">` for headers.
- Icon-only buttons always carry `aria-label`.
- Images have either meaningful `alt` or `alt=""` when decorative.
- Live regions: toasts and the notification banner should be announced politely.
- The chat thread should announce new incoming messages (gap: not yet a live region).
- Loading overlays should be `aria-busy` or announce "Loading".

## 5. Forms

1. Every control has a visible, associated label.
2. Required fields are marked and `aria-required` is set.
3. Errors are described next to the field and linked with `aria-describedby`.
4. Errors are not announced only by colour; the text states the problem.
5. Focus moves to the first invalid field on submit (recommended; not implemented everywhere).
6. Password visibility toggles have an accessible name that reflects the state.

## 6. Colour and contrast

| Requirement | Target |
| --- | --- |
| Body text | ≥ 4.5:1 |
| Large text (≥ 18.66 px bold / 24 px) | ≥ 3:1 |
| UI components and focus rings | ≥ 3:1 |
| Status text on tinted backgrounds | ≥ 4.5:1 |

The default theme uses `#0f172a` on `#ffffff` (well above 4.5:1) and `#475569` on white for
secondary text. Themes must be checked individually, particularly:
`neomorphism` (low contrast by design), `glassmorphism`, `liquid-glass` and `spatial-ui`
(translucency), and `maximalism`/`brutalism` (saturated backgrounds).

## 7. Focus management

| Situation | Expected |
| --- | --- |
| Opening a dialog | Focus moves into the dialog (first focusable or the close button) |
| Closing a dialog | Focus returns to the trigger |
| Route change | Focus moves to the page heading (gap: not implemented) |
| Inline error | Focus moves to the invalid field (recommended) |
| Mobile menu open | Focus moves into the panel; Escape closes and returns focus |

## 8. Images, media and charts

- Preview images: `alt` describes the celebration, not the file name.
- Video: controls enabled; no autoplay with sound.
- Audio: controls enabled.
- PDF: an iframe plus a visible download link as an alternative.
- Charts: provide a text summary or the underlying numbers in a table/cards, because CanvasJS
  renders to a canvas that screen readers cannot read. The dashboard KPI cards already provide the
  headline numbers.

## 9. Motion and timing

- Transitions are ≤ 0.35 s.
- The offline "back online" progress bar auto-dismisses; no user action is required.
- The notification banner does not auto-dismiss.
- Toasts auto-dismiss after 5 s; important errors should also be visible in the page where possible.
- `prefers-reduced-motion` is not yet honoured (tracked gap).

## 10. Responsive and zoom

- Content must reflow at 320 px and at 200% zoom without loss of function.
- No horizontal scrolling for text content.
- Touch targets at least 40 × 40 px.
- Orientation changes must not hide controls.

## 11. Testing checklist

**Manual (each release)**

- [ ] Tab through the login page, dashboard, events list, calendar and chat without a mouse.
- [ ] Confirm a visible focus indicator at every stop.
- [ ] Open and close every dialog with the keyboard; focus returns to the trigger.
- [ ] Trigger a form error; confirm the message is linked to the field.
- [ ] Zoom to 200% and check for clipping.
- [ ] Switch to each theme and check text contrast on the sidebar, buttons and tables.
- [ ] Run a screen reader over the login and dashboard pages.

**Automated**

- [ ] axe DevTools or Lighthouse accessibility audit on five key pages.
- [ ] Contrast checks per theme.
- [ ] HTML validation for duplicate ids.

## 12. Known accessibility gaps

| Gap | Impact | Priority |
| --- | --- | --- |
| No per-route document title | Screen-reader users cannot tell pages apart | High |
| No focus move on route change | Focus stays on the old link | Medium |
| Chat new-message announcements missing | Blind users miss incoming messages | Medium |
| Canvas charts have no text alternative | Chart data unavailable to screen readers | Medium |
| `prefers-reduced-motion` not honoured | Motion-sensitive users cannot opt out | Low |
| Some tables lack `scope`/caption | Harder table navigation | Medium |
| Mobile menu focus trap not verified | Focus can escape the open panel | Medium |
| Error summary on long forms missing | Users may not find the failing field | Low |

## 13. Definition of done for a new screen

1. Keyboard operable end to end.
2. One `<h1>`, logical heading order.
3. Every control labelled; every icon button has `aria-label`.
4. Errors described in text and linked to fields.
5. Contrast verified in the default and at least two other themes.
6. Works at 360 px and 200% zoom.
7. axe reports no critical issues.
8. Dialogs trap focus and restore it.
