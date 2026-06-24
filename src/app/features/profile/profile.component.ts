import { Component, signal, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';

// Services
import { ApiServices } from '../../services/api/api.services';

// Utils
import { ToasterMessageUtils } from '../../utils/toaster-message/toaster-message.utils';

// Configs
import { API_CONFIG } from '../../core/config/api.config';

// Constants
import { PROFILE_CONST } from '../../core/constants/profile.constants';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  avtar: string | null;
}
@Component({
  selector: 'app-profile.component',
  imports: [CommonModule, ReactiveFormsModule],
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private apiService = inject(ApiServices);
  private toasterMessageService = inject(ToasterMessageUtils);

  loading = signal<boolean>(true);
  updating = signal<boolean>(false);
  showConfirm = signal<boolean>(false);
  imagePreview = signal<string | null>(null);
  selectedImage = signal<File | null>(null);

  form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: [{ value: '', disabled: true }],
    mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);

    this.apiService
      .get(`${API_CONFIG.PROFILE.FETCH}`, {})
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response: any) => {
          this.form.patchValue({
            firstName: response.body.firstName,
            lastName: response.body.lastName,
            email: response.body.email,
            mobile: response.body.mobile,
          });

          this.imagePreview.set(response.body.avatar);
        },
        error: (error) => {
          console.error(error);
        },
      });
  }

  selectImage(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) {
      return;
    }

    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      this.toasterMessageService.warning(`${PROFILE_CONST.TOASTER_MESSAGE.SELECT_IMAGE}`);
      input.value = '';

      return;
    }

    if (file.size > 1024 * 1024) {
      this.toasterMessageService.warning(`${PROFILE_CONST.TOASTER_MESSAGE.IMAGE_SIZE}`);
      input.value = '';
      return;
    }

    this.selectedImage.set(null);

    const reader = new FileReader();

    reader.onload = () => {
      this.imagePreview.set(reader.result as string);
    };

    reader.readAsDataURL(file);
  }

  update(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.showConfirm.set(true);
  }

  async confirmUpdate() {
    this.showConfirm.set(false);
    this.updating.set(true);

    const formData = new FormData();

    let avatar: string | null = null;

    formData.append('firstName', this.form.controls.firstName.value.trim());

    formData.append('lastName', this.form.controls.lastName.value.trim());

    formData.append('mobile', this.form.controls.mobile.value.trim());

    const image = this.selectedImage();

    if (image) {
      formData.append('avatar', image);
    }

    this.apiService
      .put(`${API_CONFIG.PROFILE.UPDATE}`, formData)
      .pipe(
        finalize(() => {
          this.updating.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.toasterMessageService.success(`${PROFILE_CONST.TOASTER_MESSAGE.UPDATE.SUCCESS}`);
          this.selectedImage.set(null);

          this.loadProfile();
        },

        error: (error) => {
          console.error(error);

          this.toasterMessageService.error(`${PROFILE_CONST.TOASTER_MESSAGE.UPDATE.FAILED}`);
        },
      });
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.readAsDataURL(file);

      reader.onload = () => resolve(reader.result as string);

      reader.onerror = (error) => reject(error);
    });
  }

  cancelUpdate(): void {
    this.showConfirm.set(false);
  }

  get firstName() {
    return this.form.controls.firstName;
  }

  get lastName() {
    return this.form.controls.lastName;
  }

  get email() {
    return this.form.controls.email;
  }

  get mobile() {
    return this.form.controls.mobile;
  }

  get avatarLetter(): string {
    const firstName = this.form.controls.firstName.value;

    if (!firstName) {
      return '?';
    }

    return firstName.charAt(0).toUpperCase();
  }
}
