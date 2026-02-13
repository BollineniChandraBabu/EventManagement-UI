import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AsyncPipe],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css'
})
export class EventsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly isAdmin = this.auth.role() === 'ADMIN';
  types = ['Birthday', 'Anniversary', 'Engagement', 'Festival'];
  events$ = this.api.events();
  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    type: ['Birthday', [Validators.required]],
    festival: [''],
    eventDate: ['', [Validators.required]],
    recurring: [false],
    wish: ['']
  });

  generateWish() {
    if (!this.isAdmin || !this.form.controls.name.value) {
      this.form.controls.name.markAsTouched();
      return;
    }

    this.api.aiWish({
      name: this.form.controls.name.value,
      event: this.form.controls.type.value,
      tone: 'Warm',
      language: 'English'
    }).subscribe((res) => this.form.controls.wish.setValue(res.message));
  }

  save() {
    if (!this.isAdmin || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.api.saveEvent({
      name: value.name,
      eventType: value.type,
      eventDate: value.eventDate,
      recurring: value.recurring,
      wish: value.wish,
      festival: value.type === 'Festival' ? value.festival : undefined
    }).subscribe(() => {
      this.events$ = this.api.events();
      this.form.patchValue({ wish: '', festival: '' });
    });
  }
}
