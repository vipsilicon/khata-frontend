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

interface RegisterData {
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  password: string;
}

@Component({
  selector: 'app-register.component',
  imports: [FormField, RouterLink],
  standalone: true,
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private authService = inject(AuthServices);
  private toasterMessageService = inject(ToasterMessageUtils);
  private router = inject(Router);

  registerModal = signal<RegisterData>({
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    password: '',
  });

  registerForm = form(this.registerModal, (schemapath) => {
    required(schemapath.firstName, { message: `${AUTH_CONST.MODAL.MESSAGES.FIRST_NAME_REQUIRED}` });
    required(schemapath.lastName, { message: `${AUTH_CONST.MODAL.MESSAGES.LAST_NAME_REQUIRED}` });
    required(schemapath.mobile, { message: `${AUTH_CONST.MODAL.MESSAGES.MOBILE_REQUIRED}` });
    validate(schemapath.mobile, (ctx: any) => {
      const mobile = ctx.value()?.trim() ?? '';

      if (!/^[6-9]\d{9}$/.test(mobile)) {
        return {
          kind: 'error',
          message: `${AUTH_CONST.MODAL.MESSAGES.MOBILE_LENGTH}`,
        } as any;
      }
    });
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

  onSubmit(event: Event) {
    event.preventDefault();
    submit(this.registerForm, {
      action: async () => {
        const body = this.registerModal();

        this.authService.userRegister(body).subscribe({
          next: (response) => {
            if (response.statusCode === 201) {
              this.toasterMessageService.success(
                `${AUTH_CONST.TOASTER_MESSAGE.REGISTER.SUCCESS}`,
                5000,
              );
              this.router.navigate([`${ROUTES_CONST.AUTH.LOGIN}`]);
            }
          },
          error: (error) => {
            console.log(error);
            this.toasterMessageService.error(`${AUTH_CONST.TOASTER_MESSAGE.REGISTER.FAILED}`);
          },
        });
      },
    });
  }
}
