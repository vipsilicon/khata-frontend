import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-form-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './form-input.component.html',
  styleUrl: './form-input.component.css',
})
export class FormInputComponent {
  /** Reactive form control bound to this field. */
  @Input({ required: true }) control!: FormControl<any>;

  @Input() label = '';
  @Input() type: 'text' | 'number' | 'email' | 'password' | 'datetime-local' | 'tel' = 'text';
  @Input() placeholder = '';
  @Input() min: string | number | null = null;
  @Input() max: string | number | null = null;
  @Input() step: string | number | null = null;

  /**
   * Map of validator key → message, e.g. `{ required: 'Name is required', min: '...' }`.
   * Shown when the control is touched and has that error.
   */
  @Input() errorMessages: Record<string, string> = {};

  /** Optional extra message (not from FormControl), e.g. empty list hint. */
  @Input() extraError: string | null = null;

  get errorEntries(): { key: string; message: string }[] {
    return Object.entries(this.errorMessages).map(([key, message]) => ({ key, message }));
  }

  hasVisibleError(): boolean {
    if (this.extraError) {
      return true;
    }
    if (!this.control?.touched || !this.control?.errors) {
      return false;
    }
    return this.errorEntries.some((e) => this.control.hasError(e.key));
  }
}
