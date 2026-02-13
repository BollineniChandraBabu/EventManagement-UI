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
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
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
