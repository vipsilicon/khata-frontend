import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

// Services
import { AuthServices } from '../../../../services/auth/auth.services';

// Utils
import { ToasterMessageUtils } from '../../../../utils/toaster-message/toaster-message.utils';

// Constants
import { AUTH_CONST } from '../../../../core/constants/auth.constants';
import { ROUTES_CONST } from '../../../../core/constants/routes.constants';

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
    required(schemapath.email, { message: `${AUTH_CONST.MODAL.MESSAGES.EMAIL_REQUIRED}` });
    email(schemapath.email, { message: `${AUTH_CONST.MODAL.MESSAGES.VALID_EMAIL}` });
    required(schemapath.password, { message: `${AUTH_CONST.MODAL.MESSAGES.PASSWORD_REQUIRED}` });
    validate(schemapath.password, (ctx: any) => {
      const len = ctx.value()?.length ?? 0;
      if (len < 6) {
        return { kind: 'error', message: `${AUTH_CONST.MODAL.MESSAGES.PASSWORD_LENGTH}` } as any;
      }
    });
  });

  otpForm = form(this.otpModal, (schemaPath) => {
    required(schemaPath.otp, { message: `${AUTH_CONST.MODAL.MESSAGES.OTP_REQUIRED}` });
    validate(schemaPath.otp, (ctx) => {
      const len = ctx.value()?.length ?? 0;
      if (len < 6) {
        return { kind: 'error', message: `${AUTH_CONST.MODAL.MESSAGES.OTP_LENGTH}` } as any;
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
              this.toasterMessageService.info(
                `${AUTH_CONST.TOASTER_MESSAGE.FORGET_PASSWORD.PLEASE_REGISTER}`,
                6000,
              );
            } else {
              this.toasterMessageService.success(
                `${AUTH_CONST.TOASTER_MESSAGE.FORGET_PASSWORD.RESET_PASSWORD_SUCCESS}`,
                3000,
              );
              this.router.navigate([`${ROUTES_CONST.AUTH.LOGIN}`]);
            }
          },
          error: (error) => {
            console.log(error);
            this.toasterMessageService.error(
              `${AUTH_CONST.TOASTER_MESSAGE.FORGET_PASSWORD.RESET_PASSWORD_FAILED}`,
            );
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
