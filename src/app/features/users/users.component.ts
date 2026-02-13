import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/services/api.service';
import { AppUser } from '../../core/models/api.models';
import { ROLE_ADMIN, ROLE_USER, UserRole } from '../../core/constants/roles.constants';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatTableModule, AsyncPipe],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  cols = ['name', 'email', 'role', 'actions'];
  users$ = this.api.users();
  readonly ROLE_ADMIN = ROLE_ADMIN;
  readonly ROLE_USER = ROLE_USER;

  form = this.fb.nonNullable.group({
    id: [0],
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    role: [ROLE_USER as UserRole, [Validators.required]]
  });

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { id, ...payload } = this.form.getRawValue();
    const req = id ? this.api.updateUser(id, payload) : this.api.saveUser(payload);
    req.subscribe(() => {
      this.users$ = this.api.users();
      this.resetForm();
    });
  }

  edit(user: AppUser) {
    this.form.patchValue({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  }

  resetForm() {
    this.form.reset({ id: 0, name: '', email: '', role: ROLE_USER });
  }

  deactivate(id: number) {
    this.api.deactivateUser(id).subscribe(() => this.users$ = this.api.users());
  }
}
