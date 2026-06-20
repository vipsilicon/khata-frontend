import { Injectable, signal } from '@angular/core';

export type ToasterType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToasterType;
  duration: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToasterMessageUtils {
  toasts = signal<ToastMessage[]>([]);
  private add(message: string, type: ToasterType, duration = 2000) {
    const toast: ToastMessage = {
      id: Date.now().toString(),
      message,
      type,
      duration,
    };

    this.toasts.update((list) => [...list, toast]);

    setTimeout(() => {
      this.remove(toast.id);
    }, duration);
  }

  private remove(id: string) {
    this.toasts.update((list) => {
      return list.filter((toast) => toast.id !== id);
    });
  }

  success(message: string, duration = 2000) {
    this.add(message, 'success', duration);
  }

  error(message: string, duration = 2000) {
    this.add(message, 'error', duration);
  }

  warning(message: string, duration = 2000) {
    this.add(message, 'warning', duration);
  }

  info(message: string, duration = 2000) {
    this.add(message, 'info', duration);
  }
}
