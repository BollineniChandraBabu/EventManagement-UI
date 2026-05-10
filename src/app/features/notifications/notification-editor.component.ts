import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SaveNotificationPayload } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './notification-editor.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationEditorComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  id: number | null = null;
  loading = false;
  saving = false;
  isPublished = false;
  form: SaveNotificationPayload = { title: '', message: '', canSendEmail: false, scheduledFrom: null, scheduledTo: null };

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = Number(idParam);
      this.loadById(this.id);
    }
  }

  submit(): void {
    if (this.id && this.isPublished) {
      this.toast.error('Published notifications cannot be edited.');
      return;
    }

    if (this.form.scheduledFrom && this.form.scheduledTo && this.form.scheduledTo < this.form.scheduledFrom) {
      this.toast.error('Schedule end time must be after start time.');
      return;
    }

    if (!this.form.title.trim() || !this.form.message.trim()) return;
    this.saving = true;
    const payload = {
      ...this.form,
      title: this.form.title.trim(),
      message: this.form.message.trim(),
      scheduledFrom: this.form.scheduledFrom || null,
      scheduledTo: this.form.scheduledTo || null
    };
    const req = this.id ? this.api.updateNotification(this.id, payload) : this.api.createNotification(payload);
    req.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(this.id ? 'Notification updated.' : 'Notification created.');
        this.router.navigate(['/notifications']);
      },
      error: () => {
        this.toast.error('Unable to save notification right now.');
        this.saving = false;
      }
    });
  }

  private loadById(id: number): void {
    this.loading = true;
    this.api.notificationById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (item) => {
        this.isPublished = !!item.published;
        if (this.isPublished) {
          this.toast.error('Published notifications cannot be edited.');
          this.router.navigate(['/notifications']);
          return;
        }
        this.form = {
          title: item.title,
          message: item.message,
          canSendEmail: !!item.canSendEmail,
          scheduledFrom: this.toDateTimeLocal(item.scheduledFrom),
          scheduledTo: this.toDateTimeLocal(item.scheduledTo)
        };
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to load notification.');
        this.loading = false;
      }
    });
  }

  private toDateTimeLocal(value?: string | null): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  }
}
