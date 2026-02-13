import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './ai-wishes.component.html',
  styleUrl: './ai-wishes.component.css'
})
export class AiWishesComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly isAdmin = this.auth.isAdmin;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    relation: [''],
    event: ['', [Validators.required]],
    tone: ['Warm', [Validators.required]],
    language: ['English', [Validators.required]]
  });
  result = '';

  generate() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.api.aiWish(this.form.getRawValue()).subscribe((res) => this.result = res.htmlMessage);
  }

  useAsTemplate() {
    if (!this.isAdmin() || !this.result.trim()) {
      return;
    }

    this.api.saveTemplate({ html: `<p>${this.result.trim()}</p>` }).subscribe();
  }
}
