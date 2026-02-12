import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatListModule } from '@angular/material/list';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatSlideToggleModule, MatListModule, AsyncPipe],
  template: `<div class="page"><mat-card>
    <h2>Create Event</h2>
    <form [formGroup]="form" class="form-grid">
      <mat-form-field><mat-label>Name</mat-label><input matInput formControlName="name"></mat-form-field>
      <mat-form-field><mat-label>Type</mat-label><mat-select formControlName="type"><mat-option *ngFor="let t of types" [value]="t">{{ t }}</mat-option></mat-select></mat-form-field>
      <mat-form-field><mat-label>Festival</mat-label><input matInput formControlName="festival"></mat-form-field>
      <mat-form-field><mat-label>Date</mat-label><input matInput type="date" formControlName="eventDate"></mat-form-field>
      <mat-slide-toggle formControlName="recurring">Recurring</mat-slide-toggle>
      <mat-form-field><mat-label>Wish</mat-label><input matInput formControlName="wish"></mat-form-field>
      <button mat-button type="button" (click)="generateWish()">AI generate wish</button>
      <button mat-raised-button color="primary" type="button" (click)="save()">Preview & Save</button>
    </form>
    <p><b>Preview:</b> {{ form.controls.wish.value }}</p>
    <mat-list><mat-list-item *ngFor="let e of (events$ | async) ?? []">{{e.name}} - {{e.type}} - {{e.eventDate}}</mat-list-item></mat-list>
  </mat-card></div>`
})
export class EventsComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  types = ['Birthday', 'Anniversary', 'Engagement', 'Festival'];
  events$ = this.api.events();
  form = this.fb.nonNullable.group({ name: [''], type: ['Birthday'], festival: [''], eventDate: [''], recurring: [false], wish: [''] });

  generateWish() {
    this.api.aiWish({ name: this.form.controls.name.value, event: this.form.controls.type.value, tone: 'Warm', language: 'English' })
      .subscribe((res) => this.form.controls.wish.setValue(res.message));
  }

  save() { this.api.saveEvent(this.form.getRawValue()).subscribe(() => this.events$ = this.api.events()); }
}
