import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, required, submit, validate } from '@angular/forms/signals';
import { AuthServices } from '../../../../services/auth/auth.services';
import { ToasterMessageUtils } from '../../../../utils/toaster-message/toaster-message.utils';
import { Router, RouterLink } from '@angular/router';
import { AuthStorageServices } from '../../../../services/auth-storage/auth-storage.services';

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

  onSubmit(event: Event) {
    console.log('clicked');
    event.preventDefault();
    submit(this.loginForm, {
      action: async () => {
        const body = this.loginModal();

        this.authService.userLogin(body).subscribe({
          next: (response) => {
            if (response.statusCode !== 200) {
              this.toasterMessageService.error(`${response.message}`, 3000);
              this.router.navigate(['auth/register']);
              this.toasterMessageService.info('For log in, please register', 6000);
            } else {
              // localStorage.setItem('accessToken', response.body.accessToken);
              // localStorage.setItem('refreshToken', response.body.refreshToken);
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
              // localStorage.setItem('user', JSON.stringify(user));
              this.authStorageServices.saveUserDetails(JSON.stringify(user));
              this.toasterMessageService.success('Login Successfully', 3000);
              this.router.navigate(['/dashboard']);
            }
          },
          error: (error) => {
            console.log(error);
            this.toasterMessageService.error('Login Failed');
          },
        });
      },
    });
  }
}
