import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AppUser, RelationshipSeed } from '../../core/models/api.models';
import { ROLE_ADMIN, ROLE_USER, UserRole } from '../../core/constants/roles.constants';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './user-editor.component.html',
  styleUrl: './user-editor.component.css'
})
export class UserEditorComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  readonly ROLE_ADMIN = ROLE_ADMIN;
  readonly ROLE_USER = ROLE_USER;

  loading = false;
  saving = false;
  relationshipSeeds: RelationshipSeed[] = [];
  editingUserId: number | null = null;

  form = this.fb.nonNullable.group({
    id: [0],
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    dob: ['', [Validators.required]],
    role: [ROLE_USER as UserRole, [Validators.required]],
    relationShip: ['', [Validators.required]],
    isBirthdayEnabled: [false],
    isGoodMorningEnabled: [false],
    isGoodNightEnabled: [false]
  });

  constructor() {
    this.loadRelationshipSeeds();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('id'));
      this.editingUserId = Number.isNaN(id) ? null : id;
      this.resetForm();
      if (this.editingUserId) {
        this.loadUser(this.editingUserId);
      }
    });
  }

  get relationshipOptions(): string[] {
    return this.relationshipSeeds.map((seed) => seed.name);
  }

  get pageTitle(): string {
    return this.editingUserId ? 'Edit User' : 'Create User';
  }

  get submitLabel(): string {
    return this.editingUserId ? 'Update User' : 'Create User';
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { id, ...payload } = this.form.getRawValue();
    const request = id ? this.api.updateUser(id, payload) : this.api.saveUser(payload);

    this.saving = true;
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(id ? 'User updated successfully.' : 'User created successfully.');
        this.saving = false;
        this.router.navigateByUrl('/users');
      },
      error: () => {
        this.toast.error('Unable to save user. Please try again.');
        this.saving = false;
      }
    });
  }

  private loadUser(id: number): void {
    this.loading = true;
    this.api.userById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (user) => {
        this.patchForm(user);
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to load user details right now.');
        this.loading = false;
        this.router.navigateByUrl('/users');
      }
    });
  }

  private loadRelationshipSeeds(): void {
    this.api.relationshipSeeds().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (seeds) => {
        this.relationshipSeeds = seeds ?? [];
      },
      error: () => {
        this.toast.error('Unable to load relationship options right now.');
      }
    });
  }

  private patchForm(user: AppUser): void {
    this.form.patchValue({
      id: user.id,
      name: user.name,
      email: user.email,
      dob: user.dob || user.dateOfBirth || '',
      role: user.role,
      relationShip: user.relationShip || '',
      isBirthdayEnabled: !!user.isBirthdayEnabled,
      isGoodMorningEnabled: !!user.isGoodMorningEnabled,
      isGoodNightEnabled: !!user.isGoodNightEnabled
    });
  }

  private resetForm(): void {
    this.form.reset({
      id: 0,
      name: '',
      email: '',
      dob: '',
      role: ROLE_USER,
      relationShip: '',
      isBirthdayEnabled: false,
      isGoodMorningEnabled: false,
      isGoodNightEnabled: false
    });
  }
}
