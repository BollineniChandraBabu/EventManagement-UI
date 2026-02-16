import {Component, DestroyRef, inject} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";
import {AppUser} from "../../core/models/api.models";

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
  subject = '';

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

  useAsTemplate() {
    if (!this.isAdmin() || !this.result.trim()) {
      return;
    }

    this.api.saveTemplate({ html: `<p>${this.result.trim()}</p>` }).subscribe();
  }


  private wrapPreviewHtml(content: string): string {
    return `<html><body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#212529;">${content}</body></html>`;
  }
}
