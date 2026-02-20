import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AppUser } from '../../core/models/api.models';
import { ROLE_ADMIN, ROLE_USER, UserRole } from '../../core/constants/roles.constants';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AsyncPipe],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

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
  saving = false;
  deactivatingIds = new Set<number>();
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly searchDebounceMs = 350;

  form = this.fb.nonNullable.group({
    id: [0],
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    role: [ROLE_USER as UserRole, [Validators.required]],
    isBirthdayEnabled: [false],
    isGoodMorningEnabled: [false],
    isGoodNightEnabled: [false],
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.searchTimer) {
        clearTimeout(this.searchTimer);
      }
    });

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

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { id, ...payload } = this.form.getRawValue();
    const req = id ? this.api.updateUser(id, payload) : this.api.saveUser(payload);
    this.saving = true;

    req.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(id ? 'User updated successfully.' : 'User created successfully.');
        this.loadUsers();
        this.resetForm();
        this.saving = false;
      },
      error: () => {
        this.toast.error('Unable to save user. Please try again.');
        this.saving = false;
      }
    });
  }

  edit(user: AppUser): void {
    this.form.patchValue({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isGoodMorningEnabled: user.isGoodMorningEnabled,
      isBirthdayEnabled: user.isBirthdayEnabled,
      isGoodNightEnabled: user.isGoodNightEnabled
    });
  }

  resetForm(): void {
    this.form.reset({ id: 0, name: '', email: '', role: ROLE_USER });
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

  onSearch(value: string): void {
    this.filterText = value.trim();
    this.page = 0;

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    this.searchTimer = setTimeout(() => {
      this.loadUsers();
    }, this.searchDebounceMs);
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
