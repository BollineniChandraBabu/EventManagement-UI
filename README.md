# family-wishes-ui

Angular 17 + Angular Material UI for a Spring Boot Family Wishes backend.

## Features
- JWT auth (login, OTP login, forgot/reset password, change password, remember me)
- Role-based UI (admin/user)
- Dashboard KPIs
- User management (admin only)
- Event creation + AI wish generation
- GrapesJS template editor with variable tokens and version restore
- Email preview (desktop/mobile iframe) + test email
- Email status listing with retry for failed
- JWT interceptor, token refresh, auto logout, route guards
- Firebase hosting ready

## Run
```bash
npm install
npm start
```

## Build for Firebase
```bash
npm run build:prod
firebase deploy
```

Update API URL in:
- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`
