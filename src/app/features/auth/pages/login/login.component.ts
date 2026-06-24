import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

// Services
import { AuthServices } from '../../../../services/auth/auth.services';
import { AuthStorageServices } from '../../../../services/auth-storage/auth-storage.services';

// Utils
import { ToasterMessageUtils } from '../../../../utils/toaster-message/toaster-message.utils';

// Constants
import { AUTH_CONST } from '../../../../core/constants/auth.constants';
import { ROUTES_CONST } from '../../../../core/constants/routes.constants';

interface LoginData {
  email: string;
  password: string;
}

@Component({
  selector: 'app-login.component',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  imports: [FormField, RouterLink],
})
export class LoginComponent {
  private authService = inject(AuthServices);
  private toasterMessageService = inject(ToasterMessageUtils);
  private router = inject(Router);
  private authStorageServices = inject(AuthStorageServices);

  loginModal = signal<LoginData>({
    email: '',
    password: '',
  });

  loginForm = form(this.loginModal, (schemapath) => {
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
    submit(this.loginForm, {
      action: async () => {
        const body = this.loginModal();

        this.authService.userLogin(body).subscribe({
          next: (response) => {
            if (response.statusCode !== 200) {
              this.toasterMessageService.error(`${response.message}`, 3000);
              this.router.navigate(['auth/register']);
              this.toasterMessageService.info(
                `${AUTH_CONST.TOASTER_MESSAGE.LOGIN.PLEASE_REGISTER}`,
                6000,
              );
            } else {
              this.authStorageServices.saveTokens(
                response.body.accessToken,
                response.body.refreshToken,
              );
              const user = {
                firstName: response.body.firstName,
                lastName: response.body.lastName,
                email: response.body.email,
                mobile: response.body.mobile,
              };
              this.authStorageServices.saveUserDetails(JSON.stringify(user));
              this.toasterMessageService.success(
                `${AUTH_CONST.TOASTER_MESSAGE.LOGIN.SUCCESS}`,
                3000,
              );
              this.router.navigate([`${ROUTES_CONST.DASHBOARD.MAIN_PAGE}`]);
            }
          },
          error: (error) => {
            console.log(error);
            this.toasterMessageService.error(`${AUTH_CONST.TOASTER_MESSAGE.LOGIN.FAILED}`);
          },
        });
      },
    });
  }
}
