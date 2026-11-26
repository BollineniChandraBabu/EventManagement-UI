# Sequence Diagrams

Participants are abbreviated: **U** user/browser, **C** Angular component, **S** core service,
**I** HTTP interceptor, **API** backend, **DB** database, **WS** WebSocket broker.

---

## 1. Password sign-in

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant G as locationAccessGuard
    participant L as LoginComponent
    participant A as AuthService
    participant Geo as LocationService
    participant API as Backend
    participant St as Browser storage

    U->>G: open /events (anonymous)
    G->>Geo: getUserLocation()
    Geo->>Geo: browser GPS, else ipapi.co
    Geo-->>G: country/region
    alt not IN / AP / Telangana
        G-->>U: redirect /restricted-region
    else allowed
        G-->>U: redirect /login?redirectUrl=/events
        U->>L: email + password + rememberMe
        L->>Geo: resolveLoginLocation()
        Geo-->>L: city, region, country, ip, lat, lng
        L->>A: login({email, password, rememberMe, ...location, forceMfa:true})
        A->>API: POST /auth/login
        API-->>A: {accessToken, refreshToken, expiresIn, role}
        A->>St: store tokens (localStorage or sessionStorage)
        A->>A: set signals, schedule refresh + expiry
        L->>A: navigateAfterLogin(redirectUrl)
        A-->>U: /events
    end
```

## 2. MFA challenge

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant L as LoginComponent
    participant O as OtpLoginComponent
    participant A as AuthService
    participant API as Backend

    U->>L: submit password
    L->>API: POST /auth/login (forceMfa)
    API-->>L: 401 {message: "MFA_OTP_REQUIRED"}
    L->>O: navigate /otp-login (state: email, rememberMe, provider, location)
    O->>API: POST /auth/otp/send {email}
    API-->>O: 200
    O-->>U: "OTP sent"
    U->>O: enter code
    O->>API: POST /auth/otp/verify-login {email, otp, rememberMe, ...}
    API-->>O: {accessToken, refreshToken, expiresIn, role}
    O->>A: setSession(...)
    O-->>U: navigate redirectUrl or /dashboard
```

## 3. Token refresh on a 401

```mermaid
sequenceDiagram
    autonumber
    participant C as Component
    participant I as authInterceptor
    participant A as AuthService
    participant API as Backend

    C->>I: GET /api/users/me (stale token)
    I->>API: request with Bearer <stale>
    API-->>I: 401 (ordinary expiry)
    I->>A: refreshToken()
    A->>API: POST /auth/refresh {refreshToken}
    API-->>A: new token pair
    A->>A: store + reschedule timers
    I->>API: retry original request with new token
    API-->>I: 200
    I-->>C: response
```

## 4. Superseded session (concurrent login)

```mermaid
sequenceDiagram
    autonumber
    participant I as authInterceptor
    participant A as AuthService
    participant API as Backend
    participant O as ConcurrentLoginOverlay

    I->>API: any authenticated request
    API-->>I: 401 {message: "CONCURRENT_LOGIN: session replaced"}
    I->>I: isConcurrentLoginError → true, skip refresh
    I->>A: flagConcurrentLogin(message)
    A->>A: clear tokens, stop timers, set notice
    A-->>O: notice signal
    O-->>O: full-screen blocking notice
    Note over I,A: Later token-less failures are ignored while the notice is set
    O->>A: user clicks "Sign out & sign in again"
    A->>A: logout() → clear notice → /login
```

## 5. Create an event with greeting media

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant E as EventEditorComponent
    participant M as media.ts
    participant S as ApiService
    participant API as Backend
    participant DB as Database

    Admin->>E: open /events/new
    E->>S: forkJoin(users, eventTypeSeeds)
    S-->>E: options
    Admin->>E: choose file
    E->>M: mediaError(file)
    alt invalid type or size
        M-->>E: reason
        E-->>Admin: show reason, clear input
    else valid
        E->>E: preview via object URL
        Admin->>E: save
        E->>S: saveEventWithImage(payload, file)
        S->>API: POST /events/with-image (multipart)
        API->>DB: insert event + store media
        DB-->>API: saved
        API-->>S: event with imageUrl
        S-->>E: event
        E-->>Admin: success toast, navigate /events
    end
```

## 6. Calendar month load (per-year festivals)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant C as CalendarComponent
    participant Ut as calendar.utils
    participant S as ApiService
    participant API as Backend

    U->>C: open /calendar (view=month, cursor=2026-03)
    C->>Ut: monthYearsToLoad(view, cursor, today)
    Ut-->>C: [{3,2026},{2,2026},{4,2026},{today month},{next month}]
    loop each uncached year-month
        C->>S: calendar(month, year)
        S->>API: GET /api/calendar?month=..&year=..
        API-->>S: CalendarResItem[] (festivals non-recurring for that year)
        S-->>C: items
        C->>C: cache["2026-3"] = items
    end
    C->>Ut: buildDays(visibleDays, items, kinds, today)
    Ut-->>C: day cells with entries (occursOn)
    C->>Ut: upcomingEntries(items, today, 30 days)
    Ut-->>C: next 4 celebrations
    C-->>U: render grid + upcoming strip
```

