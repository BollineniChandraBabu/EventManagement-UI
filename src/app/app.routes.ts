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
import { EmailPreviewComponent } from './features/email-preview/email-preview.component';
import { EmailStatusComponent } from './features/email-status/email-status.component';
import { SchedulersComponent } from './features/schedulers/schedulers.component';
import { RelationshipSeedEditorComponent } from './features/relationship-seeds/relationship-seed-editor.component';
import { RelationshipSeedsComponent } from './features/relationship-seeds/relationship-seeds.component';
import { EventTypeSeedsComponent } from './features/event-type-seeds/event-type-seeds.component';
import { EventTypeSeedEditorComponent } from './features/event-type-seeds/event-type-seed-editor.component';
import { FestivalWishMappingsComponent } from './features/festival-wish-mappings/festival-wish-mappings.component';
import { locationAccessGuard } from './core/guards/location-access.guard';
import { RestrictedRegionComponent } from './features/restricted-region/restricted-region.component';

export const routes: Routes = [
  { path: '', canActivate: [locationAccessGuard, resetLinkGuard], component: ResetPasswordComponent, pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [locationAccessGuard, guestGuard] },
  { path: 'otp-login', component: OtpLoginComponent, canActivate: [locationAccessGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [locationAccessGuard] },
  { path: 'reset-password', component: ResetPasswordComponent, canActivate: [locationAccessGuard] },
  { path: 'password-reset', canActivate: [locationAccessGuard, resetLinkGuard], component: ResetPasswordComponent },
  { path: '', canActivate: [locationAccessGuard, authGuard], canActivateChild: [locationAccessGuard], children: [
    { path: 'dashboard', component: DashboardComponent },
    { path: 'account', component: AccountManagementComponent },
    { path: 'users', component: UsersComponent, canActivate: [adminGuard] },
    { path: 'users/new', component: UserEditorComponent, canActivate: [adminGuard] },
    { path: 'users/:id/edit', component: UserEditorComponent, canActivate: [adminGuard] },
    { path: 'events', component: EventsComponent },
    { path: 'events/new', component: EventEditorComponent, canActivate: [adminGuard] },
    { path: 'events/:id/edit', component: EventEditorComponent, canActivate: [adminGuard] },
    { path: 'email-preview', component: EmailPreviewComponent },
    { path: 'email-status', component: EmailStatusComponent },
    { path: 'email-status/otp', component: EmailStatusComponent, canActivate: [adminGuard], data: { title: 'OTP Email Status', emailType: 'OTP' } },
    { path: 'email-status/forgot-password', component: EmailStatusComponent, canActivate: [adminGuard], data: { title: 'Forgot Password Email Status', emailType: 'FORGOT_PASSWORD' } },
    { path: 'email-status/festival-wishes', component: EmailStatusComponent, data: { title: 'Festival Wishes Email Status', emailType: 'FESTIVAL_WISH' } },
    { path: 'email-status/unread-chat', component: EmailStatusComponent, data: { title: 'Unread Chat Email Status', emailType: 'UNREAD_CHAT_MESSAGE' } },
    { path: 'schedulers', component: SchedulersComponent, canActivate: [adminGuard] },
    { path: 'relationship-seeds', component: RelationshipSeedsComponent, canActivate: [adminGuard] },
    { path: 'relationship-seeds/new', component: RelationshipSeedEditorComponent, canActivate: [adminGuard] },
    { path: 'relationship-seeds/:id/edit', component: RelationshipSeedEditorComponent, canActivate: [adminGuard] },
    { path: 'event-type-seeds', component: EventTypeSeedsComponent, canActivate: [adminGuard] },
    { path: 'event-type-seeds/new', component: EventTypeSeedEditorComponent, canActivate: [adminGuard] },
    { path: 'event-type-seeds/:id/edit', component: EventTypeSeedEditorComponent, canActivate: [adminGuard] },
    { path: 'festival-wish-mappings', component: FestivalWishMappingsComponent, canActivate: [adminGuard] },
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
  ]},
  { path: 'restricted-region', component: RestrictedRegionComponent },
  { path: '**', redirectTo: 'dashboard' }
];
