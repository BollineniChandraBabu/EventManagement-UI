import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AppUser, EventItem, EventTypeSeed, SaveEventPayload } from '../../core/models/api.models';
import { SensitiveEmailPipe } from '../../core/pipes/sensitive-email.pipe';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { WISHES_URL_MAX_LENGTH, wishesUrlError } from '../../core/utils/wishes-url';
import { wishesUrlValidator } from '../../core/utils/wishes-url.validator';
import { SensitiveInfoToggleComponent } from '../../shared/sensitive-info-toggle.component';
import { startOfDay } from '../calendar/calendar.utils';
import { NextOccurrence, daysUntilText, eventTypeIcon, nextOccurrence } from './event.utils';

const MAX_USERS = 1000;

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SensitiveEmailPipe, SensitiveInfoToggleComponent],
  templateUrl: './event-editor.component.html',
  styleUrl: './event-editor.component.css'
})
export class EventEditorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly editingEventId = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly wishesUrlMaxLength = WISHES_URL_MAX_LENGTH;
  readonly today = startOfDay(new Date());

  users: AppUser[] = [];
  eventTypes: EventTypeSeed[] = [];
  userSearch = '';
  loading = true;
  loadFailed = false;
  saving = false;

  readonly form = this.fb.nonNullable.group({
    userId: [0, [Validators.required, Validators.min(1)]],
    eventType: ['', [Validators.required]],
    eventDate: ['', [Validators.required]],
    recurring: [true],
    wishesUrl: ['', [wishesUrlValidator]]
  });

  constructor() {
    this.load();
  }

  // ------------------------------------------------------------------ loading

  /** Users, event types and the event are loaded together, so none can finish "too late". */
  load(): void {
    this.loading = true;
    this.loadFailed = false;

    forkJoin({
      users: this.api.users(0, MAX_USERS, '', 'name', 'asc').pipe(map((page) => page.content)),
      eventTypes: this.api.eventTypeSeeds(),
      event: this.editingEventId ? this.api.eventById(this.editingEventId) : of(null)
    })
      .pipe(
        catchError(() => {
          this.loadFailed = true;
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        this.loading = false;
        if (!result) {
          return;
        }
        this.users = result.users ?? [];
        this.eventTypes = (result.eventTypes ?? []).filter((type) => type.active !== false);
        if (result.event) {
          this.patchFromEvent(result.event);
        } else if (!this.form.controls.eventType.value && this.eventTypes.length) {
          this.form.controls.eventType.setValue(this.typeCode(this.eventTypes[0]));
        }
      });
  }

  // ------------------------------------------------------------------ template helpers

  get pageTitle(): string {
    return this.editingEventId ? 'Edit Event' : 'Create Event';
  }

  get submitLabel(): string {
    if (this.saving) {
      return this.editingEventId ? 'Updating…' : 'Saving…';
    }
    return this.editingEventId ? 'Update Event' : 'Save Event';
  }

  /** Users matching the search box; the selected user always stays in the list. */
  get filteredUsers(): AppUser[] {
    const query = this.userSearch.trim().toLowerCase();
    const selectedId = this.form.controls.userId.value;
    if (!query) {
      return this.users;
    }
    return this.users.filter(
      (user) =>
        user.id === selectedId || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    );
  }

  get selectedUser(): AppUser | undefined {
    return this.users.find((user) => user.id === this.form.controls.userId.value);
  }

  get selectedType(): EventTypeSeed | undefined {
    return this.eventTypes.find((type) => this.typeCode(type) === this.form.controls.eventType.value);
  }

  get next(): NextOccurrence | null {
    const { eventDate, recurring } = this.form.getRawValue();
    return nextOccurrence(eventDate, recurring, this.today);
  }

  get nextText(): string {
    const next = this.next;
    return next ? `${next.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} (${daysUntilText(next.daysUntil)})` : '';
  }

  get isPastOneTimeEvent(): boolean {
    const { eventDate, recurring } = this.form.getRawValue();
    return !!eventDate && !recurring && this.next === null;
  }

  get wishesUrlMessage(): string | null {
    return wishesUrlError(this.form.controls.wishesUrl.value);
  }

  get canTestWishesUrl(): boolean {
    const value = this.form.controls.wishesUrl.value.trim();
    return value.length > 0 && !this.wishesUrlMessage;
  }

  typeCode(type: EventTypeSeed): string {
    return (type.code ?? type.displayName).toUpperCase();
  }

  typeIcon(type: EventTypeSeed): string {
    return eventTypeIcon(this.typeCode(type));
  }

  showError(control: 'userId' | 'eventType' | 'eventDate'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }

  trackByType(_: number, type: EventTypeSeed): string {
    return this.typeCode(type);
  }

  // ------------------------------------------------------------------ saving

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: SaveEventPayload = {
      eventType: value.eventType,
      eventDate: value.eventDate,
      recurring: value.recurring,
      userId: value.userId,
      // '' removes the link, so the email for this event simply has no link
      wishesUrl: value.wishesUrl.trim()
    };
    const request = this.editingEventId ? this.api.updateEvent(this.editingEventId, payload) : this.api.saveEvent(payload);

    this.saving = true;
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(this.editingEventId ? 'Event updated successfully.' : 'Event created successfully.');
        this.saving = false;
        this.form.markAsPristine();
        this.router.navigateByUrl('/events');
      },
      error: (error: HttpErrorResponse) => {
        this.saving = false;
        this.toast.error(error.error?.message || 'Unable to save the event. Please try again.');
      }
    });
  }

  // ------------------------------------------------------------------ internals

  private patchFromEvent(event: EventItem): void {
    const code = (event.eventType ?? '').toUpperCase();
    // An event whose type was deactivated later keeps its type instead of silently changing it.
    if (code && !this.eventTypes.some((type) => this.typeCode(type) === code)) {
      this.eventTypes = [...this.eventTypes, { id: -1, code, displayName: code }];
    }
    const userId = event.userId ?? this.users.find((user) => user.name === event.userName)?.id ?? 0;
    this.form.patchValue({
      userId,
      eventType: code,
      eventDate: event.eventDate ? event.eventDate.substring(0, 10) : '',
      recurring: event.recurring,
      wishesUrl: event.wishesUrl ?? ''
    });
    this.form.markAsPristine();
  }
}
