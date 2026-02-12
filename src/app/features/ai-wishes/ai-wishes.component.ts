import { Component, inject } from '@angular/core';
import { FormsModule, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `<div class="page"><mat-card>
    <h2>AI Wish Generator</h2>
    <form [formGroup]="form" class="form-grid">
      <mat-form-field><mat-label>Name</mat-label><input matInput formControlName="name"></mat-form-field>
      <mat-form-field><mat-label>Relation</mat-label><input matInput formControlName="relation"></mat-form-field>
      <mat-form-field><mat-label>Event</mat-label><input matInput formControlName="event"></mat-form-field>
      <mat-form-field><mat-label>Tone</mat-label><input matInput formControlName="tone"></mat-form-field>
      <mat-form-field><mat-label>Language</mat-label><input matInput formControlName="language"></mat-form-field>
      <button mat-raised-button color="primary" type="button" (click)="generate()">Generate</button>
    </form>
    <mat-form-field style="width:100%"><mat-label>Editable result</mat-label><textarea matInput rows="4" [(ngModel)]="result"></textarea></mat-form-field>
    <button mat-button (click)="useAsTemplate()">Use as template</button>
  </mat-card></div>`
})
export class AiWishesComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  form = this.fb.nonNullable.group({ name: [''], relation: [''], event: [''], tone: ['Warm'], language: ['English'] });
  result = '';

  generate() { this.api.aiWish(this.form.getRawValue()).subscribe((res) => this.result = res.message); }
  useAsTemplate() { this.api.saveTemplate({ html: `<p>${this.result}</p>` }).subscribe(); }
}
