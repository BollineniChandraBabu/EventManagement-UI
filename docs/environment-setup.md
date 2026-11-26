# Environment Setup

## 1. Purpose

Everything a developer needs to go from a fresh machine to a running application.

## 2. Required software

| Software | Version | Install |
| --- | --- | --- |
| Node.js | 18.x or 20.x | nvm / official installer |
| npm | 9+ | Included with Node |
| Git | Any recent | Package manager |
| Chrome | Latest | Needed for Karma and Lighthouse |
| Editor | VS Code recommended | With Angular Language Service |

Optional:

| Software | Why |
| --- | --- |
| Firebase CLI | Manual deploys and preview channels |
| `http-server` | Serving the production build locally |
| Postman / Bruno | API checks |
| axe DevTools extension | Accessibility checks |
| Lighthouse (built into Chrome) | Performance checks |

## 3. Recommended Node setup

```bash
# with nvm
nvm install 20
nvm use 20
node -v   # v20.x
npm -v    # 9.x or 10.x
```

Angular 17 supports Node 18.13+ and 20.x. Node 21+ is untested.

## 4. Get the code

```bash
git clone <repository-url>
cd EventManagement-UI
npm ci
```

## 5. Configure the API

Edit `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'https://<backend-host>/api'
};
```

The committed default points at the shared dev backend. Use a local backend if you have one.

## 6. Start the app

```bash
npx ng serve --host 0.0.0.0 --port 12000 --allowed-hosts all
```

## 7. Accounts

Ask the team for a dev-environment account. If you are seeding your own environment, create:

- One admin (`ROLE_ADMIN`).
- Two standard users (`ROLE_USER`).
- Optionally one single-session user and one MFA user.

See [`test-data.md`](test-data.md) for a complete set.

## 8. IDE setup

**VS Code extensions**

- Angular Language Service
- ESLint (once a config exists)
- Prettier
- EditorConfig (optional)

**Useful settings**

```json
{
  "editor.formatOnSave": true,
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.trimTrailingWhitespace": true
}
```

## 9. Project conventions to read first

1. `AGENTS.md` — repository notes (commands, theming rules, media rules, circle/chat gating,
   concurrent login, calendar, offline handling, performance).
2. [`coding-standards.md`](coding-standards.md) — style and patterns.
3. [`frontend-design.md`](frontend-design.md) — structure and conventions.
4. [`onboarding-guide.md`](onboarding-guide.md) — a guided first week.

## 10. Known local-environment quirks

| Quirk | Explanation |
| --- | --- |
| API calls fail with status 0 on `localhost:12000` | The backend CORS allow-list excludes this origin |
| Redirected to `/restricted-region` | The location guard allows only India/AP/Telangana |
| `ng test` fails | No `karma.conf.js` for the configured launcher |
| `npm run lint` fails | No ESLint configuration |
| Charts do not render | CanvasJS is fetched from a CDN; check network access |
| Google button missing | No SSO client id configured in the backend |

## 11. Verification checklist

- [ ] `node -v` shows 18 or 20
- [ ] `npm ci` completes without errors
- [ ] Dev server compiles with no TypeScript errors
- [ ] Login page renders with styling
- [ ] Sign-in succeeds against the configured API
- [ ] Dashboard loads data
- [ ] No console errors during a short walkthrough
