import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AppUser, EventItem } from '../../core/models/api.models';
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isAdmin = this.auth.isAdmin;
  readonly types = ['Birthday', 'Anniversary', 'Engagement', 'Festival', 'Good Morning', 'Good Night'];

  allUsers: AppUser[] = [];
  result = '';
  subject = '';
  loading = false;
  saving = false;
  editingEventId: number | null = null;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    type: ['Birthday', [Validators.required]],
    festival: [''],
    eventDate: [''],
    recurring: [false],
    relation: ['']
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('id'));
      this.editingEventId = Number.isNaN(id) ? null : id;
      this.resetForm();
      this.loadUsersAndEvent();
    });
  }

  get pageTitle(): string {
    return this.editingEventId ? 'Edit Event' : 'Create Event';
  }

  get submitLabel(): string {
    return this.editingEventId ? 'Update Event' : 'Preview & Save';
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
        this.subject = res.subject;
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
      subject: this.subject,
      body: this.result,
      eventType: this.normalizeEventType(value.type),
      eventDate: value.eventDate,
      recurring: value.recurring,
      festivalName: value.type === 'Festival' ? value.festival : undefined,
      userId: String(selectedUser.id)
    };

    const request = this.editingEventId
      ? this.api.updateEvent(this.editingEventId, payload)
      : this.api.saveEvent(payload);

    this.saving = true;
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(this.editingEventId ? 'Event updated successfully.' : 'Event created successfully.');
        this.saving = false;
        this.router.navigateByUrl('/events');
      },
      error: () => {
        this.toast.error('Unable to save event. Please try again.');
        this.saving = false;
      }
    });
  }

  private loadUsersAndEvent(): void {
    this.loading = true;
    this.api.users(0, 500, '').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.allUsers = response.content ?? [];
        if (!this.editingEventId) {
          this.loading = false;
          return;
        }

        this.loadEvent(this.editingEventId);
      },
      error: () => {
        this.toast.error('Unable to load users right now.');
        this.loading = false;
      }
    });
  }

  private loadEvent(eventId: number): void {
    this.api.events(0, 500, '').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const selectedEvent = response.content.find((event) => event.id === eventId);
        if (!selectedEvent) {
          this.toast.error('Event not found.');
          this.router.navigateByUrl('/events');
          return;
        }

        this.patchFormForEdit(selectedEvent);
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to load event details right now.');
        this.loading = false;
      }
    });
  }

  private patchFormForEdit(event: EventItem): void {
    const eventData = event as EventItem & {
      userId?: number;
      subject?: string;
      body?: string;
      festivalName?: string;
      relation?: string;
    };

    const matchedUser = this.allUsers.find((user) => user.id === eventData.userId)
      ?? this.allUsers.find((user) => user.name === event.name)
      ?? null;

    this.form.patchValue({
      name: matchedUser as never,
      type: this.displayEventType(event.eventType || event.type || 'Birthday'),
      festival: event.festival || eventData.festivalName || '',
      eventDate: event.eventDate || '',
      recurring: !!event.recurring,
      relation: eventData.relation || ''
    });

    this.subject = eventData.subject || '';
    this.result = eventData.body || event.wish || '';
  }

  private resetForm(): void {
    this.form.reset({
      name: '',
      type: 'Birthday',
      festival: '',
      eventDate: '',
      recurring: false,
      relation: ''
    });
    this.subject = '';
    this.result = '';
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

  private displayEventType(type: string): string {
    if (type === 'GOODMORNING') {
      return 'Good Morning';
    }
    if (type === 'GOODNIGHT') {
      return 'Good Night';
    }

    return type;
  }

  private wrapPreviewHtml(content: string): string {
    return `<html><body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#212529;">${content}</body></html>`;
  }
}
