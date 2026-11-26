# Low-Level Design

Implementation-level design: services, guards, interceptors, pipes, utilities and the key
methods of each component. Signatures are shown as they appear in the source.

## 1. `AuthService` (`core/services/auth.service.ts`)

| Member | Signature / type | Notes |
| --- | --- | --- |
| `authenticated` | `Signal<boolean>` (computed) | Reflects stored token presence |
| `role` | `Signal<UserRole>` | `ROLE_ADMIN` or `ROLE_USER` |
| `isAdmin` | `Signal<boolean>` | `false` while impersonating |
| `concurrentLoginNotice` | `Signal<string \| null>` | Non-null shows the blocking overlay |
| `login` | `(request: LoginRequest) => Observable<TokenResponse>` | Stores session on success |
| `googleSsoLogin` | `(idToken, rememberMe, loginLocation?, forceMfa?) => Observable<TokenResponse>` | |
| `googleSsoToken` | `() => Observable<AuthSSOClientResponse>` | Client id |
| `directLogin` | `(request: DirectLoginRequest) => Observable<TokenResponse>` | Always persists to `localStorage` |
| `loginAsUser` / `switchBackToAdmin` | `(email) / () => Observable<TokenResponse>` | Impersonation |
| `sendOtp` / `verifyOtp` / `verifyLoginOtp` | OTP flows | `verifyOtp` is the registration-style verify; `verifyLoginOtp` is used by the UI |
| `sendResetLink` / `resetPassword` / `changePassword` | `Observable<void>` | |
| `getProfile` | `() => Observable<AppUser>` | `GET /users/me` |
| `refreshToken` | `() => Observable<TokenResponse>` | Uses the stored refresh token |
| `logout` | `() => void` | Stops impersonation first, then clears and navigates |
| `flagConcurrentLogin` | `(message: string) => void` | Clears tokens, sets notice, no navigation |
| `getAccessToken` | `() => string \| null` | Reads `localStorage` then `sessionStorage` |
| `navigateAfterLogin` | `(redirectUrl?: string \| null) => Promise<boolean>` | Safe-redirect validation |
| private `setSession` | `(response, rememberMe) => void` | Clears old, writes new, schedules timers |
| private `scheduleAutoLogout` | `(expiresInSeconds?: number) => void` | Refresh at `expiresIn-30`, logout at `expiresIn` |
| private `refreshOrLogout` | `() => void` | Ignores concurrent-login errors |
| private `autoLogout` | `() => void` | No-op while the notice is showing |
| private `getSafeRedirectUrl` | `(url?) => string \| null` | Only internal paths; never an auth page |

## 2. `ApiService` (`core/services/api.service.ts`)

Grouped by domain (method names only; all return typed observables unless noted):

| Domain | Methods |
| --- | --- |
| Dashboard | `getDashboard`, `getIGDashboard`, `getMailChart`, `getInstaChart`, `getOtpMailDashboard`, `getForgotPasswordMailDashboard`, `getOtpMailChart`, `getForgotPasswordMailChart`, `getLoginLocationChart`, `getViolatedUsersDashboard` |
| Users | `users`, `directoryUsers`, `getUsersFilterValues`, `saveUser`, `updateUser`, `userById`, `deactivateUser`, `deactivateUsers` |
| Wish images | `wishImages`, `getWishImagesFilterValues`, `createWishImage`, `updateWishImage`, `deleteWishImage`, `deleteWishImages` |
| Seeds | `relationshipSeeds`, `relationshipSeedsPaged`, `getRelationshipSeedsFilterValues`, `relationshipSeedById`, `saveRelationshipSeed`, `updateRelationshipSeed`, `deleteRelationshipSeed(s)`, `eventTypeSeeds`, `eventTypeSeedsPaged`, `getEventTypeSeedsFilterValues`, `eventTypeSeedById`, `saveEventTypeSeed`, `updateEventTypeSeed`, `deleteEventTypeSeed(s)` |
| Events | `events`, `getEventsFilterValues`, `saveEvent`, `saveEventWithImage`, `eventById`, `updateEvent`, `updateEventWithImage`, `deleteEvent`, `deleteEvents` |
| Festivals / calendar | `festivals`, `allSpecialEvents`, `calendar` |
| Festival wishes | `festivalWishMappings`, `festivalWishMappingsPaged`, `getFestivalWishMappingsFilterValues`, `myFestivalWishMappings`, `saveFestivalWishMappingWithImage`, `saveFestivalWishMappingsBulk`, `festivalWishMappingSummary`, `saveFestivalWishMapping`, `deleteFestivalWishMapping(s)` |
| Agents | `agentStatus`, `askAdminCopilot`, `runDeliveryOpsAgent` |
| AI | `aiWish`, `getPollinationsBalance` |
| Email | `emailImage`, `emailStatuses`, `getEmailStatusesFilterValues`, `deleteEmail(s)`, `sendTestEmail`, `retryEmail` |
| Account | `updateWishSettings`, `updateMyMfa`, `updateMyConcurrentLogin`, `updateUserConcurrentLogin`, `getMyWishPreview`, `getProfilePictureUploadUrl`, `uploadMyProfilePicture`, `removeMyProfilePicture` |
| Themes | `listThemes`, `getMyTheme`, `saveMyTheme` |
| Notifications | `notifications`, `notificationsPaged`, `getNotificationsFilterValues`, `notificationById`, `createNotification`, `updateNotification`, `deleteNotification(s)`, `publishNotification`, `unpublishNotification`, `latestPublishedNotification` |
| Schedulers | `schedulers`, `triggerScheduler` |

