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
      const parsedPayload = this.parseRawWishPayload(res);
      this.subject = parsedPayload.subject;
      this.result = parsedPayload.htmlMessage;
    });
  }

  useAsTemplate() {
    if (!this.isAdmin() || !this.result.trim()) {
      return;
    }

    this.api.saveTemplate({ html: `<p>${this.result.trim()}</p>` }).subscribe();
  }

  private parseRawWishPayload(payload: { subject?: string; htmlMessage?: string }): { subject: string; htmlMessage: string } {
    const subject = payload.subject ?? '';
    const htmlMessage = payload.htmlMessage ?? '';

    const nestedJsonSource = this.extractJsonString(subject) || this.extractJsonString(htmlMessage);
    if (!nestedJsonSource) {
      return { subject, htmlMessage };
    }

    try {
      const parsed = JSON.parse(nestedJsonSource) as { subject?: string; htmlMessage?: string };
      return {
        subject: parsed.subject ?? subject,
        htmlMessage: parsed.htmlMessage ?? htmlMessage
      };
    } catch {
      return { subject, htmlMessage };
    }
  }

  private extractJsonString(raw: string): string {
    if (!raw?.trim()) {
      return '';
    }

    const normalized = raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .trim();

    const fencedMatch = normalized.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      return fencedMatch[1].trim();
    }

    if (normalized.startsWith('{') && normalized.endsWith('}')) {
      return normalized;
    }

    return '';
  }

  private wrapPreviewHtml(content: string): string {
    return `<html><body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#212529;">${content}</body></html>`;
  }
}
