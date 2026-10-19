import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, ViewChild, effect, inject } from '@angular/core';
import { ConfirmDialogService } from '../core/services/confirm-dialog.service';

/** Single app-wide host for ConfirmDialogService. Mounted once in AppComponent. */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css'
})
export class ConfirmDialogComponent implements OnDestroy {
  readonly dialog = inject(ConfirmDialogService);

  @ViewChild('cancelButton') private cancelButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('confirmButton') private confirmButton?: ElementRef<HTMLButtonElement>;

  private previouslyFocused: HTMLElement | null = null;
  private wasOpen = false;

  constructor() {
    effect(() => {
      const open = this.dialog.request() !== null;
      if (open && !this.wasOpen) {
        this.onOpen();
      } else if (!open && this.wasOpen) {
        this.onClose();
      }
      this.wasOpen = open;
    });
  }

  ngOnDestroy(): void {
    this.unlockScroll();
  }

  confirm(): void {
    this.dialog.request()?.resolve(true);
  }

  cancel(): void {
    this.dialog.request()?.resolve(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cancel();
  }

  /** Keeps Tab inside the dialog (it only has two buttons). */
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') {
      return;
    }
    const first = this.cancelButton?.nativeElement;
    const last = this.confirmButton?.nativeElement;
    if (!first || !last) {
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private onOpen(): void {
    this.previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    // Focus "Cancel" so an accidental Enter/Space never confirms a destructive action.
    setTimeout(() => this.cancelButton?.nativeElement.focus());
  }

  private onClose(): void {
    this.unlockScroll();
    this.previouslyFocused?.focus?.();
    this.previouslyFocused = null;
  }

  private unlockScroll(): void {
    document.body.style.overflow = '';
  }
}
