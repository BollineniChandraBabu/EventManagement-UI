# Project Overview

## 1. Purpose of this document

This document explains, in business language, what Golden Greetings is for, what it covers,
what it deliberately leaves out, and how success is measured. It is the entry point for
product owners, business analysts, QA leads and new engineers. Technical detail lives in
[`system-architecture.md`](system-architecture.md) and
[`high-level-design.md`](high-level-design.md).

## 2. Product summary

Golden Greetings is a web application that helps a person or a family keep track of the
celebrations in their life and send warm, personalised greetings on those dates. It combines
four ideas in one product:

1. **A celebration record.** Birthdays, anniversaries, festivals and one-off events are stored
   per person, with optional recurrence, an optional custom wishes page and optional media.
2. **An automated greeting pipeline.** A backend scheduler turns those records into emails —
   birthday wishes, good-morning and good-night notes, festival wishes — and records every
   delivery attempt.
3. **A private social layer.** Users form mutual "circles" (family and friends) and can chat
   only with people in that circle.
4. **An operations console.** Administrators can see what was sent, retry failures, manage
   users, audit sign-in locations and failed sign-in attempts, publish announcements, trigger
   schedulers, and use AI helpers for triage and questions.

The repository under review is the **Angular 17 front end**. It is a stateless client: every
record, every rule that must be enforced for security, and every scheduled send lives in the
Spring Boot backend. The front end owns presentation, client-side validation that mirrors the
backend, session handling, navigation and real-time updates.

## 3. Business context

| Aspect | Description |
| --- | --- |
| Domain | Personal celebration management and greeting-email delivery |
| Primary users | Individuals managing family celebrations; a small operations team running the service |
| Deployment model | Public SPA on Firebase Hosting, backend API hosted separately (currently a Render service in the dev environment) |
| Reach | Restricted to India, specifically Andhra Pradesh and Telangana (enforced by a client-side location guard and intended to be paired with server-side controls) |
| Commercial model | Not expressed in the codebase; the product is treated as a private/family service with an admin team |
| Language | UI copy is English; generated wishes support multiple languages (the AI wish form exposes a language field) |

## 4. Objectives

| # | Objective | How it is realised |
| --- | --- | --- |
| O1 | Never miss a family celebration | Per-user events with recurrence, a calendar with upcoming strip, and scheduler-driven email delivery |
| O2 | Make greetings personal | AI wish generation, admin-uploaded greeting media per event type, per-user custom wishes links, per-festival custom notes |
| O3 | Give users control of what is sent | Per-user wish settings (birthday / good morning / good night), per-festival mapping activation |
| O4 | Keep the social layer private | Mutual, accepted circles; chat restricted to circle members when the backend flag is on |
| O5 | Make delivery observable and recoverable | Email status log with retry, dashboard delivery-health metrics, scheduler console, AI triage agent |
| O6 | Protect accounts and personal data | JWT sessions with refresh, optional MFA, optional single-session enforcement, location guard, sensitive-data masking, sign-in and failed-sign-in analytics |
| O7 | Let the service feel personal and modern | Eleven selectable themes, responsive layout, real-time chat and notifications |

## 5. Scope

### In scope

- Authentication: password, Google SSO, OTP, one-time direct links, password reset, MFA challenge, refresh and logout.
- User self-service: profile, wish settings, security settings, theme, password, profile picture.
- Celebration data: events CRUD, event types, relationship types, calendar views and exports.
- Delivery visibility: email status per email type, preview, retry, deletion.
- Social: circles and chat (including attachments, replies, reactions, presence).
- Administration: users, impersonation, notifications, schedulers, agents, wish images, festival wish mappings, seeds, security analytics.
- Platform behaviour: offline detection, global loading indication, sensitive-data masking, client-side media validation, theming, responsive layout.

### Out of scope

