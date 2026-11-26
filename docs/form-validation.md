# Form Validation

## 1. Approach

Forms use Angular **reactive forms** with `FormBuilder.nonNullable.group`. Rules are expressed with
built-in `Validators` plus two pure validators that mirror backend rules:

| Validator | File | Mirrors |
| --- | --- | --- |
| `wishesUrlValidator` | `core/utils/wishes-url.validator.ts` | Backend `WishesUrls` |
| Media checks (`mediaError`, `imageError`) | `core/utils/media.ts` | Backend `MediaValidation` |
| Schedule checks (`scheduleError`) | `core/utils/notification-schedule.ts` | Backend notification rules |

Errors are shown after a control is **touched or dirty**, so a user is not scolded before typing.
On submit, invalid forms call `markAllAsTouched()` and stop.

## 2. Form-by-form rules

### 2.1 Login

| Control | Rules | Message |
| --- | --- | --- |
| `email` | required, email | "Enter a valid email address." |
| `password` | required | "Password is required." |
| `rememberMe` | boolean, default `true` | — |

Submission also waits for the location lookup, then posts with `forceMfa: true`.

### 2.2 OTP

| Control | Rules | Message |
| --- | --- | --- |
| `email` | required, email | Standard |
| `otp` | required, 4–6 characters | "Enter the 4–6 digit code." |

### 2.3 Reset password

| Control | Rules | Message |
| --- | --- | --- |
| `email` | required, email | Standard |
| `newPassword` | required, min 8 | "Use at least 8 characters." |
| `confirmPassword` | required, min 8, must equal `newPassword` | "Password and confirm password must match." |

A missing `token` blocks submission entirely with an explanation.

### 2.4 Forgot password

| Control | Rules |
| --- | --- |
| `email` | required, email |

### 2.5 Change password (account page)

| Control | Rules |
| --- | --- |
| `currentPassword` | required |
| `newPassword` | required, min 8 |
| `confirmPassword` | required, min 8, must match |

### 2.6 User editor

| Control | Rules |
| --- | --- |
| `name` | required |
| `email` | required, email |
| `gender` | required, one of `MALE`, `FEMALE`, `OTHER` |
| `dob` | required |
| `role` | required, `ROLE_ADMIN` or `ROLE_USER` |
| `relationShip` | required (options from relationship seeds) |
| `isBirthdayEnabled`, `isGoodMorningEnabled`, `isGoodNightEnabled` | booleans |
| `birthdayWishesUrl` | optional; `wishesUrlValidator` |
| `mfaEnabled`, `concurrentLoginAllowed` | booleans |

### 2.7 Event editor

| Control | Rules |
| --- | --- |
| `userId` | required, min 1 |
| `eventType` | required |
| `eventDate` | required |
| `recurring` | boolean, default `true` |
| `wishesUrl` | optional; `wishesUrlValidator` |

Media is validated outside the form: selecting a file runs `mediaError`; a rejected file clears the
input and shows the reason.

### 2.8 Notification editor

| Field | Rules |
| --- | --- |
| `title` | required, trimmed non-empty |
| `message` | required, trimmed non-empty |
| `canSendEmail` | boolean |
| `scheduledFrom` | optional; must be in the future |
| `scheduledTo` | optional; must be in the future and after `scheduledFrom` |

## 3. The wishes-link validator

`wishesUrlError(value)` returns `null` for an empty value (the link is optional) and otherwise:

| Condition | Message |
| --- | --- |
| Length > 500 | "The link must be at most 500 characters." |
| Contains whitespace or control characters | "The link must not contain spaces." |
| Not a parseable absolute URL | "Enter a full web address, for example https://example.com/birthday.html" |
| Scheme not `http:`/`https:` | "The link must start with http:// or https://" |
| No hostname | "The link must contain a website address." |
| Contains a username or password | "The link must not contain a username or password." |

The validator wraps this function so the form and the API agree. The same function is used for the
inline hint and to enable/disable the "test link" action.

## 4. Media validation

| Kind | Types | Max size |
| --- | --- | --- |
| Image | `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/bmp` | 5 MB |
| Video | `video/mp4`, `video/webm`, `video/quicktime`, `video/x-msvideo`, `video/x-matroska`, `video/mpeg`, `video/3gpp` | 50 MB |
| Audio | `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/mp4`, `audio/flac` | 10 MB |
| Document | `application/pdf` | 20 MB |

- `mediaKindOf` uses the MIME type first, then the extension.
- Anything else is "not a supported media type" and is refused before upload.
- An SVG (or TIFF) is **not** offered, because the `accept` list names exact MIME types.
- Profile pictures use `imageError`, so only images are accepted.
- Chat attachments allow any file up to 50 MB.

## 5. Schedule validation

`scheduleError(fields, now)`:

| Condition | Message |
| --- | --- |
| End before start | "Schedule end time must be after the start time." |
| Start not in the future | "Schedule start time must be in the future." |
| End not in the future | "Schedule end time must be in the future." |

The same check runs when publishing a draft, because the backend stamps the publish time from the
schedule start; a stale window would publish back-dated.

## 6. Error display pattern

```html
<label for="email">Email</label>
<input id="email" formControlName="email"
       [class.is-invalid]="showError('email')"
       aria-describedby="email-error" />
<div id="email-error" class="invalid-feedback" *ngIf="showError('email')">
  Enter a valid email address.
</div>
```

```ts
showError(control: 'email' | 'password'): boolean {
  const field = this.form.controls[control];
  return field.invalid && (field.touched || field.dirty);
}
```

Principles:

1. Never show an error on a pristine, untouched field.
2. Mark all fields touched on submit so nothing is hidden.
3. Put the message next to the field and link it with `aria-describedby`.
4. Prefer the backend message when the server rejects a value the client accepted.
5. Keep the user's input after a failure.

## 7. Cross-field and contextual validation

| Case | Handling |
| --- | --- |
| Password confirmation | Compared in `submit()`, not as a group validator |
| Date range (dashboard) | Start after end moves the other boundary |
| Schedule ordering | `scheduleError` |
| Event date in the past (non-recurring) | Warning, not a block |
| Impersonation + security settings | Blocked with a warning |
| Publish with stale schedule | Blocked with a specific message |

## 8. Backend authority

Client validation is a convenience. The backend remains authoritative, and the client always
displays the server's message when it rejects a request. Never rely on client validation for
security (e.g. an attacker can call the API directly).

## 9. Testing validation

| Rule | Test |
| --- | --- |
| Wishes URL cases | `wishes-url` unit tests (recommended; currently only used, not directly tested) |
| Media kinds and limits | `media.spec.ts` |
| Schedule rules | `notification-schedule.spec.ts` |
| Form behaviour | Component specs for login/OTP/direct login where they exist |
