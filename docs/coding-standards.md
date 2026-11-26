# Coding Standards

## 1. Language and tooling

| Item | Rule |
| --- | --- |
| Language | TypeScript 5.4, `strict`, `strictTemplates` |
| Framework | Angular 17, standalone components |
| Lint | **Not configured** (gap). Follow this document until ESLint exists |
| Formatting | 2 spaces, single quotes, semicolons; keep files formatted consistently |
| Imports | One group, sorted by path depth; no unused imports |

## 2. Naming

| Kind | Convention | Example |
| --- | --- | --- |
| Files | kebab-case with a role suffix | `event-editor.component.ts`, `media.utils.ts` |
| Components | PascalCase, `Component` suffix | `EventEditorComponent` |
| Services | PascalCase, `Service` suffix | `ThemeService` |
| Guards | camelCase, `Guard` suffix | `adminGuard` |
| Interceptors | camelCase, `Interceptor` suffix | `authInterceptor` |
| Pipes | PascalCase, `Pipe` suffix; name is camelCase | `SensitiveEmailPipe` → `sensitiveEmail` |
| Models | PascalCase interfaces | `SaveEventPayload` |
| Constants | UPPER_SNAKE_CASE | `ROLE_ADMIN`, `MEDIA_ACCEPT` |
| Signals | noun, no `$` | `toasts`, `hidden`, `online` |
| Observables | `$` suffix | `socketEvents$`, `published$` |
| Private members | `private readonly` where possible | `private readonly api = inject(ApiService)` |
| Booleans | `is`/`has`/`can`/`should` | `isAdmin`, `canSend`, `hasImage` |
| Handlers | `onX` | `onImageSelected`, `onSearchInput` |

## 3. File and folder structure

```
features/<area>/
  <area>.component.ts|html|css        page component
  <area>.utils.ts                     pure helpers
  <area>.utils.spec.ts                tests
  <sub-component>.component.*         embedded components
core/
  services/<name>.service.ts
  guards/<name>.guard.ts
  interceptors/<name>.interceptor.ts
  utils/<name>.ts
  models/<name>.models.ts
shared/
  <name>.component.ts
```

Rules:

- One public class per file.
- Co-locate the spec with the code.
- Pure logic never lives in a component if it can live in a `utils` file.
- A shared component must not import from `features`.

## 4. TypeScript

1. **No `any`** when a model exists. Use `unknown` and narrow.
2. **Explicit return types** on public service methods.
3. **Readonly** for injected dependencies and constants.
4. **Strict null handling**: default optional fields at the boundary (`normalize*`).
5. **No non-null assertion** unless the invariant is documented and local.
6. **Prefer `const`**; avoid `let` when a value never changes.
7. **Avoid type assertions** (`as`) except at boundaries (e.g. `error as HttpErrorResponse`).
8. **Use `satisfies`/typed objects** for configuration instead of `as`.
9. **Enums**: prefer union types (`'asc' | 'desc'`) over enums, matching the codebase.
10. **No `console.log`** in committed code; `console.error` only for bootstrap failures.

## 5. Angular conventions

### 5.1 Components

```ts
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './example.component.html',
  styleUrl: './example.component.css'
})
export class ExampleComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly isAdmin = inject(AuthService).isAdmin;

  constructor() {
    this.api.events().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(/* … */);
  }
}
```

- `standalone: true`, explicit `imports`.
- `inject()` over constructor parameters.
- `takeUntilDestroyed(this.destroyRef)` for subscriptions.
- Public fields used by the template; private everything else.
- Getters for cheap derived template values; `computed` for shared derived state.
- `ChangeDetectionStrategy.OnPush` is encouraged for new components (existing ones use the default).

### 5.2 Templates

- Use `*ngIf`/`*ngFor` today; `@if`/`@for` is acceptable for new code but keep consistency within a
  file.
- `trackBy` for lists where identity is stable.
- No function calls in templates that do work on every change detection cycle; use getters or
  precomputed fields.
- Bind with `[class.x]`, not string concatenation of classes.
- Always bind `type="button"` on non-submit buttons.

### 5.3 Services

- `providedIn: 'root'` unless there is a reason to scope.
- Signals for state; observables for streams.
- Expose read-only signals (`asReadonly()`).
- No HTTP in components; no DOM access in services.
- Pure helpers in `utils`.

### 5.4 Effects

- Never write signals inside `effect()` (NG0600). Defer with `queueMicrotask`.
- Keep effects minimal; prefer explicit calls from event handlers.

## 6. RxJS

- Unsubscribe with `takeUntilDestroyed`.
- Use `switchMap` for latest-wins (search, filters) and `forkJoin` for parallel independent calls.
- Catch errors per call with a user-facing message; do not let an error kill the stream silently.
- Avoid nested subscriptions; compose with operators.
- Use `finalize` for cleanup.

## 7. HTTP

- All calls through `ApiService`/`AuthService`/`ChatService`/`CircleService`.
- Build parameters with `HttpParams`; use repeated keys for arrays.
- Normalise responses in `ApiService`.
- Use `apiErrorMessage(error, fallback)` for user-facing messages.
- Never log request bodies or headers.

## 8. CSS

- Use design tokens (`var(--c-primary)`), never literal colours.
- Component styles are scoped; global styles live in `styles.css`.
- Theme-specific overrides go in `themes.css` keyed by `data-theme`.
- Class names: kebab-case, BEM-like where a block has variants (`.kpi-card`, `.kpi-card--warn`).
- Avoid `!important` except where overriding MDB utilities (and comment why).
- Mobile-first media queries; test at 360 px.

## 9. HTML and accessibility

- One `<h1>` per page.
- Every input has a `<label for>`.
- Icon-only buttons have `aria-label`.
- Dialogs use `role="dialog"`/`aria-modal`.
- Errors are linked with `aria-describedby`.
- Do not use colour alone to convey status.

## 10. Error handling

- Show a toast or inline message for every failure.
- Preserve the user's input.
- Do not swallow errors silently.
- Use contextual fallback messages.

## 11. Testing

- Describe the behaviour, not the method.
- Pass `today` explicitly for date logic; never rely on the wall clock.
- Use local date constructors, not UTC strings.
- One assertion focus per test.
- No real HTTP; use `HttpTestingController`.
- No `fit`/`fdescribe` committed.

## 12. Comments

- Explain *why*, not *what*.
- Keep comments for non-obvious invariants, workarounds and trade-offs (e.g. the NG0600
  workaround, the `--nav-panel-bg` rule, the `retainOnly` selection rule).
- Do not narrate the diff or restate the code.
- Update comments when the code changes.

## 13. Example: a well-formed utility

```ts
/** Whole days from `from` to `to`. Date.UTC avoids an off-by-one across daylight-saving changes. */
export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / msPerDay);
}
```

## 14. Review checklist

- [ ] Naming follows the table
- [ ] No `any`, no unused imports
- [ ] Standalone + explicit imports
- [ ] `takeUntilDestroyed` on subscriptions
- [ ] Pure logic extracted and tested
- [ ] HTTP through a service
- [ ] Tokens not logged, secrets absent
- [ ] Personal data masked
- [ ] Destructive actions confirm
- [ ] Accessibility basics present
- [ ] Tokens used for colours
- [ ] Docs updated
