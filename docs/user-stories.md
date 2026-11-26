# User Stories

Format: **As a** \<role\>, **I want** \<capability\>, **so that** \<benefit\>.
Each story lists priority (M/S/C), the functional requirements it satisfies, and the key
acceptance checks. Detailed scenarios are in [`use-cases.md`](use-cases.md); formal
acceptance conditions are in [`acceptance-criteria.md`](acceptance-criteria.md).

Personas:

- **Asha — the family organiser (User).** Keeps birthdays, anniversaries and festivals for her family.
- **Ravi — the invited friend (User).** Joins a circle, chats, and receives wishes.
- **Meera — the operations administrator (Admin).** Runs delivery, manages users, monitors abuse.
- **Sam — the guest.** Has not signed in yet.

---

## Authentication and account

| ID | Story | Pri | FRs |
| --- | --- | --- | --- |
| US-001 | As Sam, I want to sign in with my email and password so that I can reach my celebrations. | M | FR-AUTH-01, FR-AUTH-18 |
| US-002 | As Sam, I want my session to be remembered when I tick "remember me", and to end when I close the browser when I do not, so that shared devices stay safe. | M | FR-AUTH-01 |
| US-003 | As Sam, I want to sign in with Google so that I do not have to remember another password. | S | FR-AUTH-04 |
| US-004 | As Sam, I want to sign in with a one-time code emailed to me so that I can still get in without a password. | S | FR-AUTH-05 |
| US-005 | As Asha, I want to enter the code when the app asks for a second step so that my account is protected even if my password leaks. | M | FR-AUTH-03 |
| US-006 | As Sam, I want to reset a forgotten password from an emailed link so that I can regain access. | M | FR-AUTH-06, FR-AUTH-07, FR-AUTH-08 |
| US-007 | As Ravi, I want a one-time sign-in link in a circle-request email so that I can accept without creating a password first. | S | FR-AUTH-09 |
| US-008 | As Asha, I want to be told clearly when my session ended because I signed in elsewhere, so that I understand why and can sign in again. | M | FR-AUTH-15, FR-AUTH-16 |
| US-009 | As Asha, I want to be signed out automatically when my session expires so that my account is not left open. | M | FR-AUTH-11, FR-AUTH-12 |
| US-010 | As Asha, I want to return to the page I originally asked for after signing in so that I do not lose my place. | M | FR-AUTH-18 |
| US-011 | As Asha, I want to change my password from my account page so that I can recover from a suspected compromise. | M | FR-AUTH-10 |

## Account and preferences

| ID | Story | Pri | FRs |
| --- | --- | --- | --- |
| US-012 | As Asha, I want to turn birthday, good-morning and good-night wishes on or off so that I only receive what I want. | M | FR-ACCT-02 |
| US-013 | As Asha, I want to require a code at every sign-in so that my account has a second factor. | M | FR-ACCT-03 |
| US-014 | As Asha, I want to allow only one active session so that signing out an old device is automatic. | M | FR-ACCT-04 |
| US-015 | As Asha, I want to upload a profile picture so that my circle and chats feel personal. | M | FR-ACCT-06 |
| US-016 | As Asha, I want to choose how the app looks so that it feels like mine. | M | FR-ACCT-07 |
| US-017 | As Meera, I want to see the remaining AI credit so that I can act before wish generation stops. | S | FR-ACCT-08 |

## Dashboard and delivery visibility

| ID | Story | Pri | FRs |
| --- | --- | --- | --- |
| US-018 | As Meera, I want a dashboard of users, upcoming events, sent and failed emails so that I know the health of the service at a glance. | M | FR-DASH-01, FR-DASH-02 |
| US-019 | As Meera, I want to chart sent and failed mail for a date range so that I can spot a bad day. | M | FR-DASH-03, FR-DASH-04 |
| US-020 | As Meera, I want a single delivery-health percentage so that I can judge whether today is healthy without reading the chart. | M | FR-DASH-05 |
| US-021 | As Meera, I want to browse emails by type, search them, preview them on desktop and mobile, and see the image, so that I can answer "did my mother get her birthday email?". | M | FR-EMAIL-01 … FR-EMAIL-04 |
| US-022 | As Meera, I want to retry a failed email so that a user does not miss their greeting. | M | FR-EMAIL-05 |
| US-023 | As Meera, I want to delete test or wrong records so that the log stays useful. | M | FR-EMAIL-06 |

## Events and calendar

| ID | Story | Pri | FRs |
| --- | --- | --- | --- |
| US-024 | As Asha, I want to record a birthday or anniversary with its date and whether it repeats so that it is remembered every year. | M | FR-EVT-02 |
| US-025 | As Asha, I want to attach a photo, video, audio clip or PDF to an event so that the greeting is personal. | M | FR-EVT-05, FR-EVT-06 |
| US-026 | As Asha, I want to add a link to a custom wishes page so that recipients can see something special. | M | FR-EVT-04 |
| US-027 | As Meera, I want to see when an event will next occur so that I can confirm the schedule is right. | M | FR-EVT-07 |
| US-028 | As Asha, I want to see all celebrations in a month, week, day or list so that I can plan around them. | M | FR-CAL-01, FR-CAL-02 |
| US-029 | As Asha, I want to see birthdays and festivals in future years too so that the calendar is not empty when I look ahead. | M | FR-CAL-03, FR-CAL-04 |
| US-030 | As Asha, I want to know what is coming up in the next 30 days so that I can prepare. | M | FR-CAL-05 |
| US-031 | As Asha, I want to download a day as a calendar file or add it to Google Calendar so that it appears in my own calendar. | M | FR-CAL-07 |
| US-032 | As Asha, I want the calendar to remember my view and filters so that I do not reset them every visit. | S | FR-CAL-08 |
| US-033 | As Asha, I want to see the milestone year ("25th anniversary") so that I can plan something special. | S | FR-CAL-10 |
| US-034 | As Meera, I want to link people to a festival and add a note, image or link so that festival wishes are personal. | M | FR-FEST-01 … FR-FEST-03 |
| US-035 | As Ravi, I want to see my own festival wish so that I know what will be sent to me. | M | FR-FEST-04 |
| US-036 | As Meera, I want to see which festival wishes failed so that I can fix them. | M | FR-FEST-05, FR-FEST-07 |