Private helpers: `idsParams`, `eventFormData`, `pagedParams`, `normalizePaged`,
`normalizeCollection`, `normalizeUserPayload`, `wishImageFormData`, `normalizeEnumSeedPayload`,
`unwrap`, `normalizeWishPreview`, `requestWithFallback`.
Constants: `relationshipSeedPaths = ['/seed/relationships', '/relation-seeds']`,
`eventTypeSeedPaths = ['/seed/event-types', '/event-types-seeds']`.

## 3. `ChatService` (`core/services/chat.service.ts`)

| Member | Signature | Notes |
| --- | --- | --- |
| `socketEvents$` | `Observable<ChatSocketEvent>` | Union of message, seen/typing, delete, edit, presence |
| `currentUserId$` | `Observable<number \| null>` | Resolved from the profile once |
| `ensureCurrentUser` | `() => Observable<number \| null>` | Caches the id |
| `listUsers` / `listActiveUsers` | `() => Observable<ChatUser[]>` | Active users endpoint is paged |
| `listConversations` | `() => Observable<ChatConversation[]>` | |
| `conversationMessages` | `(otherUserId, page, size, markSeen) => Observable<ChatMessagePage>` | |
| `sendMessage` | `(receiverId, text, attachment?, replyToMessageId?, reactionEmoji?) => Observable<ChatMessage>` | Multipart with a JSON `payload` part |
| `deleteLastSentMessage` / `deleteMessageById` / `deleteMessagesByIds` | delete operations | Batch uses repeated `ids` |
| `editMessage` | `(messageId, text) => Observable<ChatMessage>` | PATCH |
| `getReactions` / `addReaction` / `removeReaction` | reaction operations | |
| `downloadAttachment` | `(messageId) => Observable<Blob>` | |
| `sendPresenceHeartbeat` / `sendPresenceOffline` | `() => Observable<void>` | Presence |

Socket internals: manual STOMP framing, `subscribedTopics` set, `reconnectTimer`, resubscription
on reconnect.

## 4. Guards

| Guard | Signature | Behaviour |
| --- | --- | --- |
| `authGuard` | `CanActivateFn` | Allow if authenticated; else route a `token` query to `/direct-login`; else `/login?redirectUrl=…` |
| `guestGuard` | `CanActivateFn` | Allow only anonymous; authenticated → `/dashboard` |
| `adminGuard` | `CanActivateFn` | Allow only `ROLE_ADMIN`; else `/dashboard` |
| `resetLinkGuard` | `CanActivateFn` | `token` + `email` → `/reset-password?…`; else `/dashboard` or `/login` |
| `locationAccessGuard` | `CanActivateFn` | Caches a shared location check (`shareReplay(1)`); denies outside IN/AP/Telangana; inverts for `/restricted-region` |

## 5. Interceptors

| Interceptor | Logic |
| --- | --- |
| `loadingInterceptor` | Skip `loading.start()` for URLs containing `/chat`, `/agent/`, or matching `/emails/status/\d+/image$`; `finalize` always stops |
| `authInterceptor` | Skip the header for `https://ipinfo.io/`; on `status 0` to the API origin call `reportRequestFailure()`; on 403 `logout()`; on 401 either flag concurrent login or refresh-and-retry once; after the refresh fails, flag or logout |

