import { Injectable, signal } from '@angular/core';

export type ToastLevel = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  text: string;
  level: ToastLevel;
  durationMs: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);
  private nextId = 1;

  show(text: string, level: ToastLevel = 'info', durationMs = 4000): void {
    const toast: ToastMessage = { id: this.nextId++, text, level, durationMs };
    this.toasts.update((items) => [...items, toast]);
  }

  success(text: string, durationMs?: number): void {
    this.show(text, 'success', durationMs);
  }

  error(text: string, durationMs?: number): void {
    this.show(text, 'error', durationMs);
  }

  info(text: string, durationMs?: number): void {
    this.show(text, 'info', durationMs);
  }

  warning(text: string, durationMs?: number): void {
    this.show(text, 'warning', durationMs);
  }

  dismiss(id: number): void {
    this.toasts.update((items) => items.filter((item) => item.id !== id));
  }
}
