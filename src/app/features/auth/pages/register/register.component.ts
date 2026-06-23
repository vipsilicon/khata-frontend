import { Component, inject, signal } from '@angular/core';
import { email, form, FormField, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

// Services
import { AuthServices } from '../../../../services/auth/auth.services';

// Utils
import { ToasterMessageUtils } from '../../../../utils/toaster-message/toaster-message.utils';

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
    required(schemapath.firstName, { message: 'First name is required' });
    required(schemapath.lastName, { message: 'Last name is required' });
    required(schemapath.mobile, { message: 'Mobile is required' });
    validate(schemapath.mobile, (ctx: any) => {
      const mobile = ctx.value()?.trim() ?? '';

      if (!/^[6-9]\d{9}$/.test(mobile)) {
        return {
          kind: 'error',
          message: 'Enter a valid 10-digit Indian mobile number',
        } as any;
      }
    });
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
    event.preventDefault();
    submit(this.registerForm, {
      action: async () => {
        const body = this.registerModal();

        this.authService.userRegister(body).subscribe({
          next: (response) => {
            if (response.statusCode === 201) {
              this.toasterMessageService.success('Register Successfully', 5000);
              this.router.navigate(['/auth/login']);
            }
          },
          error: (error) => {
            console.log(error);
            this.toasterMessageService.error('Registration Failed');
          },
        });
      },
    });
  }
}
