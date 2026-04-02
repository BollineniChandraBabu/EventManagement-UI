import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RelationshipSeed } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './relationship-seeds.component.html',
  styleUrl: './relationship-seeds.component.css'
})
export class RelationshipSeedsComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  relationshipSeeds: RelationshipSeed[] = [];
  filterText = '';
  page = 0;
  readonly pageSizes = [5, 10, 20];
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  loading = false;
  deletingIds = new Set<number>();

  constructor() {
    this.loadRelationshipSeeds();
  }

  onSearchInput(value: string): void {
    const previousFilter = this.filterText;
    this.filterText = value;

    if (previousFilter.trim() && !this.filterText.trim()) {
      this.applySearch();
    }
  }

  applySearch(): void {
    this.filterText = this.filterText.trim();
    this.page = 0;
    this.loadRelationshipSeeds();
  }

  clearSearch(): void {
    if (!this.filterText) {
      return;
    }

    this.filterText = '';
    this.page = 0;
    this.loadRelationshipSeeds();
  }

  onPageSizeChange(value: string): void {
    this.pageSize = Number(value);
    this.page = 0;
    this.loadRelationshipSeeds();
  }

  nextPage(): void {
    if (this.page < this.totalPages - 1) {
      this.page++;
      this.loadRelationshipSeeds();
    }
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadRelationshipSeeds();
    }
  }

  get displayPage(): number {
    return this.page + 1;
  }

  get startRow(): number {
    if (this.totalElements === 0 || this.relationshipSeeds.length === 0) {
      return 0;
    }
    return this.page * this.pageSize + 1;
  }

  get endRow(): number {
    return this.relationshipSeeds.length === 0 ? 0 : this.startRow + this.relationshipSeeds.length - 1;
  }

  deleteSeed(seed: RelationshipSeed): void {
    this.deletingIds.add(seed.id);
    this.api.deleteRelationshipSeed(seed.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('Relationship deleted successfully.');
        this.deletingIds.delete(seed.id);
        this.loadRelationshipSeeds();
      },
      error: () => {
        this.toast.error('Unable to delete relationship right now.');
        this.deletingIds.delete(seed.id);
      }
    });
  }

  isDeleting(id: number): boolean {
    return this.deletingIds.has(id);
  }

  private loadRelationshipSeeds(): void {
    this.loading = true;
    this.relationshipSeeds = [];

    this.api.relationshipSeedsPaged(this.page, this.pageSize, this.filterText).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.relationshipSeeds = response.content ?? [];
        this.totalElements = response.totalElements ?? this.relationshipSeeds.length;
        this.totalPages = response.totalPages ?? 0;
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to load relationship seeds right now.');
        this.totalElements = 0;
        this.totalPages = 0;
        this.loading = false;
      }
    });
  }
}
