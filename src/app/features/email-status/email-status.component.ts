import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { EmailStatus } from '../../core/models/api.models';

@Component({
  standalone: true,
  imports: [CommonModule],
  templateUrl: './email-status.component.html',
  styleUrl: './email-status.component.css'
})
export class EmailStatusComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isAdmin = this.auth.isAdmin;

  allItems: EmailStatus[] = [];
  viewItems: EmailStatus[] = [];

  filterText = '';
  filterStatus = 'ALL';
  page = 1;
  readonly pageSizes = [5, 10, 20];
  pageSize = 10;
  totalPages = 1;

  constructor() {
    this.loadItems();
  }

  get startRow(): number {
    return this.allItems.length === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get endRow(): number {
    return Math.min(this.page * this.pageSize, this.filteredItemsCount());
  }

  filteredItemsCount(): number {
    return this.filteredItems().length;
  }

  retry(id: number): void {
    if (!this.isAdmin()) {
      return;
    }

    this.api.retryEmail(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadItems());
  }

  onSearch(value: string): void {
    this.filterText = value.trim().toLowerCase();
    this.page = 1;
    this.applyFilters();
  }

  onStatusFilter(value: string): void {
    this.filterStatus = value;
    this.page = 1;
    this.applyFilters();
  }

  onPageSizeChange(value: string): void {
    this.pageSize = Number(value);
    this.page = 1;
    this.applyFilters();
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.applyFilters();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.applyFilters();
    }
  }

  private loadItems(): void {
    this.api.emailStatuses().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
      this.allItems = items;
      this.applyFilters();
    });
  }

  private filteredItems(): EmailStatus[] {
    return this.allItems.filter((item) => {
      const matchesText = !this.filterText
        || item.to.toLowerCase().includes(this.filterText)
        || item.subject.toLowerCase().includes(this.filterText);

      const matchesStatus = this.filterStatus === 'ALL' || item.status === this.filterStatus;
      return matchesText && matchesStatus;
    });
  }

  private applyFilters(): void {
    const filtered = this.filteredItems();
    this.totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    this.page = Math.min(this.page, this.totalPages);

    const start = (this.page - 1) * this.pageSize;
    this.viewItems = filtered.slice(start, start + this.pageSize);
  }
}
