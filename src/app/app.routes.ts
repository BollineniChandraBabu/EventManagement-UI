import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { adminGuard } from './core/guards/admin.guard';
import { resetLinkGuard } from './core/guards/reset-link.guard';
import { locationAccessGuard } from './core/guards/location-access.guard';

export const routes: Routes = [
  { path: '', canActivate: [locationAccessGuard, resetLinkGuard], loadComponent: () => import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent), pathMatch: 'full' },
  { path: 'login', canActivate: [locationAccessGuard, guestGuard], loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
  { path: 'otp-login', canActivate: [locationAccessGuard], loadComponent: () => import('./features/auth/otp-login.component').then((m) => m.OtpLoginComponent) },
  { path: 'forgot-password', canActivate: [locationAccessGuard], loadComponent: () => import('./features/auth/forgot-password.component').then((m) => m.ForgotPasswordComponent) },
  { path: 'reset-password', canActivate: [locationAccessGuard], loadComponent: () => import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent) },
  { path: 'password-reset', canActivate: [locationAccessGuard, resetLinkGuard], loadComponent: () => import('./features/auth/reset-password.component').then((m) => m.ResetPasswordComponent) },
  {
    path: '', canActivate: [locationAccessGuard, authGuard], canActivateChild: [locationAccessGuard], children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      { path: 'account', loadComponent: () => import('./features/account/account-management.component').then((m) => m.AccountManagementComponent) },
      { path: 'users', canActivate: [adminGuard], loadComponent: () => import('./features/users/users.component').then((m) => m.UsersComponent) },
      { path: 'users/new', canActivate: [adminGuard], loadComponent: () => import('./features/users/user-editor.component').then((m) => m.UserEditorComponent) },
      { path: 'users/:id/edit', canActivate: [adminGuard], loadComponent: () => import('./features/users/user-editor.component').then((m) => m.UserEditorComponent) },
      { path: 'notifications', canActivate: [adminGuard], loadComponent: () => import('./features/notifications/notifications.component').then((m) => m.NotificationsComponent) },
      { path: 'notifications/new', canActivate: [adminGuard], loadComponent: () => import('./features/notifications/notification-editor.component').then((m) => m.NotificationEditorComponent) },
      { path: 'notifications/:id/edit', canActivate: [adminGuard], loadComponent: () => import('./features/notifications/notification-editor.component').then((m) => m.NotificationEditorComponent) },
      { path: 'events', loadComponent: () => import('./features/events/events.component').then((m) => m.EventsComponent) },
      { path: 'events/new', canActivate: [adminGuard], loadComponent: () => import('./features/events/event-editor.component').then((m) => m.EventEditorComponent) },
      { path: 'events/:id/edit', canActivate: [adminGuard], loadComponent: () => import('./features/events/event-editor.component').then((m) => m.EventEditorComponent) },
      { path: 'email-preview', loadComponent: () => import('./features/email-preview/email-preview.component').then((m) => m.EmailPreviewComponent) },
      { path: 'email-status', loadComponent: () => import('./features/email-status/email-status.component').then((m) => m.EmailStatusComponent) },
      { path: 'email-status/otp', canActivate: [adminGuard], data: { title: 'OTP Email Status', emailType: 'OTP' }, loadComponent: () => import('./features/email-status/email-status.component').then((m) => m.EmailStatusComponent) },
      { path: 'email-status/forgot-password', canActivate: [adminGuard], data: { title: 'Forgot Password Email Status', emailType: 'FORGOT_PASSWORD' }, loadComponent: () => import('./features/email-status/email-status.component').then((m) => m.EmailStatusComponent) },
      { path: 'email-status/festival-wishes', data: { title: 'Festival Wishes Email Status', emailType: 'FESTIVAL_WISH' }, loadComponent: () => import('./features/email-status/email-status.component').then((m) => m.EmailStatusComponent) },
      { path: 'email-status/unread-chat', data: { title: 'Unread Chat Email Status', emailType: 'UNREAD_CHAT_MESSAGE' }, loadComponent: () => import('./features/email-status/email-status.component').then((m) => m.EmailStatusComponent) },
      { path: 'schedulers', canActivate: [adminGuard], loadComponent: () => import('./features/schedulers/schedulers.component').then((m) => m.SchedulersComponent) },
      { path: 'relationship-seeds', canActivate: [adminGuard], loadComponent: () => import('./features/relationship-seeds/relationship-seeds.component').then((m) => m.RelationshipSeedsComponent) },
      { path: 'relationship-seeds/new', canActivate: [adminGuard], loadComponent: () => import('./features/relationship-seeds/relationship-seed-editor.component').then((m) => m.RelationshipSeedEditorComponent) },
      { path: 'relationship-seeds/:id/edit', canActivate: [adminGuard], loadComponent: () => import('./features/relationship-seeds/relationship-seed-editor.component').then((m) => m.RelationshipSeedEditorComponent) },
      { path: 'event-type-seeds', canActivate: [adminGuard], loadComponent: () => import('./features/event-type-seeds/event-type-seeds.component').then((m) => m.EventTypeSeedsComponent) },
      { path: 'event-type-seeds/new', canActivate: [adminGuard], loadComponent: () => import('./features/event-type-seeds/event-type-seed-editor.component').then((m) => m.EventTypeSeedEditorComponent) },
      { path: 'event-type-seeds/:id/edit', canActivate: [adminGuard], loadComponent: () => import('./features/event-type-seeds/event-type-seed-editor.component').then((m) => m.EventTypeSeedEditorComponent) },
      { path: 'festival-wish-mappings', canActivate: [adminGuard], loadComponent: () => import('./features/festival-wish-mappings/festival-wish-mappings.component').then((m) => m.FestivalWishMappingsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: 'restricted-region', canActivate: [locationAccessGuard], loadComponent: () => import('./features/restricted-region/restricted-region.component').then((m) => m.RestrictedRegionComponent) },
  { path: '**', redirectTo: 'dashboard' }
];
