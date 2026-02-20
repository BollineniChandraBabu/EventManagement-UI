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
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1100;">
      <div
        #toastElement
        *ngFor="let toast of toastService.toasts()"
        class="toast"
        [attr.data-toast-id]="toast.id"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div class="toast-header" [ngClass]="headerClass(toast.level)">
          <i class="me-2" [ngClass]="iconClass(toast.level)"></i>
          <strong class="me-auto">{{ levelLabel(toast.level) }}</strong>
          <small>now</small>
          <button type="button" class="btn-close ms-2" aria-label="Close" (click)="toastService.dismiss(toast.id)"></button>
        </div>
        <div class="toast-body">{{ toast.text }}</div>
      </div>
    </div>
  `
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

  headerClass(level: ToastLevel): string {
    if (level === 'success') return 'bg-success text-white';
    if (level === 'error') return 'bg-danger text-white';
    if (level === 'warning') return 'bg-warning';
    return 'bg-info text-white';
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
