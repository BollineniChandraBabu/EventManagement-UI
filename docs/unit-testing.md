# Unit Testing

## 1. Framework

| Item | Value |
| --- | --- |
| Runner | Karma (`@angular-devkit/build-angular:karma`) |
| Framework | Jasmine 7 (`@types/jasmine`, `jasmine-core`) |
| Environment | `src/test.ts` initialises `BrowserDynamicTestingModule` |
| HTTP mocking | `provideHttpClientTesting` / `HttpTestingController` |
| Router mocking | `provideRouter([])` |
| Browser | `ChromeHeadlessNoSandbox` as configured in `angular.json` |

## 2. Running the tests

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

**Known blocker:** `angular.json` sets `"browsers": "ChromeHeadlessNoSandbox"`, but the repository
has no `karma.conf.js`. The custom launcher is therefore undefined and the run fails. Fix by adding
a `karma.conf.js`:

```js
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: { jasmine: {}, clearContext: false },
    reporters: ['progress', 'kjhtml'],
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
      }
    },
    restartOnFileChange: true
  });
};
```

Alternatively change the `browsers` option to `ChromeHeadless` and rely on the default launcher
(requires Chrome to run without `--no-sandbox`, which is often not true in containers).

## 3. Existing specs (16)

| Spec | Covers |
| --- | --- |
| `core/guards/auth.guard.spec.ts` | Anonymous redirect with `redirectUrl`; one-time token → `/direct-login`; signed-in pass-through |
| `core/interceptors/auth.interceptor.spec.ts` | Concurrent-login detection on first 401; ordinary refresh-and-retry; refresh rejected for concurrent login; scheduled refresh rejected; no sign-out after the notice |
| `core/services/api.service.spec.ts` | Endpoint construction and normalisation (subset) |
| `core/services/auth.service.spec.ts` | Session storage, timers, logout behaviour (subset) |
| `core/services/circle.service.spec.ts` | Circle list/request calls |
| `core/utils/api-error.spec.ts` | Backend message, 429, concurrent-login marker |
| `core/utils/circle-chat.spec.ts` | Circle gating helpers |
| `core/utils/media.spec.ts` | Kind detection, size limits, preview kind |
| `core/utils/notification-schedule.spec.ts` | Past/inverted schedule windows |
| `features/auth/direct-login.component.spec.ts` | Token exchange and failure message |
| `features/calendar/calendar.utils.spec.ts` | Recurrence, leap years, upcoming, milestones |
| `features/calendar/festival-wishes-panel.component.spec.ts` | Admin vs non-admin behaviour |
| `features/dashboard/dashboard.utils.spec.ts` | Delivery-health thresholds |
| `features/festival-wish-mappings/festival-mappings.utils.spec.ts` | Festival roll-forward, status, bulk message |
| `shared/chat-widget/chat-widget.component.spec.ts` | Core chat interactions (subset) |
| `shared/concurrent-login-overlay.component.spec.ts` | Notice rendering and action |

## 4. Conventions

### 4.1 Structure

```ts
describe('nextOccurrence', () => {
  const today = new Date(2026, 2, 1); // local date, never a UTC string

  it('rolls a recurring birthday into the current year', () => {
    const result = nextOccurrence('1990-03-15', true, today);
    expect(result?.date.getFullYear()).toBe(2026);
    expect(result?.daysUntil).toBe(14);
  });

  it('returns null for a one-time event in the past', () => {
    expect(nextOccurrence('2020-01-01', false, today)).toBeNull();
  });
});
```

### 4.2 Rules

1. **Pure functions first.** They need no TestBed and run in milliseconds.
2. **Pass `today` explicitly.** Never depend on the system clock for date logic.
3. **Use local dates.** `new Date(2026, 2, 1)`, not `new Date('2026-03-01')` (which is UTC and can
   shift a day).
4. **One behaviour per test.** Name it after the behaviour, not the method.
5. **No real HTTP.** Use `provideHttpClientTesting()` and `expectOne`.
6. **Clear storage** in `beforeEach`/`afterEach` for anything that touches it.
7. **Avoid mocks of the code under test.** Mock collaborators only (HTTP, router, sockets).
8. **Deterministic.** No `setTimeout` races; use `jasmine.clock()` where timing matters.
9. **Readable expectations.** Assert the value the user would see.

### 4.3 Angular testing

| Need | Pattern |
| --- | --- |
| Services with HTTP | `TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] })` |
| Guards | `TestBed.runInInjectionContext(() => guard(route, state))` |
| Interceptors | `provideHttpClient(withInterceptors([authInterceptor]))` + `HttpTestingController` |
| Signals | Read the signal after an action; no need to wait |
| Standalone components | Import the component directly in `TestBed` |
| Router | `provideRouter([])` and spy on `Router.navigate` |
| Timers | `jasmine.clock().install()/tick()/uninstall()` |

## 5. Priority gaps

| Untested target | Risk | Suggested tests |
| --- | --- | --- |
| `wishes-url.ts` | Medium — user input validation | Every rule and the empty case |
| `csv.ts` | Medium — injection protection | Escaping, formula prefix, CRLF |
| `event.utils.ts` | Medium — send-date correctness | Recurring, one-time, leap day, missing date |
| `login-locations.utils.ts` | Low — display only | KPIs, pagination, sorting |
| `violated-users.utils.ts` | Low/Medium — risk scoring | Presets, suspicion thresholds, chart scaling |
| `ThemeService` | Medium — catalog fallback | Merge, fallback on error, reset |
| `ConnectivityService` | Medium — offline UX | Two-failure rule, conclusive probe, third-party ignored |
| `SensitiveDataService` | Medium — privacy | Masking shapes, reveal toggle |
| `AuthService` safe redirect | High — open redirect | External URL, `//`, auth pages |
| `NotificationRealtimeService` | Low | Frame parsing for published/unpublished |
| List pages | Medium | Loading, rows, empty, error, selection retention |
| Forms | Medium | Validation messages and payload shape |

## 6. Example: testing an interceptor

```ts
it('refreshes an ordinary 401 and retries the request', () => {
  auth.getProfile().subscribe({ error: () => undefined });

  httpMock.expectOne(`${environment.apiUrl}/users/me`)
    .flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

  const refresh = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
  expect(refresh.request.method).toBe('POST');
  refresh.flush({ accessToken: 'fresh', refreshToken: 'refresh', expiresIn: 3600, role: 'ROLE_USER' });

  httpMock.expectOne(`${environment.apiUrl}/users/me`).flush({});
  expect(auth.concurrentLoginNotice()).toBeNull();
});
```

This mirrors the existing spec and shows the required pattern: mock the first call, assert the
refresh, then assert the retry.

## 7. Coverage

`karma-coverage` is installed but no coverage reporter is configured. To enable:

```js
reporters: ['progress', 'coverage'],
coverageReporter: { dir: require('path').join(__dirname, 'coverage'), subdir: '.', reporters: [{ type: 'html' }, { type: 'text-summary' }] }
```

Then run with `--code-coverage`. Targets are in [`test-strategy.md`](test-strategy.md).

## 8. Definition of done for a change

- [ ] New pure logic has tests.
- [ ] Changed behaviour has an updated or new test.
- [ ] No test depends on the wall clock or the network.
- [ ] `ng test` passes locally.
- [ ] No `fit`/`fdescribe` committed.
