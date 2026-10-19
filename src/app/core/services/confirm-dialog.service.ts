import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

export type ConfirmTone = 'danger' | 'primary';

export interface ConfirmOptions {
  title: string;
  message: string;
  /** Optional second line, e.g. what else is affected. */
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
  /** Font Awesome class shown in the dialog header. */
  icon?: string;
}

export interface ConfirmDeleteOptions {
  /** What is being deleted, e.g. `the "Birthday" event type`. */
  itemLabel: string;
  detail?: string;
  confirmText?: string;
}

export interface ConfirmRequest {
  options: Required<Omit<ConfirmOptions, 'detail'>> & Pick<ConfirmOptions, 'detail'>;
  resolve: (confirmed: boolean) => void;
}

/**
 * Opens the app-wide confirmation dialog (see ConfirmDialogComponent).
 * The returned observable emits exactly once (true = confirmed, false = cancelled) and completes.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  readonly request = signal<ConfirmRequest | null>(null);

  confirm(options: ConfirmOptions): Observable<boolean> {
    return new Observable<boolean>((subscriber) => {
      // Only one dialog at a time: a newer request cancels the older one.
      this.request()?.resolve(false);

      const request: ConfirmRequest = {
        options: {
          confirmText: 'Confirm',
          cancelText: 'Cancel',
          tone: 'primary',
          icon: 'fa-circle-question',
          ...options
        },
        resolve: (confirmed: boolean) => {
          if (this.request() === request) {
            this.request.set(null);
          }
          subscriber.next(confirmed);
          subscriber.complete();
        }
      };
      this.request.set(request);

      // If the caller goes away (e.g. route change) while the dialog is open, close it quietly.
      return () => {
        if (this.request() === request) {
          this.request.set(null);
        }
      };
    });
  }

  /** Standard wording for destructive actions. */
  confirmDelete(options: ConfirmDeleteOptions): Observable<boolean> {
    return this.confirm({
      title: 'Delete this item?',
      message: `You are about to delete ${options.itemLabel}. This action cannot be undone.`,
      detail: options.detail,
      confirmText: options.confirmText ?? 'Delete',
      tone: 'danger',
      icon: 'fa-trash-can'
    });
  }
}
