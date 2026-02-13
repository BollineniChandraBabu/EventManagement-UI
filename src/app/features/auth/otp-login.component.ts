import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './otp-login.component.html',
  styleUrl: './otp-login.component.css'
})
export class OtpLoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]], otp: ['', Validators.required] });

  sendOtp() { this.auth.sendOtp({ email: this.form.controls.email.value }).subscribe(); }
  verifyOtp() {
    this.auth.verifyOtp(this.form.getRawValue()).subscribe(() => this.router.navigate(['/dashboard']));
  }
}
