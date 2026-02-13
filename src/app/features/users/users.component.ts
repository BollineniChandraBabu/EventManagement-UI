import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { AsyncPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatTableModule, AsyncPipe],
  template: `<div class="page"><mat-card>
  <h2>Users (Admin)</h2>
  <form [formGroup]="form" class="form-grid">
    <mat-form-field><mat-label>Name</mat-label><input matInput formControlName="name"></mat-form-field>
    <mat-form-field><mat-label>Email</mat-label><input matInput formControlName="email"></mat-form-field>
    <mat-form-field><mat-label>Role</mat-label><mat-select formControlName="role"><mat-option value="USER">USER</mat-option><mat-option value="ADMIN">ADMIN</mat-option></mat-select></mat-form-field>
    <button mat-raised-button color="primary" type="button" (click)="save()">Create / Edit User</button>
  </form>
  <table mat-table [dataSource]="(users$ | async) ?? []">
    <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef>Name</th><td mat-cell *matCellDef="let e">{{ e.name }}</td></ng-container>
    <ng-container matColumnDef="email"><th mat-header-cell *matHeaderCellDef>Email</th><td mat-cell *matCellDef="let e">{{ e.email }}</td></ng-container>
    <ng-container matColumnDef="role"><th mat-header-cell *matHeaderCellDef>Role</th><td mat-cell *matCellDef="let e">{{ e.role }}</td></ng-container>
    <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th><td mat-cell *matCellDef="let e"><button mat-button (click)="deactivate(e.id)">Deactivate</button></td></ng-container>
    <tr mat-header-row *matHeaderRowDef="cols"></tr>
    <tr mat-row *matRowDef="let row; columns: cols;"></tr>
  </table></mat-card></div>`
})
export class UsersComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  cols = ['name', 'email', 'role', 'actions'];
  users$ = this.api.users();
  form = this.fb.nonNullable.group({ id: [0], name: [''], email: [''], role: ['USER'] });

  save() {
    const value = this.form.getRawValue();
    const req = value.id ? this.api.updateUser(value.id, value) : this.api.saveUser(value);
    req.subscribe(() => this.users$ = this.api.users());
  }

  deactivate(id: number) { this.api.deactivateUser(id).subscribe(() => this.users$ = this.api.users()); }
}
