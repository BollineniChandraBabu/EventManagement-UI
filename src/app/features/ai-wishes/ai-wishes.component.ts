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
  templateUrl: './ai-wishes.component.html',
  styleUrl: './ai-wishes.component.css'
})
export class AiWishesComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  form = this.fb.nonNullable.group({ name: [''], relation: [''], event: [''], tone: ['Warm'], language: ['English'] });
  result = '';

  generate() { this.api.aiWish(this.form.getRawValue()).subscribe((res) => this.result = res.message); }
  useAsTemplate() { this.api.saveTemplate({ html: `<p>${this.result}</p>` }).subscribe(); }
}