`isBackendRequest(url)` compares origins with `environment.apiUrl`.

## 6. Pipes

| Pipe | Purity | Transform |
| --- | --- | --- |
| `sensitiveEmail` | Impure | `SensitiveDataService.maskEmail(value)` |
| `sensitiveValue` | Impure | `SensitiveDataService.mask(value)` |

Impure by design: the result depends on the shared `hidden` signal, which is not an input.

## 7. Pure utilities

### `core/utils/media.ts`

| Export | Signature | Behaviour |
| --- | --- | --- |
| `MEDIA_KIND_RULES` | `MediaKindRule[]` | image 5 MB, video 50 MB, audio 10 MB, document (PDF) 20 MB |
| `MEDIA_ACCEPT`, `IMAGE_ACCEPT` | `string` | Exact MIME lists for `accept` |
| `MEDIA_HINT`, `IMAGE_HINT` | `string` | Human-readable limits |
| `MAX_ATTACHMENT_BYTES` | `50 MB` | Chat attachments |
| `mediaKindOf` | `(file: File) => MediaKind` | MIME first, then extension |
| `isSupportedMedia` | `(file) => boolean` | |
| `formatBytes` | `(bytes) => string` | "5 MB" / "512 KB" |
| `mediaError` | `(file) => string \| null` | Unsupported type or over-limit |
| `imageError` | `(file) => string \| null` | Image-only contexts |
| `previewKindFor` | `(contentType, fileName?) => MediaPreviewKind` | image/video/audio/pdf/null |

### `core/utils/wishes-url.ts`

`WISHES_URL_MAX_LENGTH = 500`; `wishesUrlError(value)` checks emptiness (valid), length, spaces and
control characters, absolute URL parse, `http(s)` scheme, hostname presence, and absence of
credentials. `core/utils/wishes-url.validator.ts` wraps it as an Angular `ValidatorFn`.

### `core/utils/api-error.ts`

`backendMessage(error)`, `apiErrorMessage(error, fallback)` (429 and concurrent-login aware),
`isRateLimited(error)`, `isConcurrentLoginError(error)` (401 + `CONCURRENT_LOGIN` prefix),
`concurrentLoginMessage(error)` (strips the marker).

### `core/utils/notification-schedule.ts`

`toDateTimeLocal(value)` (local `datetime-local` string), `scheduleError(fields, now)` (ordering,
past start, past end).

### `core/utils/csv.ts`

`csvCell(value)` escapes quotes and prefixes formula-triggering characters; `toCsv(header, rows)`
joins with CRLF.

### `core/utils/circle-chat.ts`

`isInCircle`, `canMessage`, `messageLockReason`, `filterCircleUsers`, `filterCircleConversations`.

### `features/calendar/calendar.utils.ts`

Date helpers (`parseCalendarDate`, `toIsoDate`, `startOfDay`, `addDays`, `startOfWeek`,
`addMonths`, `isLeapYear`, `isSameDay`, `daysBetween`, `ordinal`), view helpers (`monthGridDays`,
`visibleDays`, `monthYearsToLoad`), entry helpers (`kindOf`, `iconFor`, `occursOn`,
`nextOccurrenceOf`, `milestoneFor`, `toEntry`, `entriesFor`, `buildDays`, `countByKind`),
upcoming (`upcomingEntries`, `relativeDayLabel`, `agendaGroups`).

### `features/events/event.utils.ts`

`nextOccurrence(eventDate, recurring, today)`, `daysUntilText(days)`, `eventTypeIcon(code)`.

### `features/festival-wish-mappings/festival-mappings.utils.ts`

`statusOf`, `festivalTiming`, `festivalOccurrence`, `festivalTimingNext`, `pickableFestivals`,
`filterUsers`, `toggleId`, `addIds`, `removeIds`, `lastSentLabel`, `bulkResultMessage`.

### `features/dashboard/dashboard.utils.ts`

`deliveryHealth(stats)` → `{rate, tone, label}`.

### `features/login-locations/login-locations.utils.ts`