## Family & Friends and chat

| ID | Story | Pri | FRs |
| --- | --- | --- | --- |
| US-037 | As Asha, I want to search for someone and send a circle request so that only people I know can reach me. | M | FR-CIR-02 |
| US-038 | As Ravi, I want to accept or reject a request so that I control who is in my circle. | M | FR-CIR-03 |
| US-039 | As Asha, I want to withdraw a request or remove a member so that I can correct a mistake. | M | FR-CIR-03, FR-CIR-04 |
| US-040 | As Asha, I want to see whether a member is online or when they were last seen so that I know if a reply is likely. | S | FR-CIR-05 |
| US-041 | As Asha, I want to chat with my circle, send a photo or file, reply, react and edit or delete my messages so that conversations feel natural. | M | FR-CHAT-02, FR-CHAT-03 |
| US-042 | As Asha, I want messages to arrive instantly and show typing and seen state so that chat feels live. | M | FR-CHAT-04 |
| US-043 | As Asha, I want the app to refuse to message someone outside my circle when the platform restricts chat so that I am not sharing with strangers. | M | FR-CHAT-05 |
| US-044 | As Asha, I want to search within a conversation and star important messages so that I can find things later. | S | FR-CHAT-07 |

## Administration

| ID | Story | Pri | FRs |
| --- | --- | --- | --- |
| US-045 | As Meera, I want to search, filter and sort users so that I can find an account quickly. | M | FR-USER-01 |
| US-046 | As Meera, I want to create and edit a user with their relationship, birthday, wish settings and security options so that the data is right from day one. | M | FR-USER-02, FR-USER-03, FR-USER-04 |
| US-047 | As Meera, I want to deactivate an account (or several) so that a leaver stops receiving and sending. | M | FR-USER-05, FR-USER-06 |
| US-048 | As Meera, I want to view the app as a user so that I can reproduce what they report. | S | FR-USER-07, FR-USER-09 |
| US-049 | As Meera, I want to return to my own session after impersonating so that I can continue administration. | S | FR-USER-07 |
| US-050 | As Meera, I want to publish an announcement and schedule it so that users hear from us in the app. | M | FR-NOTIF-01 … FR-NOTIF-05 |
| US-051 | As Meera, I want to unpublish an announcement before changing it so that users never see a half-edited message. | M | FR-NOTIF-04 |
| US-052 | As Meera, I want to trigger a scheduler manually so that a missed run can be caught up immediately. | M | FR-SCHED-01, FR-SCHED-02 |
| US-053 | As Meera, I want to run the delivery-ops agent and read its report so that failed emails are triaged for me. | M | FR-AGENT-01, FR-AGENT-02 |
| US-054 | As Meera, I want to ask the copilot a question in plain English so that I do not have to query the database. | M | FR-AGENT-03 |
| US-055 | As Meera, I want to manage the greeting-image library so that generated wishes have a suitable image. | M | FR-WISHIMG-01 … FR-WISHIMG-03 |
| US-056 | As Meera, I want to manage relationship and event-type seeds so that data entry matches our vocabulary. | M | FR-SEED-01, FR-SEED-02 |
| US-057 | As Meera, I want to see where users sign in from so that I can spot impossible travel or a shared account. | M | FR-SEC-01, FR-SEC-02 |
| US-058 | As Meera, I want to see failed sign-ins by IP and email so that I can block a guessing attack. | M | FR-SEC-03, FR-SEC-04 |
| US-059 | As Meera, I want to export security data as CSV so that I can share it with the security team without copy-paste errors. | M | FR-SEC-02, FR-SEC-05 |

## Platform and trust

| ID | Story | Pri | FRs |
| --- | --- | --- | --- |
| US-060 | As any user, I want a clear message when I lose connection and an automatic recovery so that I know it is not the app misbehaving. | M | FR-SYS-05 |
| US-061 | As any user, I want a loading indicator so that I know the app is working. | M | FR-SYS-04 |
| US-062 | As Meera, I want emails and codes hidden until I choose to reveal them so that shoulder-surfing and screenshots are safer. | M | FR-SYS-09, FR-USER-10 |
| US-063 | As any user, I want confirmation before anything is deleted so that I do not lose data by mistake. | M | FR-SYS-07 |
| US-064 | As Sam, I want the app to explain that it is only available in my region rather than failing silently, so that I understand what happened. | M | FR-SYS-03 |
| US-065 | As Asha, I want the app to work on my phone as well as my laptop so that I can use it anywhere. | M | FR-SYS-08 |
| US-066 | As Asha, I want to be told before upload that a file is too large or the wrong type so that I do not wait for a failure. | M | FR-EVT-05, FR-ACCT-06 |
