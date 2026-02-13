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
  templateUrl: './events.component.html',
  styleUrl: './events.component.css'
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
