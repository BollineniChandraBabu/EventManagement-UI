import { Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  private readonly destroyRef = inject(DestroyRef);

  readonly isAdmin = this.auth.isAdmin;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    relation: [''],
    event: ['', [Validators.required]],
    tone: ['Warm', [Validators.required]],
    language: ['English', [Validators.required]]
  });
  result = '';
  subject = '';
  relationshipOptions: string[] = [];

  constructor() {
    this.api.relationshipSeeds().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (seeds) => {
        this.relationshipOptions = (seeds ?? []).map((seed) => seed.name);
      }
    });
  }

  get desktopPreviewSrcDoc(): string {
    return this.wrapPreviewHtml(this.result);
  }

  get mobilePreviewSrcDoc(): string {
    return this.wrapPreviewHtml(this.result);
  }

  generate() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.api.aiWish(this.form.getRawValue()).subscribe((res) => {
      this.subject = res.subject;
      this.result = res.htmlMessage;
    });
  }


  private wrapPreviewHtml(content: string): string {
    return `<html><body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#212529;">${content}</body></html>`;
  }
}
