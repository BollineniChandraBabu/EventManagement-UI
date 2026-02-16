import {Component, DestroyRef, inject} from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {AppUser} from "../../core/models/api.models";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css'
})
export class EventsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isAdmin = this.auth.isAdmin;
  types = ['Birthday', 'Anniversary', 'Engagement', 'Festival', 'Good Morning', 'Good Night'];
  events$ = this.api.events();
  allUsers: AppUser[] = [];
  result = '';
  subject = '';


  constructor() {
    this.loadUsers();
  }

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
    eventDate: [''],
    recurring: [false],
    wish: [''],
    relation: ['']
  });

  generateWish() {
    if (!this.isAdmin() || !this.form.controls.name.value) {
      this.form.controls.name.markAsTouched();
      return;
    }
    const nameObj = this.form.controls.name.value as any;
    this.api.aiWish({
      name: nameObj.name,
      event: this.form.controls.type.value,
      tone: 'Warm',
      language: 'English',
      relation: this.form.controls.relation.value
    }).subscribe((res) => {
      this.subject = res.subject;
      this.result = res.htmlMessage;
    });
  }

  save() {
    if (!this.isAdmin() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const nameObj = this.form.controls.name.value as any;
    this.api.saveEvent({
      subject: this.subject,
      body: this.result,
      eventType: value.type === 'Good Morning' ? "GOODMORNING" : 'Good Night' ? "GOODNIGHT" : value.type,
      eventDate: value.eventDate,
      recurring: value.recurring,
      festivalName: value.type === 'Festival' ? value.festival : undefined,
      userId: nameObj.id
    }).subscribe(() => {
      this.events$ = this.api.events();
      this.form.patchValue({ wish: '', festival: '' });
    });
  }

  private wrapPreviewHtml(content: string): string {
    return `<html><body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#212529;">${content}</body></html>`;
  }

  private loadUsers(): void {
    this.api.users().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((users) => {
      this.allUsers = users;
    });
  }
}
