import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AppUser } from '../../core/models/api.models';
import { ROLE_ADMIN, ROLE_USER, UserRole } from '../../core/constants/roles.constants';

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

  readonly ROLE_ADMIN = ROLE_ADMIN;
  readonly ROLE_USER = ROLE_USER;

  allUsers: AppUser[] = [];
  viewUsers: AppUser[] = [];

  filterText = '';
  filterRole = 'ALL';
  page = 1;
  readonly pageSizes = [5, 10, 20];
  pageSize = 10;
  totalPages = 1;

  form = this.fb.nonNullable.group({
    id: [0],
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    role: [ROLE_USER as UserRole, [Validators.required]]
  });

  constructor() {
    this.loadUsers();
  }

  get startRow(): number {
    return this.allUsers.length === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get endRow(): number {
    return Math.min(this.page * this.pageSize, this.filteredUsersCount());
  }

  filteredUsersCount(): number {
    return this.filteredUsers().length;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { id, ...payload } = this.form.getRawValue();
    const req = id ? this.api.updateUser(id, payload) : this.api.saveUser(payload);

    req.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadUsers();
      this.resetForm();
    });
  }

  edit(user: AppUser): void {
    this.form.patchValue({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  }

  resetForm(): void {
    this.form.reset({ id: 0, name: '', email: '', role: ROLE_USER });
  }

  deactivate(id: number): void {
    this.api.deactivateUser(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadUsers());
  }

  onSearch(value: string): void {
    this.filterText = value.trim().toLowerCase();
    this.page = 1;
    this.applyFilters();
  }

  onRoleFilter(value: string): void {
    this.filterRole = value;
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

  private loadUsers(): void {
    this.api.users().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((users) => {
      this.allUsers = users;
      this.applyFilters();
    });
  }

  private filteredUsers(): AppUser[] {
    return this.allUsers.filter((user) => {
      const matchesText =
        !this.filterText ||
        user.name.toLowerCase().includes(this.filterText) ||
        user.email.toLowerCase().includes(this.filterText);

      const matchesRole = this.filterRole === 'ALL' || user.role === this.filterRole;
      return matchesText && matchesRole;
    });
  }

  private applyFilters(): void {
    const filtered = this.filteredUsers();
    this.totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    this.page = Math.min(this.page, this.totalPages);

    const start = (this.page - 1) * this.pageSize;
    this.viewUsers = filtered.slice(start, start + this.pageSize);
  }
}
