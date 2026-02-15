import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AsyncPipe, FormsModule],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css'
})
export class EventsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly isAdmin = this.auth.isAdmin;
  types = ['Birthday', 'Anniversary', 'Engagement', 'Festival'];
  events$ = this.api.events();

  result = '';
  subject = '';

  get desktopPreviewSrcDoc(): string {
    return this.wrapPreviewHtml(this.result);
  }

  get mobilePreviewSrcDoc(): string {
    return this.wrapPreviewHtml(this.result);
  }

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    type: ['Birthday', [Validators.required]],
    festival: [''],
    eventDate: ['', [Validators.required]],
    recurring: [false],
    wish: [''],
    relation: ['']
  });

  generateWish() {
    if (!this.isAdmin() || !this.form.controls.name.value) {
      this.form.controls.name.markAsTouched();
      return;
    }

    this.api.aiWish({
      name: this.form.controls.name.value,
      event: this.form.controls.type.value,
      tone: 'Warm',
      language: 'English',
      relation: this.form.controls.relation.value
    }).subscribe((res) => {
      const parsedPayload = this.parseRawWishPayload(res);
      this.subject = parsedPayload.subject;
      this.result = parsedPayload.htmlMessage;
    });
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

  save() {
    if (!this.isAdmin() || this.form.invalid) {
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
      festival: value.type === 'Festival' ? value.festival : undefined,
      relation: value.relation
    }).subscribe(() => {
      this.events$ = this.api.events();
      this.form.patchValue({ wish: '', festival: '' });
    });
  }

  private wrapPreviewHtml(content: string): string {
    return `<html><body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#212529;">${content}</body></html>`;
  }
}
