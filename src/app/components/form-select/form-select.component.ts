import { Component, Input } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

export interface FormSelectOption {
  value: string | number | boolean | null;
  label: string;
  /** Optional stable track id; falls back to value. */
  id?: string | number;
}

@Component({
  selector: 'app-form-select',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './form-select.component.html',
  styleUrl: './form-select.component.css',
})
export class FormSelectComponent {
  /** Reactive form control bound to this field. */
  @Input({ required: true }) control!: FormControl<any>;

  @Input() label = '';
  /** Placeholder option label (e.g. "Select category"). */
  @Input() placeholder = '';
  /** Value used for the placeholder option. Default empty string. */
  @Input() emptyValue: string | number | null = '';
  @Input() options: FormSelectOption[] = [];

  /**
   * Map of validator key → message, e.g. `{ required: '...', min: '...' }`.
   */
  @Input() errorMessages: Record<string, string> = {};

  /** Optional extra message (not from FormControl). */
  @Input() extraError: string | null = null;

  get errorEntries(): { key: string; message: string }[] {
    return Object.entries(this.errorMessages).map(([key, message]) => ({ key, message }));
  }

  trackOption(opt: FormSelectOption): string | number {
    return opt.id ?? String(opt.value);
  }
}
