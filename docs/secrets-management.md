# Secrets Management

## 1. What counts as a secret here

The client bundle is public. Anything compiled into it can be read by anyone. Therefore:

| Item | Secret? | Where it lives |
| --- | --- | --- |
| API base URL | No | `environment*.ts` |
| Google OAuth client id | No (public by design) | Fetched at runtime from the backend; cached base64 in `localStorage` |
| Firebase project id | No | `.firebaserc`, `firebase.json` |
| Firebase service-account JSON | **Yes** | GitHub Actions secret |
| Backend API keys (mail, AI, storage) | **Yes** | Backend environment/secret manager — never in this repo |
| User passwords / OTPs | **Yes** | Never stored; sent over HTTPS only |
| JWT access/refresh tokens | **Yes** | Browser storage at runtime; never committed or logged |
| Test account passwords | Sensitive | Team password manager; never in the repo |

## 2. Current secret usage

| Secret | Consumer | Storage |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_CHANDU_GOLDENGREETINGS` | Both GitHub Actions workflows | GitHub repository secret |
| `GITHUB_TOKEN` | Both workflows | Provided by GitHub automatically |

No `.env` file, no `secrets.json`, and no credentials are committed. `.gitignore` excludes
`node_modules/`, `dist/`, `.angular/`, `coverage/` and IDE files.

## 3. Rules

1. **Never commit a secret.** If one is committed, treat it as compromised and rotate it
   immediately; removing it from the latest commit is not enough because history retains it.
2. **Never put a secret in `environment*.ts`.** It ships to every browser.
3. **Never log tokens.** No `console.log` of credentials, headers or storage.
4. **Never send tokens to third parties.** The interceptor deliberately omits the bearer header for
   `ipinfo.io`.
5. **Least privilege.** The Firebase service account should only be able to deploy hosting.
6. **Rotate on suspicion.** A leaked token, a shared screen, a lost laptop — rotate.
7. **Separate environments.** Dev, QA, UAT and production must not share credentials.
8. **Redact evidence.** Defect reports and screenshots must not contain tokens or personal data.

## 4. GitHub Actions secrets

Add or rotate:

1. Repository → **Settings** → **Secrets and variables** → **Actions**.
2. Update `FIREBASE_SERVICE_ACCOUNT_CHANDU_GOLDENGREETINGS` with the new service-account JSON.
3. Re-run the workflow to confirm.

Create the service account in Google Cloud:

1. Create a service account with the Firebase Hosting Admin role (and the minimum project roles
   required by `firebase-tools`).
2. Create a JSON key.
3. Store it only as the GitHub secret; delete the downloaded file.

## 5. Runtime token handling

| Token | Storage | Lifetime | Cleared by |
| --- | --- | --- | --- |
| Access token | `localStorage` (remember me) or `sessionStorage` | `expiresIn` seconds | Logout, expiry, 403, failed refresh, concurrent-login notice |
| Refresh token | same | Backend-defined | Same |
| Role | same | Session | Same |
| Google client id (base64) | `localStorage` | Persistent | Manual clear; safe to keep |

Rules:

- Clear **both** stores on logout.
- Never place tokens in URLs, query strings or logs.
- Do not persist tokens anywhere else (no IndexedDB, no cookies).

## 6. Local development

- Use a dedicated dev account, not a production account.
- Keep local `.env`-style files out of git (none are used today).
- If you need the Firebase CLI locally, use `firebase login` (browser-based) rather than storing a
  key file.
- Never copy production tokens into a local browser profile used for screenshots or demos.

## 7. If a secret leaks

| Leaked item | Immediate action |
| --- | --- |
| Firebase service account | Delete the key in Google Cloud, create a new one, update the GitHub secret, review recent deploys |
| User access/refresh token | Revoke sessions for that user (backend), force sign-in, review activity |
| Backend API key | Rotate with the provider, redeploy the backend |
| Test credentials | Change them in the dev environment |

Record the incident in [`incident-management.md`](incident-management.md) and follow
[`vulnerability-management.md`](vulnerability-management.md).

## 8. Verification

- [ ] `git log -p` review for accidental secrets before the first public push (history is forever).
- [ ] `npm run build` output contains no keys (`grep` the bundle for known patterns).
- [ ] No token logging in the source.
- [ ] The service account has only the roles it needs.
- [ ] `.gitignore` covers build output and local tooling files.
- [ ] Secret scanning is enabled on the repository (GitHub secret scanning / push protection).
