import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

// Services
import { AuthServices } from '../../../../services/auth/auth.services';

// Utils
import { ToasterMessageUtils } from '../../../../utils/toaster-message/toaster-message.utils';

interface ResetPasswordData {
  email: string;
  password: string;
}

interface OtpData {
  otp: string;
}

@Component({
  selector: 'app-forget-password.component',
  imports: [FormField, RouterLink],
  standalone: true,
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.css',
})
export class ForgetPasswordComponent {
  private authService = inject(AuthServices);
  private toasterMessageService = inject(ToasterMessageUtils);
  private router = inject(Router);

  resetPasswordModal = signal<ResetPasswordData>({
    email: '',
    password: '',
  });

  otpModal = signal<OtpData>({
    otp: '',
  });

  isOtpGenerated = signal<boolean>(false);

  resetPasswordForm = form(this.resetPasswordModal, (schemapath) => {
    required(schemapath.email, { message: 'Email is required' });
    email(schemapath.email, { message: 'Enter a valid email' });
    required(schemapath.password, { message: 'Password is required' });
    validate(schemapath.password, (ctx: any) => {
      const len = ctx.value()?.length ?? 0;
      if (len < 6) {
        return { kind: 'error', message: 'Password must be at least 6 characters' } as any;
      }
    });
  });

  otpForm = form(this.otpModal, (schemaPath) => {
    required(schemaPath.otp, { message: 'Otp is required' });
    validate(schemaPath.otp, (ctx) => {
      const len = ctx.value()?.length ?? 0;
      if (len < 6) {
        return { kind: 'error', message: 'Otp must be at least 6 characters' } as any;
      }
    });
  });

  onSubmit(event: Event) {
    event.preventDefault();
    submit(this.resetPasswordForm, {
      action: async () => {
        const body = this.resetPasswordModal();

        this.authService.userLogin(body).subscribe({
          next: (response) => {
            if (response.statusCode !== 200) {
              this.toasterMessageService.error(`${response.message}`, 3000);
              this.router.navigate(['auth/register']);
              this.toasterMessageService.info('For log in, please register', 6000);
            } else {
              this.toasterMessageService.success('Reset Password Successfully', 3000);
              this.router.navigate(['/auth/login']);
            }
          },
          error: (error) => {
            console.log(error);
            this.toasterMessageService.error('Reset Password Failed');
          },
        });
      },
    });
  }

  generateOtp(event: Event) {
    event.preventDefault();
    this.isOtpGenerated.set(true);
    submit(this.otpForm, {
      action: async () => {},
    });
  }

  verifyOtp(event: Event) {
    event.preventDefault();
    submit(this.otpForm, {
      action: async () => {
        const body = this.otpModal();
      },
    });
  }
}
