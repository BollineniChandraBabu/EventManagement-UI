import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import {AppUser, UserStatusUpdateRequest} from '../../core/models/api.models';
import { ROLE_ADMIN, ROLE_USER } from '../../core/constants/roles.constants';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ImpersonationService } from '../../core/services/impersonation.service';
import { AuthService } from '../../core/services/auth.service';
import { SensitiveEmailPipe } from '../../core/pipes/sensitive-email.pipe';
import { SensitiveInfoToggleComponent } from '../../shared/sensitive-info-toggle.component';
import { MultiSelectFilterComponent, MultiSelectOption } from '../../shared/multi-select-filter.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SensitiveEmailPipe, SensitiveInfoToggleComponent, MultiSelectFilterComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly impersonation = inject(ImpersonationService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly ROLE_ADMIN = ROLE_ADMIN;
  readonly ROLE_USER = ROLE_USER;

  allUsers: AppUser[] = [];
  viewUsers: AppUser[] = [];

  filterText = '';
  selectedRoles: string[] = [];
  selectedGenders: string[] = [];
  selectedRelationships: string[] = [];
  selectedStatuses: string[] = [];
  roleOptions: MultiSelectOption[] = [
    { value: ROLE_ADMIN, label: ROLE_ADMIN },
    { value: ROLE_USER, label: ROLE_USER }
  ];
  genderOptions: MultiSelectOption[] = [
    { value: 'MALE', label: 'Male' },
    { value: 'FEMALE', label: 'Female' },
    { value: 'OTHER', label: 'Other' }
  ];
  relationshipOptions: MultiSelectOption[] = [];
  readonly statusOptions: MultiSelectOption[] = [
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' }
  ];
  page = 0;
  readonly pageSizes = [5, 10, 20];
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  sortBy = 'createdAt';
  sortDir: 'asc' | 'desc' = 'desc';
  loading = false;
  deactivatingIds = new Set<number>();

  constructor() {
    this.loadFilterValues();
    this.loadUsers();
  }

  loadFilterValues(): void {
    this.api.getUsersFilterValues().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        if (res.roles?.length) this.roleOptions = res.roles.map((role) => ({ value: role, label: role }));
        if (res.genders?.length) this.genderOptions = res.genders.map((gender) => ({ value: gender, label: this.titleCase(gender) }));
      },
      error: () => {}
    });
    this.api.relationshipSeeds(undefined, 0, 1000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (seeds) => {
        this.relationshipOptions = (seeds ?? []).map((seed) => ({
          value: seed.code,
          label: seed.displayName || seed.code
        }));
      },
      error: () => {}
    });
  }

  onRolesChange(values: string[]): void {
    this.selectedRoles = values;
    this.page = 0;
    this.loadUsers();
  }

  onGendersChange(values: string[]): void {
    this.selectedGenders = values;
    this.page = 0;
    this.loadUsers();
  }

  onRelationshipsChange(values: string[]): void {
    this.selectedRelationships = values;
    this.page = 0;
    this.loadUsers();
  }

  onStatusesChange(values: string[]): void {
    this.selectedStatuses = values;
    this.page = 0;
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

  deactivate(id: number, status: boolean): void {
    if (status) {
      this.updateUserStatus(id, status); // activating needs no confirmation
      return;
    }
    const name = this.viewUsers.find((user) => user.id === id)?.name;
    this.confirmDialog
      .confirm({
        title: 'Deactivate this user?',
        message: `${name ? `“${name}”` : 'This user'} will be deactivated. You can activate the account again later.`,
        confirmText: 'Deactivate',
        tone: 'danger',
        icon: 'fa-user-slash'
      })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateUserStatus(id, status));
  }

  private updateUserStatus(id: number, status: boolean): void {
    this.deactivatingIds.add(id);
    let payload={
      active:status
    }
    this.api.deactivateUser(id,payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        let statusMsg= status? 'activated':'deactivated';
        this.toast.success('User ' +statusMsg +' successfully.');
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

  canImpersonate(user: AppUser): boolean {
    return user.role !== ROLE_ADMIN;
  }

  loginAsUser(user: AppUser): void {
    if (!this.canImpersonate(user)) {
      this.toast.warning('Admin users cannot be impersonated.');
      return;
    }

    this.auth.loginAsUser(user.email).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.impersonation.startImpersonation(user);
        this.toast.info(`Now viewing as ${user.name}. Click "Return to Admin" to switch back.`);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.toast.error('Unable to login as this user right now.');
      }
    });
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

  onPageSizeChange(value: string): void {
    this.pageSize = Number(value);
    this.page = 0;
    this.loadUsers();
  }

  onSortByChange(value: string): void {
    this.sortBy = value;
    this.page = 0;
    this.loadUsers();
  }

  onSortDirChange(value: string): void {
    this.sortDir = value === 'asc' ? 'asc' : 'desc';
    this.page = 0;
    this.loadUsers();
  }

  toggleSort(field: string): void {
    if (this.sortBy === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDir = 'asc';
    }

    this.page = 0;
    this.loadUsers();
  }

  isSortedBy(field: string): boolean {
    return this.sortBy === field;
  }

  private titleCase(value: string): string {
    return value ? value.charAt(0) + value.slice(1).toLowerCase() : value;
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

    const rolesParam = this.selectedRoles.length ? this.selectedRoles : undefined;
    const gendersParam = this.selectedGenders.length ? this.selectedGenders : undefined;
    const relationshipsParam = this.selectedRelationships.length ? this.selectedRelationships : undefined;
    const activeParam = this.selectedStatuses.length === 1 ? this.selectedStatuses[0] === 'true' : undefined;

    this.api.users(
      this.page,
      this.pageSize,
      this.filterText,
      this.sortBy,
      this.sortDir,
      rolesParam,
      gendersParam,
      relationshipsParam,
      activeParam
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.allUsers = response.content ?? [];
        this.viewUsers = [...this.allUsers];
        this.totalElements = response.totalElements ?? this.allUsers.length;
        this.totalPages = response.totalPages ?? 0;
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to fetch users right now.');
        this.loading = false;
      }
    });
  }
}
