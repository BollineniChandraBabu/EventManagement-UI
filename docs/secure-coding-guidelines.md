# Secure Coding Guidelines

Practical rules for this Angular codebase, with the reason and an example for each.

## 1. Never trust the client

**Rule:** treat every client-side check as UX. The backend must enforce it.

```ts
// Good: fast feedback, but the backend still validates.
if (this.form.invalid) return this.form.markAllAsTouched();
this.api.saveEvent(payload).subscribe({ ... });
```

Do not assume that because a button is hidden, the action cannot be called. Do not remove a
backend check because the UI already prevents it.

## 2. Render untrusted content safely

**Rule:** use interpolation for text. Use `[innerHTML]` only for backend-rendered HTML that Angular
sanitises.

```html
<!-- Good -->
<span>{{ user.name }}</span>

<!-- Only for email bodies / wish previews; Angular sanitises this -->
<div [innerHTML]="wishPreview?.htmlMessage || ''"></div>
```

Never:

```ts
this.sanitizer.bypassSecurityTrustHtml(userInput); // NEVER for untrusted input
```

If a new screen needs formatted text, prefer a small, explicit formatter (as the chat widget does)
over raw HTML.

## 3. Validate URLs before using them

**Rule:** user-supplied links must be absolute `http(s)` with no credentials.

```ts
const error = wishesUrlError(value); // rejects javascript:, data:, credentials, spaces
```

Never build a link by concatenation from user input. Never pass a user URL to `window.location`.

## 4. Keep redirects internal

**Rule:** only navigate to paths that begin with `/` and are not `//`.

```ts
private getSafeRedirectUrl(url?: string | null): string | null {
  if (!url || !url.startsWith('/') || url.startsWith('//')) return null;
  const path = url.split(/[?#]/, 1)[0];
  return AUTH_PATHS.includes(path) ? null : url;
}
```

## 5. Handle tokens carefully

- Read them only through `AuthService`.
- Never log them, never put them in a URL, never send them to a third party.
- Clear both stores on logout.
- Do not add a new storage key for a token.

```ts
const skipAuthHeader = req.url.startsWith('https://ipinfo.io/');
```

## 6. Validate uploads before sending

**Rule:** check type and size client-side, and accept that the server re-checks the bytes.

```ts
const error = mediaError(file);
if (error) { this.imageError = error; input.value = ''; return; }
```

- Never trust `file.type` alone for security (the server must sniff).
- Never render an uploaded file as HTML.
- Revoke object URLs.

## 7. Escape exported data

**Rule:** any CSV cell that could be interpreted as a formula must be neutralised.

```ts
const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
```

## 8. Do not leak information in errors

**Rule:** show the backend's user-facing message or a contextual fallback. Never show stack traces,
internal URLs, SQL or tokens.

```ts
this.toast.error(apiErrorMessage(error, 'Unable to load events right now.'));
```

## 9. Handle auth failures explicitly

| Status | Action |
| --- | --- |
| 401 | Refresh once, or show the concurrent-login notice |
| 403 | Sign out |
| 0 | Report to connectivity; do not assume offline |

Do not swallow 401/403 in a generic `error` handler.

## 10. Guard every destructive action

```ts
this.confirmDialog.confirmDelete({ itemLabel: `the ${event.eventType} event for ${event.userName}` })
  .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
  .subscribe(() => this.performDelete(event));
```

## 11. Do not write signals inside effects

Angular 17 throws NG0600. Defer the work:

```ts
effect(() => {
  const authenticated = this.auth.authenticated();
  queueMicrotask(() => { if (authenticated) this.theme.load(true); });
});
```

Do not enable `allowSignalWrites` globally to work around it.

## 12. Unsubscribe predictably

```ts
this.api.events(...).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...);
```

Revoke object URLs and clear timers in `onDestroy`.

## 13. Keep personal data off the screen by default

```html
{{ user.email | sensitiveEmail }}
```

Use the pipe, not manual slicing, so the global reveal works consistently.

## 14. Pin and review dependencies

- Use `npm ci` with the committed lockfile.
- Pin CDN versions exactly (`font-awesome/6.5.2`, `mdb-ui-kit/8.2.0`).
- Review a new dependency for maintenance, licence, size and transitive risk.
- Prefer a small utility over a large library for a single function.

## 15. Avoid dangerous browser APIs

| API | Rule |
| --- | --- |
| `innerHTML` / `outerHTML` | Only via Angular binding with sanitisation |
| `eval`, `new Function` | Never |
| `document.write` | Never |
| `window.open` with user URLs | Validate first; use `noopener,noreferrer` |
| `localStorage` for secrets | Only the designated token keys |
| `postMessage` | Validate the origin if ever used |

## 16. Keep the bundle clean

- No secrets, keys or internal hostnames beyond the API URL.
- No debug logging in production.
- No commented-out credentials.

## 17. Review checklist

- [ ] Untrusted content rendered via interpolation or sanitised HTML
- [ ] No `bypassSecurityTrust*` on untrusted data
- [ ] URLs validated before use
- [ ] Redirects internal only
- [ ] Tokens handled only via `AuthService`
- [ ] Uploads validated client-side
- [ ] CSV cells escaped
- [ ] Errors show safe messages
- [ ] 401/403 handled
- [ ] Destructive actions confirm
- [ ] Subscriptions unsubscribed
- [ ] Personal data masked
- [ ] No new secret or credential
- [ ] Dependencies reviewed and pinned

## 18. Anti-patterns seen in the wild (and to reject in review)

| Anti-pattern | Why it is dangerous |
| --- | --- |
| `innerHTML` with user text | Stored XSS |
| `bypassSecurityTrustHtml` "to make it render" | Disables the only XSS defence |
| `localStorage.setItem('token', ...)` outside `AuthService` | Inconsistent clearing, leaks |
| `console.log(token)` | Token in logs |
| `window.location.href = redirectUrl` | Open redirect |
| Trusting `file.type` for security | Trivially spoofed |
| `catch (e) {}` around an auth call | Silent session corruption |
| Disabling `strictTemplates` to ship | Type errors become runtime errors |
| Adding a CDN script without pinning | Supply-chain risk |