## 7. Send a chat message

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant W as ChatWidgetComponent
    participant CS as ChatService
    participant API as Backend
    participant WS as STOMP broker
    actor R as Recipient

    U->>W: type text + attach file + send
    W->>W: canMessage(target, circleIds)
    alt not allowed
        W-->>U: composer locked with reason
    else allowed
        W->>CS: sendMessage(receiverId, text, file, replyTo)
        CS->>API: POST /api/chat (multipart)
        API->>WS: broadcast to both users
        API-->>CS: saved ChatMessage
        CS-->>W: message
        W-->>U: append to thread
        WS-->>R: MESSAGE frame
        R->>R: append to thread
    end
```

## 8. Publish a notification

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant N as NotificationsComponent
    participant S as ApiService
    participant API as Backend
    participant WS as STOMP broker
    actor U as Signed-in users

    Admin->>N: press Publish
    N->>N: scheduleError(item)
    alt schedule elapsed
        N-->>Admin: "can't be published yet, reschedule"
    else valid
        N->>S: publishNotification(id)
        S->>API: POST /notifications/{id}/publish
        API->>WS: NOTIFICATION_PUBLISHED
        API-->>S: published item
        S-->>N: item
        N-->>Admin: success toast, reload list
        WS-->>U: frame → AppComponent banner + toast
    end
```

## 9. Impersonation and return

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UC as UsersComponent
    participant A as AuthService
    participant Im as ImpersonationService
    participant API as Backend
    participant Shell as AppComponent

    Admin->>UC: "log in as" user
    UC->>UC: canImpersonate(user)
    UC->>A: loginAsUser(email)
    A->>API: POST /auth/admin/login-as-user
    API-->>A: user token pair
    A->>A: setSession (keep admin refresh for switch-back)
    UC->>Im: startImpersonation(user)
    Im->>Im: sessionStorage fw_impersonation
    Shell-->>Admin: banner + hidden admin nav + user theme
    Admin->>Shell: "Return to Admin"
    Shell->>A: switchBackToAdmin()
    A->>API: GET /auth/admin/switch-back
    API-->>A: admin token pair
    A->>Im: stopImpersonation()
    Shell-->>Admin: /users
```

## 10. Connectivity loss and recovery

```mermaid
sequenceDiagram
    autonumber
    participant CS as ConnectivityService
    participant API as Backend
    participant I as authInterceptor
    participant O as OfflineOverlay

    loop every 10 s
        CS->>API: HEAD /?_=ts (no-cors, 8 s timeout)
        alt reachable
            API-->>CS: any response
            CS->>CS: failures = 0, online = true
        else unreachable
            CS->>CS: failures++
            Note over CS: 2 consecutive failures → online = false
        end
    end
    I->>CS: reportRequestFailure() on status 0 to the API origin
    CS->>API: probe (conclusive)
    alt probe fails
        CS-->>O: online = false
        O-->>O: full-screen notice + Retry now
    end
    CS->>API: probe succeeds
    CS-->>O: online = true
    O-->>O: "You're back online", auto-dismiss, same route
```

## 11. Retry a failed email

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant E as EmailStatusComponent
    participant S as ApiService
    participant API as Backend
    participant Mail as Mail provider

    Admin->>E: filter status = FAILED
    E->>S: emailStatuses(..., statuses=["FAILED"])
    S-->>E: records
    Admin->>E: press Retry on a record
    E->>S: retryEmail(id)
    S->>API: POST /emails/status/{id}/retry
    API->>Mail: send again
    Mail-->>API: accepted
    API-->>S: updated status
    S-->>E: ok
    E-->>Admin: success toast, reload list
```

## 12. Location gate denial

```mermaid
sequenceDiagram
    autonumber
    actor U as Visitor
    participant G as locationAccessGuard
    participant L as LocationService
    participant Geo as Browser GPS
    participant IP as ipapi.co
    participant R as Router

    U->>G: open any route
    G->>L: getUserLocation()
    L->>Geo: getCurrentPosition (10 s timeout)
    alt GPS returns coords
        Geo-->>L: lat/lng (no country yet)
    else denied or timeout
        L->>IP: GET /json
        IP-->>L: country, region, lat, lng, ip
    end
    L-->>G: country/region (merged)
    alt country != IN or region not AP/Telangana
        G->>R: /restricted-region
        R-->>U: restricted notice
    else allowed
        G-->>U: continue to route
    end
```
