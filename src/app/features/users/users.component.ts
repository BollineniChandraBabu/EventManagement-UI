import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AppUser } from '../../core/models/api.models';
import { ROLE_ADMIN, ROLE_USER } from '../../core/constants/roles.constants';
import { ToastService } from '../../core/services/toast.service';
import { ImpersonationService } from '../../core/services/impersonation.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly impersonation = inject(ImpersonationService);
  private readonly router = inject(Router);

  readonly ROLE_ADMIN = ROLE_ADMIN;
  readonly ROLE_USER = ROLE_USER;

  allUsers: AppUser[] = [];
  viewUsers: AppUser[] = [];

  filterText = '';
  filterRole = 'ALL';
  page = 0;
  readonly pageSizes = [5, 10, 20];
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  loading = false;
  deactivatingIds = new Set<number>();

  constructor() {
    this.loadUsers();
  }

  get displayPage(): number {
    return this.page + 1;
  }

  get startRow(): number {
    if (this.totalElements === 0 || this.viewUsers.length === 0) {
      return 0;
    }
    return this.page * this.pageSize + 1;
  }

  get endRow(): number {
    return this.viewUsers.length === 0 ? 0 : this.startRow + this.viewUsers.length - 1;
  }

  deactivate(id: number): void {
    this.deactivatingIds.add(id);
    this.api.deactivateUser(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('User deactivated successfully.');
        this.deactivatingIds.delete(id);
        this.loadUsers();
      },
      error: () => {
        this.toast.error('Unable to deactivate user. Please try again.');
        this.deactivatingIds.delete(id);
      }
    });
  }

  isDeactivating(id: number): boolean {
    return this.deactivatingIds.has(id);
  }

  userDob(user: AppUser): string | null {
    return user.dob || user.dateOfBirth || null;
  }

  loginAsUser(user: AppUser): void {
    this.impersonation.startImpersonation(user);
    this.toast.info(`Now viewing as ${user.name}. Click "Return to Admin" to switch back.`);
    this.router.navigate(['/dashboard']);
  }

  onSearchInput(value: string): void {
    const previousFilter = this.filterText;
    this.filterText = value;
    if (previousFilter.trim() && !this.filterText.trim()) {
      this.applySearch();
    }
  }

  clearSearch(): void {
    if (!this.filterText) {
      return;
    }
    this.filterText = '';
    this.applySearch();
  }

  applySearch(): void {
    this.filterText = this.filterText.trim();
    this.page = 0;
    this.loadUsers();
  }

  onRoleFilter(value: string): void {
    this.filterRole = value;
    this.applyRoleFilter();
  }

  onPageSizeChange(value: string): void {
    this.pageSize = Number(value);
    this.page = 0;
    this.loadUsers();
  }

  nextPage(): void {
    if (this.page < this.totalPages - 1) {
      this.page++;
      this.loadUsers();
    }
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadUsers();
    }
  }

  private loadUsers(): void {
    this.loading = true;
    this.allUsers = [];
    this.viewUsers = [];
    this.totalElements = 0;
    this.totalPages = 0;

    this.api.users(this.page, this.pageSize, this.filterText).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.allUsers = response.content ?? [];
        this.totalElements = response.totalElements ?? this.allUsers.length;
        this.totalPages = response.totalPages ?? 0;
        this.applyRoleFilter();
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to fetch users right now.');
        this.loading = false;
      }
    });
  }

  private applyRoleFilter(): void {
    if (this.filterRole === 'ALL') {
      this.viewUsers = [...this.allUsers];
      return;
    }
    this.viewUsers = this.allUsers.filter((user) => user.role === this.filterRole);
  }
}
