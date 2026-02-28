import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './event-type-seed-editor.component.html',
  styleUrl: './event-type-seed-editor.component.css'
})
export class EventTypeSeedEditorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  loading = false;
  saving = false;
  editingSeedId: number | null = null;

  form = this.fb.nonNullable.group({
    id: [0],
    name: ['', [Validators.required]]
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('id'));
      this.editingSeedId = Number.isNaN(id) ? null : id;
      this.resetForm();
      if (this.editingSeedId) {
        this.loadSeed(this.editingSeedId);
      }
    });
  }

  get pageTitle(): string {
    return this.editingSeedId ? 'Edit Event Type' : 'Create Event Type';
  }

  get submitLabel(): string {
    return this.editingSeedId ? 'Update Event Type' : 'Create Event Type';
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { id, ...payload } = this.form.getRawValue();
    const request = id ? this.api.updateEventTypeSeed(id, payload) : this.api.saveEventTypeSeed(payload);

    this.saving = true;
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(id ? 'Event type updated successfully.' : 'Event type created successfully.');
        this.saving = false;
        this.router.navigateByUrl('/event-type-seeds');
      },
      error: () => {
        this.toast.error('Unable to save event type. Please try again.');
        this.saving = false;
      }
    });
  }

  private loadSeed(id: number): void {
    this.loading = true;
    this.api.eventTypeSeedById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (seed) => {
        this.form.patchValue({
          id: seed.id,
          name: seed.displayName
        });
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to load event type details right now.');
        this.loading = false;
        this.router.navigateByUrl('/event-type-seeds');
      }
    });
  }

  private resetForm(): void {
    this.form.reset({
      id: 0,
      name: ''
    });
  }
}
