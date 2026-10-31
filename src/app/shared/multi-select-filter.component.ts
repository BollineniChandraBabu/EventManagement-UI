import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface MultiSelectOption {
  /** Value sent to the backend. */
  value: string;
  /** Text shown in the list. */
  label: string;
  /** Optional secondary text (count, code, …). */
  hint?: string;
}

/**
 * Reusable multi-select filter: a funnel button that opens a searchable checkbox
 * list. The parent owns the selection and is notified through `applied` when the
 * user confirms, so it can re-query the backend right away.
 */
@Component({
  selector: 'app-multi-select-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './multi-select-filter.component.html',
  styleUrl: './multi-select-filter.component.css'
})
export class MultiSelectFilterComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  @Input() label = 'Filter';
  @Input() icon = 'fa-solid fa-filter';
  @Input() searchPlaceholder = 'Search…';
  @Input() searchable = true;
  @Input() disabled = false;
  @Input() emptyText = 'No options';
  /** Options shown above the checkbox list (e.g. Active / Inactive). */
  @Input() options: MultiSelectOption[] = [];

  @Input() set selected(value: string[] | null | undefined) {
    this._selected = [...(value ?? [])];
    if (!this.open) {
      this.draft = new Set(this._selected);
    }
  }
  get selected(): string[] {
    return this._selected;
  }

  @Output() applied = new EventEmitter<string[]>();

  open = false;
  search = '';

  private _selected: string[] = [];
  private draft = new Set<string>();

  get filteredOptions(): MultiSelectOption[] {
    const term = this.search.trim().toLowerCase();
    if (!term) {
      return this.options;
    }
    return this.options.filter(
      (option) => option.label.toLowerCase().includes(term) || option.value.toLowerCase().includes(term)
    );
  }

  get activeCount(): number {
    return this._selected.length;
  }

  get draftCount(): number {
    return this.draft.size;
  }

  get allFilteredSelected(): boolean {
    const options = this.filteredOptions;
    return options.length > 0 && options.every((option) => this.draft.has(option.value));
  }

  toggleOpen(): void {
    if (this.disabled) {
      return;
    }
    this.open = !this.open;
    if (this.open) {
      this.search = '';
      this.draft = new Set(this._selected);
    }
  }

  close(): void {
    this.open = false;
    this.search = '';
  }

  isChecked(value: string): boolean {
    return this.draft.has(value);
  }

  toggle(value: string): void {
    const next = new Set(this.draft);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    this.draft = next;
  }

  toggleAll(): void {
    const options = this.filteredOptions;
    const next = new Set(this.draft);
    if (options.every((option) => next.has(option.value))) {
      options.forEach((option) => next.delete(option.value));
    } else {
      options.forEach((option) => next.add(option.value));
    }
    this.draft = next;
  }

  clearDraft(): void {
    this.draft = new Set();
  }

  apply(): void {
    const values = this.options.map((option) => option.value).filter((value) => this.draft.has(value));
    this._selected = values;
    this.close();
    this.applied.emit(values);
  }

  trackByValue(_: number, option: MultiSelectOption): string {
    return option.value;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close();
    }
  }
}
