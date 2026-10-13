import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, Input, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  error?: boolean;
}

const MAX_QUESTION_LENGTH = 500;

@Component({
  selector: 'app-agent-copilot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './copilot-chat.component.html',
  styleUrl: './copilot-chat.component.css'
})
export class CopilotChatComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  /** Set by the parent from /api/agent/status. When false the chat is shown but locked. */
  @Input() enabled = true;
  @ViewChild('scroller') private scroller?: ElementRef<HTMLElement>;

  readonly maxLength = MAX_QUESTION_LENGTH;
  readonly suggestions = [
    'How many emails failed so far?',
    'Any suspicious logins in the last 24 hours?',
    `Whose birthdays are in ${new Date().toLocaleString('en', { month: 'long' })}?`,
    'How many active users do we have?'
  ];

  turns: ChatTurn[] = [];
  draft = '';
  pending = false;

  get canSend(): boolean {
    return this.enabled && !this.pending && this.draft.trim().length > 0 && this.draft.length <= MAX_QUESTION_LENGTH;
  }

  useSuggestion(text: string): void {
    if (!this.enabled || this.pending) {
      return;
    }
    this.draft = text;
    this.send();
  }

  onEnter(event: Event): void {
    const keyboard = event as KeyboardEvent;
    if (keyboard.shiftKey) {
      return; // Shift+Enter inserts a newline
    }
    keyboard.preventDefault();
    this.send();
  }

  send(): void {
    if (!this.canSend) {
      return;
    }
    const question = this.draft.trim();
    this.draft = '';
    this.turns = [...this.turns, { role: 'user', text: question }];
    this.pending = true;
    this.scrollToEnd();

    this.api.askAdminCopilot(question).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.turns = [...this.turns, { role: 'assistant', text: res.answer?.trim() || 'No answer was returned.' }];
        this.pending = false;
        this.scrollToEnd();
      },
      error: (err: HttpErrorResponse) => {
        this.turns = [...this.turns, { role: 'assistant', text: this.errorText(err), error: true }];
        this.pending = false;
        this.scrollToEnd();
      }
    });
  }

  clear(): void {
    if (!this.pending) {
      this.turns = [];
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  private errorText(err: HttpErrorResponse): string {
    if (err.status === 503) {
      return err.error?.answer || 'The admin copilot is disabled on the server.';
    }
    if (err.status === 400) {
      return 'That question could not be processed. Keep it under 500 characters.';
    }
    return 'The copilot could not answer right now. Please try again in a moment.';
  }

  private scrollToEnd(): void {
    setTimeout(() => {
      const el = this.scroller?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }
}
