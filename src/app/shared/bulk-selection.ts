import { signal } from '@angular/core';

/**
 * Tracks which rows on a list page are ticked for a batch action.
 *
 * The selection is keyed by id and lives only for the current page: loading a
 * different page starts a fresh selection, so a stale id can never be deleted.
 */
export class BulkSelection {
  private readonly selectedIds = signal<number[]>([]);
  readonly ids = this.selectedIds.asReadonly();

  count(): number {
    return this.selectedIds().length;
  }

  hasSelection(): boolean {
    return this.count() > 0;
  }

  isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  toggle(id: number): void {
    this.selectedIds.update((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]));
  }

  clear(): void {
    this.selectedIds.set([]);
  }

  /** True when every id in the given page is already selected (and the page is not empty). */
  allSelected(pageIds: number[]): boolean {
    return pageIds.length > 0 && pageIds.every((id) => this.isSelected(id));
  }

  /** Ticks every id on the page, or clears them all when they are already ticked. */
  toggleAll(pageIds: number[]): void {
    if (this.allSelected(pageIds)) {
      this.selectedIds.set([]);
      return;
    }
    this.selectedIds.set([...pageIds]);
  }

  /** Drops any selected id that is no longer on the current page. */
  retainOnly(pageIds: number[]): void {
    const allowed = new Set(pageIds);
    this.selectedIds.update((ids) => ids.filter((id) => allowed.has(id)));
  }
}
