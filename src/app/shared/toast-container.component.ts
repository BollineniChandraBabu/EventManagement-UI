import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, QueryList, ViewChildren, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastLevel, ToastService } from '../core/services/toast.service';

declare global {
  interface Window {
    mdb?: {
      Toast?: new (element: HTMLElement, options?: { autohide?: boolean; delay?: number }) => { show: () => void };
    };
  }
}

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack position-fixed top-0 end-0 p-3">
      <div
        #toastElement
        *ngFor="let toast of toastService.toasts()"
        class="toast toast-card"
        [ngClass]="toastClass(toast.level)"
        [attr.data-toast-id]="toast.id"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div class="toast-header border-0 bg-transparent pb-0">
          <div class="toast-level-pill" [ngClass]="pillClass(toast.level)">
            <i class="me-2" [ngClass]="iconClass(toast.level)"></i>
            <span>{{ levelLabel(toast.level) }}</span>
          </div>
          <button type="button" class="btn-close ms-3" aria-label="Close" (click)="toastService.dismiss(toast.id)"></button>
        </div>
        <div class="toast-body pt-2">{{ toast.text }}</div>
      </div>
    </div>
  `,
  styles: [
    `
      .toast-stack {
        z-index: 1100;
      }

      .toast-card {
        width: min(360px, calc(100vw - 1.5rem));
        border: 0;
        border-radius: 0.9rem;
        box-shadow: 0 14px 36px rgba(12, 26, 75, 0.22);
        backdrop-filter: blur(2px);
        margin-bottom: 0.75rem;
        overflow: hidden;
      }

      .toast-card.toast-success {
        background: linear-gradient(135deg, #ecfdf3 0%, #d1fae5 100%);
        color: #065f46;
      }

      .toast-card.toast-error {
        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        color: #991b1b;
      }

      .toast-card.toast-warning {
        background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        color: #92400e;
      }

      .toast-card.toast-info {
        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        color: #1e40af;
      }

      .toast-level-pill {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        padding: 0.35rem 0.7rem;
      }

      .pill-success {
        background-color: rgba(16, 185, 129, 0.16);
      }

      .pill-error {
        background-color: rgba(239, 68, 68, 0.16);
      }

      .pill-warning {
        background-color: rgba(245, 158, 11, 0.2);
      }

      .pill-info {
        background-color: rgba(59, 130, 246, 0.18);
      }

      .toast-body {
        font-size: 0.92rem;
        line-height: 1.4;
        font-weight: 500;
      }

      .btn-close {
        filter: saturate(0.2);
        opacity: 0.75;
      }
    `
  ]
})
export class ToastContainerComponent implements AfterViewInit, OnDestroy {
  readonly toastService = inject(ToastService);

  @ViewChildren('toastElement', { read: ElementRef })
  private toastElements!: QueryList<ElementRef<HTMLElement>>;

  private shownToastIds = new Set<number>();
  private querySub?: Subscription;

  ngAfterViewInit(): void {
    this.bindAndShowToasts();
    this.querySub = this.toastElements.changes.subscribe(() => this.bindAndShowToasts());
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
  }

  toastClass(level: ToastLevel): string {
    if (level === 'success') return 'toast-success';
    if (level === 'error') return 'toast-error';
    if (level === 'warning') return 'toast-warning';
    return 'toast-info';
  }

  pillClass(level: ToastLevel): string {
    if (level === 'success') return 'pill-success';
    if (level === 'error') return 'pill-error';
    if (level === 'warning') return 'pill-warning';
    return 'pill-info';
  }

  iconClass(level: ToastLevel): string {
    if (level === 'success') return 'fa-solid fa-circle-check';
    if (level === 'error') return 'fa-solid fa-circle-xmark';
    if (level === 'warning') return 'fa-solid fa-triangle-exclamation';
    return 'fa-solid fa-circle-info';
  }

  levelLabel(level: ToastLevel): string {
    if (level === 'success') return 'Success';
    if (level === 'error') return 'Error';
    if (level === 'warning') return 'Warning';
    return 'Info';
  }

  private bindAndShowToasts(): void {
    this.toastElements.forEach((ref) => {
      const element = ref.nativeElement;
      const toastId = Number(element.dataset['toastId']);
      const toast = this.toastService.toasts().find((item) => item.id === toastId);

      if (!toast || this.shownToastIds.has(toast.id)) {
        return;
      }

      this.shownToastIds.add(toast.id);

      const mdbToast = window.mdb?.Toast;
      if (mdbToast) {
        const instance = new mdbToast(element, { autohide: true, delay: toast.durationMs });
        element.addEventListener('hidden.mdb.toast', () => this.toastService.dismiss(toast.id), { once: true });
        instance.show();
        return;
      }

      element.classList.add('show');
      window.setTimeout(() => this.toastService.dismiss(toast.id), toast.durationMs);
    });
  }
}
