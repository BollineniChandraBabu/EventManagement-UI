import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AppUser } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './event-editor.component.html',
  styleUrl: './event-editor.component.css'
})
export class EventEditorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isAdmin = this.auth.isAdmin;
  readonly types = ['Birthday', 'Anniversary', 'Engagement', 'Festival', 'Good Morning', 'Good Night'];

  allUsers: AppUser[] = [];
  result = '';
  loading = false;
  saving = false;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    type: ['Birthday', [Validators.required]],
    festival: [''],
    eventDate: [''],
    recurring: [false],
    relation: ['']
  });

  constructor() {
    this.loadUsers();
  }

  get pageTitle(): string {
    return 'Create Event';
  }

  get submitLabel(): string {
    return 'Save Event';
  }

  get desktopPreviewSrcDoc(): string {
    return this.wrapPreviewHtml(this.result);
  }

  get mobilePreviewSrcDoc(): string {
    return this.wrapPreviewHtml(this.result);
  }

  generateWish(): void {
    if (!this.isAdmin() || !this.form.controls.name.value) {
      this.form.controls.name.markAsTouched();
      return;
    }

    const selectedUser = this.form.controls.name.value as unknown as AppUser;
    this.api.aiWish({
      name: selectedUser.name,
      event: this.form.controls.type.value,
      tone: 'Warm',
      language: 'English',
      relation: this.form.controls.relation.value
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.result = res.htmlMessage;
      },
      error: () => this.toast.error('Unable to generate AI wish right now.')
    });
  }

  save(): void {
    if (!this.isAdmin() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const selectedUser = value.name as unknown as AppUser;
    const payload = {
      eventType: this.normalizeEventType(value.type),
      eventDate: value.eventDate,
      recurring: value.recurring,
      festivalName: value.type === 'Festival' ? value.festival : undefined,
      userId: selectedUser.id
    };

    this.saving = true;
    this.api.saveEvent(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('Event created successfully.');
        this.saving = false;
        this.router.navigateByUrl('/events');
      },
      error: () => {
        this.toast.error('Unable to save event. Please try again.');
        this.saving = false;
      }
    });
  }

  private loadUsers(): void {
    this.loading = true;
    this.api.users(0, 500, '').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.allUsers = response.content ?? [];
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to load users right now.');
        this.loading = false;
      }
    });
  }

  private normalizeEventType(type: string): string {
    if (type === 'Good Morning') {
      return 'GOODMORNING';
    }
    if (type === 'Good Night') {
      return 'GOODNIGHT';
    }

    return type;
  }

  private wrapPreviewHtml(content: string): string {
    return `<html><body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#212529;">${content}</body></html>`;
  }
}
