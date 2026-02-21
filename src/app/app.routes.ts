import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { adminGuard } from './core/guards/admin.guard';
import { resetLinkGuard } from './core/guards/reset-link.guard';
import { LoginComponent } from './features/auth/login.component';
import { OtpLoginComponent } from './features/auth/otp-login.component';
import { ForgotPasswordComponent } from './features/auth/forgot-password.component';
import { ResetPasswordComponent } from './features/auth/reset-password.component';
import { AccountManagementComponent } from './features/account/account-management.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { UsersComponent } from './features/users/users.component';
import { UserEditorComponent } from './features/users/user-editor.component';
import { EventsComponent } from './features/events/events.component';
import { EventEditorComponent } from './features/events/event-editor.component';
import { AiWishesComponent } from './features/ai-wishes/ai-wishes.component';
import { EmailPreviewComponent } from './features/email-preview/email-preview.component';
import { EmailStatusComponent } from './features/email-status/email-status.component';
import { SchedulersComponent } from './features/schedulers/schedulers.component';

export const routes: Routes = [
  { path: '', canActivate: [resetLinkGuard], component: ResetPasswordComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'otp-login', component: OtpLoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'password-reset', canActivate: [resetLinkGuard], component: ResetPasswordComponent },
  { path: '', canActivate: [authGuard], children: [
    { path: 'dashboard', component: DashboardComponent },
    { path: 'account', component: AccountManagementComponent },
    { path: 'users', component: UsersComponent, canActivate: [adminGuard] },
    { path: 'users/new', component: UserEditorComponent, canActivate: [adminGuard] },
    { path: 'users/:id/edit', component: UserEditorComponent, canActivate: [adminGuard] },
    { path: 'events', component: EventsComponent },
    { path: 'events/new', component: EventEditorComponent, canActivate: [adminGuard] },
    { path: 'ai-wishes', component: AiWishesComponent },
    { path: 'email-preview', component: EmailPreviewComponent },
    { path: 'email-status', component: EmailStatusComponent },
    { path: 'schedulers', component: SchedulersComponent, canActivate: [adminGuard] },
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
  ]},
  { path: '**', redirectTo: 'dashboard' }
];