`locationOf`, `hasCoordinates`, `mapsUrl`, `computeKpis`, `summarizeUsers`, `topLocations`,
`usersWithMultipleLocations`, `filterPoints`, `sortPoints`, `paginate`, `timeAgo`, `toCsv`.

### `features/violated-users/violated-users.utils.ts`

`toDateInputValue`, `rangeFor`, `presetFor`, `toChartBars`, `suspicionOf`, `riskBadges`,
`locationLabel`, `coordinatesOf`, `ipLookupFailed`.

## 8. Component-level design (selected)

### `AppComponent`

| Member | Purpose |
| --- | --- |
| `effect` #1 | On auth change: load/reset the theme, start/stop notification realtime |
| `effect` #2 | Once per access token, fetch and show the wish preview |
| `consumeNotification` | Validates title/message/dismissal, evaluates the schedule window, shows banner/toast |
| `evaluateScheduledCandidate` | Runs every second while a candidate exists; clears when the window ends |
| `fetchInitialNotification` | `latestPublishedNotification()` then collection fallback |
| `exitImpersonation` | `switchBackToAdmin()` then stop impersonation and go to `/users` |
| `wishPreviewImage` | Normalises string or byte-array image data into a data URL |

### `CalendarComponent`

| Member | Purpose |
| --- | --- |
| `refresh(force)` | Computes `monthYearsToLoad`, `forkJoin`s uncached fetches, caches, rebuilds |
| `rebuild` | Builds day views, agenda, upcoming, counts |
| `setCursor` / `moveCursor` / `jumpYear` | Navigation with cache-aware reload |
| `downloadIcs` / `googleCalendarUrl` / `copyDaySummary` | Day exports |
| `festivalIdOf` | Extracts the festival id from an entry for the wish panel |
| `openEntry` / `openDay` / `closeEntry` / `closeDay` | Dialog and sheet state |

### `EventEditorComponent`

| Member | Purpose |
| --- | --- |
| `form` | `userId`, `eventType`, `eventDate`, `recurring`, `wishesUrl` |
| `load` | `forkJoin` users, event types, optional event |
| `onImageSelected` | Validate with `mediaError`, preview via object URL |
| `save` | Chooses JSON or multipart endpoint depending on whether a new file exists |
| `patchFromEvent` | Keeps a deactivated type, normalises the date, shows existing media |

### `FestivalWishesPanelComponent`

`ngOnChanges` resets state and reloads when `festivalId` changes; admins additionally load users.
Methods cover add (single/bulk), edit (note/link/image/active), toggle, delete, and read-only
rendering for non-admins.

### `ChatWidgetComponent`

1 416 lines covering: open/close, conversation list, thread paging, send, reply, edit, delete
(single/batch), reactions, star/pin, in-thread search, emoji picker, attachment preview, typing and
seen, presence heartbeat, hover/tap interaction, and the circle gate.

## 9. Models (`core/models`)

| File | Key types |
| --- | --- |
| `api.models.ts` | `ApiResponse`, `PagedResponse`, `DashboardStats`, `AppUser`, `SaveUserPayload`, `DirectoryUser`, `EventItem`, `SaveEventPayload`, `FestivalItem`, `FestivalWishMapping`, `CalendarResItem`, `EmailStatus`, `NotificationItem`, `SchedulerItem`, `AgentStatus`, `ThemeStyle`, `WishImage`, … |
| `auth.models.ts` | `LoginRequest`, `TokenResponse`, `OtpRequest`, `OtpVerifyRequest`, `LoginOtpVerifyRequest`, `DirectLoginRequest` |
| `chat.models.ts` | `ChatUser`, `ChatConversation`, `ChatMessage`, `ChatMessagePage`, `ChatSocketEvent` union |
| `circle.models.ts` | `CircleMember`, `CircleRequest`, `CircleListResponse`, `CircleStatusResponse` |

## 10. Conventions for new code

1. Prefer `inject()` over constructor parameters.
2. Use `takeUntilDestroyed(this.destroyRef)` on component subscriptions.
3. Keep pure logic in `*.utils.ts` and add a `.spec.ts`.
4. Normalise any new response shape inside `ApiService`.
5. Never write signals inside `effect()`; defer with `queueMicrotask` (see `AppComponent`).
6. Use `apiErrorMessage(error, fallback)` for user-facing errors.
7. Use `ConfirmDialogService` for anything destructive.
8. Add an `aria-label` to every icon-only button.
