import { NgClass } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ConfirmModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

const SIZE_CLASS: Record<ConfirmModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
  full: 'max-w-[min(96rem,95vw)]',
};

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [NgClass],
  templateUrl: './confirm-modal.component.html',
  styleUrl: './confirm-modal.component.css',
})
export class ConfirmModalComponent {
  @Input() title = 'Confirmation';
  @Input() confirmButtonText = 'Confirm';
  @Input() cancelButtonText = 'Cancel';

  /**
   * Preset max width. Use `lg` / `xl` / `2xl` when content has 2+ columns.
   * Default `md` keeps existing single-column modals unchanged.
   */
  @Input() size: ConfirmModalSize = 'md';

  /**
   * Optional CSS max-width override (e.g. `40rem`, `720px`, `80vw`).
   * When set, takes priority over `size`.
   */
  @Input() maxWidth: string | null = null;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  get panelClass(): string {
    if (this.maxWidth) {
      return 'max-w-none';
    }
    return SIZE_CLASS[this.size] ?? SIZE_CLASS.md;
  }

  get panelStyle(): Record<string, string> | null {
    if (!this.maxWidth) {
      return null;
    }
    return { maxWidth: this.maxWidth };
  }

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
