import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppUser, EventTypeSeed, SaveEventPayload } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './event-editor.component.html',
  styleUrl: './event-editor.component.css'
})
export class EventEditorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly isAdmin = this.auth.isAdmin;
  readonly fallbackTypes = ['Birthday', 'Anniversary', 'Engagement'];

  allUsers: AppUser[] = [];
  eventTypeSeeds: EventTypeSeed[] = [];
  loading = false;
  saving = false;
  editingUserName = '';

  readonly editingEventId = Number(this.route.snapshot.paramMap.get('id')) || null;

  form = this.fb.nonNullable.group({
    userId: [0, [Validators.required, Validators.min(1)]],
    type: ['Birthday', [Validators.required]],
    festival: [''],
    eventDate: [''],
    recurring: [false]
  });

  constructor() {
    this.loadUsers();
    this.loadEventTypeSeeds();

    if (this.editingEventId) {
      this.loadEvent(this.editingEventId);
    }
  }

  get types(): string[] {
    return this.eventTypeSeeds.length ? this.eventTypeSeeds.map((seed) => seed.displayName) : this.fallbackTypes;
  }

  get pageTitle(): string {
    return this.editingEventId ? 'Edit Event' : 'Create Event';
  }

  get submitLabel(): string {
    if (this.saving) {
      return this.editingEventId ? 'Updating...' : 'Saving...';
    }

    return this.editingEventId ? 'Update Event' : 'Save Event';
  }

  save(): void {
    if (!this.isAdmin() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: SaveEventPayload = {
      eventType: this.normalizeEventType(value.type),
      eventDate: value.eventDate,
      recurring: value.recurring,
      userId: value.userId
    };

    this.saving = true;
    const request$ = this.editingEventId
      ? this.api.updateEvent(this.editingEventId, payload)
      : this.api.saveEvent(payload);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(this.editingEventId ? 'Event updated successfully.' : 'Event created successfully.');
        this.saving = false;
        this.router.navigateByUrl('/events');
      },
      error: () => {
        this.toast.error(this.editingEventId ? 'Unable to update event. Please try again.' : 'Unable to save event. Please try again.');
        this.saving = false;
      }
    });
  }

  private loadUsers(): void {
    this.loading = true;
    this.api.users(0, 500, '', 'name', 'asc').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.allUsers = response.content ?? [];
        if (!this.editingEventId && this.allUsers.length) {
          this.form.controls.userId.setValue(this.allUsers[0].id);
        }
        if (this.editingEventId && this.editingUserName) {
          const matchedUser = this.allUsers.find((user) => user.name === this.editingUserName);
          if (matchedUser) {
            this.form.controls.userId.setValue(matchedUser.id);
          }
        }
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to load users right now.');
        this.loading = false;
      }
    });
  }

  private loadEventTypeSeeds(): void {
    this.api.eventTypeSeeds().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (seeds) => {
        this.eventTypeSeeds = seeds ?? [];
      }
    });
  }

  private loadEvent(eventId: number): void {
    this.loading = true;
    this.api.eventById(eventId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (event) => {
        this.editingUserName = event.userName;
        const matchedUser = this.allUsers.find((user) => user.name === event.userName);
        this.form.patchValue({
          userId: matchedUser?.id ?? 0,
          type: this.prettyType(event.eventType),
          eventDate: event.eventDate,
          recurring: event.recurring,
          festival: ''
        });
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to load event details right now.');
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

  private prettyType(type?: string): string {
    if (type === 'GOODMORNING') {
      return 'Good Morning';
    }
    if (type === 'GOODNIGHT') {
      return 'Good Night';
    }

    return type ?? 'Birthday';
  }
}
