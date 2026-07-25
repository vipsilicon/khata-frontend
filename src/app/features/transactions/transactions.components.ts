import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  LucideAngularModule,
  SquarePen,
  Trash2,
} from 'lucide-angular';

// Services
import { ApiServices } from '../../services/api/api.services';
import { ToasterMessageUtils } from '../../utils/toaster-message/toaster-message.utils';

// Config
import { API_CONFIG } from '../../core/config/api.config';

// Components
import { ConfirmModalComponent } from '../../components/confirm-modal/confirm-modal.component';

export interface Transaction {
  id: number;
  transactionType: string;
  paymentMode: string;
  purpose: string;
  amount: string;
  transactionDateTime: string;
  categoryName: string;
  subCategoryName: string;
  productName: string;
  companyName: string;
  createdAt: string;
  updatedAt: string;
}

type SortKey = keyof Transaction;
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-transactions.components',
  imports: [CommonModule, LucideAngularModule, ReactiveFormsModule, ConfirmModalComponent],
  templateUrl: './transactions.components.html',
  styleUrl: './transactions.components.css',
})
export class TransactionsComponents implements OnInit {
  private apiService = inject(ApiServices);
  private toasterMessageService = inject(ToasterMessageUtils);
  private fb = inject(FormBuilder);

  readonly arrowUp = ArrowUp;
  readonly arrowDown = ArrowDown;
  readonly arrowUpDown = ArrowUpDown;
  readonly squarePen = SquarePen;
  readonly trash = Trash2;
  readonly limit = 10;

  transactions = signal<Transaction[]>([]);
  loading = signal<boolean>(false);
  loadingMore = signal<boolean>(false);
  page = signal<number>(1);
  lastPage = signal<number>(1);
  total = signal<number>(0);

  showEditModal = signal<boolean>(false);
  editTransaction = signal<Transaction | null>(null);

  sortKey = signal<SortKey>('transactionDateTime');
  sortDir = signal<SortDir>('desc');

  editForm = this.fb.nonNullable.group({
    transactionDateTime: ['', Validators.required],
    transactionType: ['', Validators.required],
    paymentMode: ['', Validators.required],
    purpose: ['', Validators.required],
    categoryName: ['', Validators.required],
    subCategoryName: [''],
    companyName: [''],
    productName: [''],
    amount: [0, [Validators.required, Validators.min(0)]],
  });

  sortedTransactions = computed(() => {
    const list = [...this.transactions()];
    const key = this.sortKey();
    const dir = this.sortDir();

    return list.sort((a, b) => {
      let av: string | number = a[key] ?? '';
      let bv: string | number = b[key] ?? '';

      if (key === 'amount' || key === 'id') {
        av = Number(av);
        bv = Number(bv);
      } else if (key === 'transactionDateTime' || key === 'createdAt' || key === 'updatedAt') {
        av = new Date(String(av)).getTime();
        bv = new Date(String(bv)).getTime();
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }

      if (av < bv) {
        return dir === 'asc' ? -1 : 1;
      }
      if (av > bv) {
        return dir === 'asc' ? 1 : -1;
      }
      return 0;
    });
  });

  hasMore = computed(() => this.page() < this.lastPage());

  ngOnInit(): void {
    this.loadTransactions(true);
  }

  loadTransactions(reset = false): void {
    if (this.loading() || this.loadingMore()) {
      return;
    }

    if (!reset && this.page() > this.lastPage()) {
      return;
    }

    if (reset) {
      this.page.set(1);
      this.loading.set(true);
    } else {
      this.loadingMore.set(true);
    }

    const currentPage = this.page();

    this.apiService
      .get(`${API_CONFIG.TRANSACTION.LIST}`, {
        page: currentPage,
        limit: this.limit,
      })
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loadingMore.set(false);
        }),
      )
      .subscribe({
        next: (response: any) => {
          const body = response?.body ?? {};
          const data: Transaction[] = (body.data ?? []).map((item: any) => ({
            id: item.id,
            transactionType: item.transactionType,
            paymentMode: item.paymentMode,
            purpose: item.purpose,
            amount: item.amount,
            transactionDateTime: item.transactionDateTime,
            categoryName: item.categoryName,
            subCategoryName: item.subCategoryName,
            productName: item.productName,
            companyName: item.companyName,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));

          if (reset) {
            this.transactions.set(data);
          } else {
            this.transactions.update((prev) => [...prev, ...data]);
          }

          this.total.set(body.total ?? data.length);
          this.lastPage.set(body.lastPage ?? 1);
        },
        error: () => {
          this.toasterMessageService.error('Failed to load transactions');
        },
      });
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const threshold = 80;

    if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
      this.loadMore();
    }
  }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) {
      return;
    }

    this.page.update((p) => p + 1);
    this.loadTransactions(false);
  }

  toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sortKey.set(key);
    this.sortDir.set('asc');
  }

  sortIcon(key: SortKey) {
    if (this.sortKey() !== key) {
      return this.arrowUpDown;
    }
    return this.sortDir() === 'asc' ? this.arrowUp : this.arrowDown;
  }

  typeBadgeClass(type: string): string {
    return type === 'CREDIT'
      ? 'bg-emerald-100 text-emerald-700'
      : type === 'DEBIT'
        ? 'bg-rose-100 text-rose-700'
        : 'bg-gray-100 text-gray-700';
  }

  onEditTransaction(tx: Transaction): void {
    this.editTransaction.set(tx);
    this.editForm.reset({
      transactionDateTime: this.toDateTimeLocal(tx.transactionDateTime),
      transactionType: tx.transactionType,
      paymentMode: tx.paymentMode,
      purpose: tx.purpose,
      categoryName: tx.categoryName,
      subCategoryName: tx.subCategoryName ?? '',
      companyName: tx.companyName ?? '',
      productName: tx.productName ?? '',
      amount: Number(tx.amount) || 0,
    });
    this.showEditModal.set(true);
  }

  cancelEditModal(): void {
    this.showEditModal.set(false);
    this.editTransaction.set(null);
    this.editForm.reset();
  }

  confirmEditModal(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.toasterMessageService.warning('Please fill in all required fields');
      return;
    }

    const current = this.editTransaction();
    if (!current) {
      return;
    }

    const formValue = this.editForm.getRawValue();
    const updated: Transaction = {
      ...current,
      transactionDateTime: this.fromDateTimeLocal(formValue.transactionDateTime),
      transactionType: formValue.transactionType,
      paymentMode: formValue.paymentMode,
      purpose: formValue.purpose,
      categoryName: formValue.categoryName,
      subCategoryName: formValue.subCategoryName,
      companyName: formValue.companyName,
      productName: formValue.productName,
      amount: Number(formValue.amount).toFixed(2),
    };

    // Local update until update API is available
    this.transactions.update((list) =>
      list.map((item) => (item.id === current.id ? updated : item)),
    );

    this.toasterMessageService.success('Transaction updated');
    this.cancelEditModal();
  }

  onDeleteTransaction(tx: Transaction): void {
    // Wire to delete flow when API/modal is ready
    console.log('Delete transaction', tx.id);
  }

  private toDateTimeLocal(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private fromDateTimeLocal(local: string): string {
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) {
      return local;
    }
    return d.toISOString();
  }
}