- The backend implementation, database schema, scheduler engine, mail transport and AI provider integration.
- Authoring of email templates in the browser: a `GrapesJS` dependency and a `template-editor` component exist, but the component is an empty placeholder and the route is not registered.
- A standalone AI-wish screen: `features/ai-wishes` exists but is not routed; wish generation is exposed only through the backend pipeline and the admin copilot.
- Payments, subscriptions, multi-tenancy and per-organisation branding.
- Native mobile applications.
- Server-side rendering: the build is a browser SPA (`@angular-devkit/build-angular:application` with a browser entry and no server entry).

## 6. High-level functionality

```
                 ┌───────────────────────────────────────────────┐
                 │             Golden Greetings SPA              │
                 │  Angular 17 · standalone components · signals │
                 └───────────────┬───────────────────────────────┘
                                 │ HTTPS (JWT bearer)
                 ┌───────────────▼───────────────────────────────┐
                 │            Spring Boot REST API               │
                 │  auth · users · events · calendar · circles   │
                 │  chat · emails · notifications · schedulers   │
                 │  themes · seeds · agent · dashboard           │
                 └───┬───────────┬───────────┬───────────┬───────┘
                     │           │           │           │
                 Database     Mail/SMTP    Object      AI providers
                 (JPA)        delivery     storage     (wish + copilot)
                                 │
                     WebSocket (STOMP) for chat + published notifications
```

The SPA has one shell (`AppComponent`) with a sidebar, a chat widget and global overlays.
Feature areas are lazily loaded per route. See [`routing-and-navigation.md`](routing-and-navigation.md).

## 7. Key product rules (summary)

- A circle is **mutual**: it exists only after the other person accepts. Sending a request to
  someone who already asked you accepts it instead.
- Festivals are stored **per year**; the calendar requests the year it is showing. Recurring
  celebrations roll forward to the next occurrence, so a festival from an earlier year still
  reads as upcoming.
- Only a **non-recurring anniversary** is tied to its exact date.
- Published notifications are **immutable** (no edit, no delete) until unpublished.
- A notification schedule must be in the **future**; a draft whose window has passed cannot be
  published.
- Impersonation keeps the **admin's token**; the UI only hides admin sections so the admin sees
  what the user sees. Security settings cannot be changed while impersonating.
- The location guard allows **India → Andhra Pradesh or Telangana** only.
- Media uploads follow the backend `MediaValidation` limits: image 5 MB, video 50 MB, audio
  10 MB, PDF 20 MB; profile pictures are image-only.

## 8. Success measures

| Measure | Target (proposed) | Data source |
| --- | --- | --- |
| Greeting delivery success rate | ≥ 98% daily | Dashboard delivery-health rate (`dashboard.utils.ts`) |
| Failed emails recovered | 100% of failures triaged within one day | Email status log + delivery-ops agent report |
| Sign-in success rate | ≥ 99% excluding genuine bad credentials | Login-locations page |
| Failed-sign-in visibility | Every IP guessing multiple emails is surfaced | Violated-users page (high suspicion ≥ 5 distinct emails) |
| Front-end performance | LCP < 2.5 s on a mid-range mobile connection | Lighthouse (see [`non-functional-requirements.md`](non-functional-requirements.md)) |
| Accessibility | No critical axe violations on login, dashboard, calendar | Manual + tooling audit |
| Chat adoption | Circle members exchange at least one message per active week | Chat usage (backend) |

## 9. Assumptions and dependencies

- The backend is the single source of truth and enforces authorisation; the client guards are
  convenience and defence in depth, not the security boundary.
- The backend exposes the contract described in [`frontend-api-integration.md`](frontend-api-integration.md).
- `ipapi.co` is reachable for IP geolocation; browser geolocation permission is optional.
- CDN assets (MDB UI Kit, Font Awesome, Google Fonts) are reachable; the app degrades
  gracefully in styling but not in function if they are not.
- Administrators exist in the backend and are identified by `ROLE_ADMIN`.

## 10. Related documents

- Business drivers: [`business-requirements.md`](business-requirements.md)
- Scope boundaries: [`scope-and-limitations.md`](scope-and-limitations.md)
- Functional detail: [`functional-requirements.md`](functional-requirements.md)
- Technical shape: [`system-architecture.md`](system-architecture.md)
