import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

// Services
import { ApiServices } from '../../services/api/api.services';
import { ToasterMessageUtils } from '../../utils/toaster-message/toaster-message.utils';

// Config
import { API_CONFIG } from '../../core/config/api.config';

// Constants
import { TRANSACTIONS_CONST } from '../../core/constants/transactions.constants';

// Components
import { ConfirmModalComponent } from '../../components/confirm-modal/confirm-modal.component';
import { DataTableComponent } from '../../components/data-table/data-table.component';
import { DataTableColumn } from '../../components/data-table/data-table.types';
import { FormInputComponent } from '../../components/form-input/form-input.component';
import {
  FormSelectComponent,
  FormSelectOption,
} from '../../components/form-select/form-select.component';

// Utils
import {
  creditDebitBadgeClass,
  isNearBottom,
  nextSortState,
  sortRows,
  SortDir,
} from '../../utils/table.utils';

export interface Transaction {
  id: number;
  transactionType: string;
  paymentMode: string;
  purpose: string;
  amount: string;
  transactionDateTime: string;
  categoryName: string;
  subCategoryName: string;
  payeeId: number | null;
  payeeName: string;
  payeeCategory: string;
  createdAt: string;
  updatedAt: string;
}

type SortKey = keyof Transaction;

@Component({
  selector: 'app-transactions.components',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConfirmModalComponent,
    DataTableComponent,
    FormInputComponent,
    FormSelectComponent,
  ],
  templateUrl: './transactions.components.html',
  styleUrl: './transactions.components.css',
})
export class TransactionsComponents implements OnInit {
  private apiService = inject(ApiServices);
  private toasterMessageService = inject(ToasterMessageUtils);
  private fb = inject(FormBuilder);

  readonly TX_C = TRANSACTIONS_CONST;
  readonly limit = 10;

  readonly transactionTypeOptions: FormSelectOption[] = [
    { value: 'CREDIT', label: 'CREDIT' },
    { value: 'DEBIT', label: 'DEBIT' },
  ];

  readonly paymentModeOptions: FormSelectOption[] = [
    { value: 'BANK', label: 'BANK' },
    { value: 'CASH', label: 'CASH' },
  ];

  readonly columns: DataTableColumn<Transaction>[] = [
    { key: 'transactionDateTime', label: 'Date & Time', type: 'date', sortable: true },
    {
      key: 'transactionType',
      label: 'Type',
      type: 'badge',
      sortable: true,
      badgeClass: (value) => creditDebitBadgeClass(String(value ?? '')),
    },
    { key: 'paymentMode', label: 'Payment Mode', type: 'text', sortable: true },
    { key: 'purpose', label: 'Purpose', type: 'text', sortable: true },
    { key: 'categoryName', label: 'Category', type: 'text', sortable: true },
    { key: 'subCategoryName', label: 'Sub Category', type: 'text', sortable: true },
    { key: 'payeeName', label: 'Payee', type: 'text', sortable: true, emptyValue: '—' },
    { key: 'payeeCategory', label: 'Payee Category', type: 'text', sortable: true, emptyValue: '—' },
    { key: 'amount', label: 'Amount', type: 'currency', sortable: true },
    { key: 'actions', label: 'Action', type: 'actions', align: 'center' },
  ];

  transactions = signal<Transaction[]>([]);
  loading = signal(false);
  loadingMore = signal(false);
  saving = signal(false);
  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  showEditModal = signal(false);
  showDeleteModal = signal(false);
  editTransaction = signal<Transaction | null>(null);
  deleteTransaction = signal<Transaction | null>(null);
  sortKey = signal<SortKey>('transactionDateTime');
  sortDir = signal<SortDir>('desc');

  editForm = this.fb.nonNullable.group({
    transactionDateTime: ['', Validators.required],
    transactionType: ['', Validators.required],
    paymentMode: ['', Validators.required],
    purpose: ['', Validators.required],
    categoryName: ['', Validators.required],
    subCategoryName: [''],
    payeeName: [''],
    payeeCategory: [''],
    amount: [0, [Validators.required, Validators.min(0)]],
  });

  sortedTransactions = computed(() =>
    sortRows(this.transactions(), this.sortKey(), this.sortDir()),
  );

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
            payeeId: item.payeeId ?? null,
            payeeName: item.payeeName ?? '',
            payeeCategory: item.payeeCategory ?? '',
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));

          this.transactions.update((prev) => (reset ? data : [...prev, ...data]));
          this.total.set(body.total ?? data.length);
          this.lastPage.set(body.lastPage ?? 1);
        },
        error: () => {
          this.toasterMessageService.error('Failed to load transactions');
        },
      });
  }

  onScroll(event: Event): void {
    if (isNearBottom(event.target as HTMLElement)) {
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

  toggleSort(key: string): void {
    const next = nextSortState(this.sortKey(), this.sortDir(), key);
    this.sortKey.set(next.key as SortKey);
    this.sortDir.set(next.dir);
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
      payeeName: tx.payeeName ?? '',
      payeeCategory: tx.payeeCategory ?? '',
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
      payeeName: formValue.payeeName,
      payeeCategory: formValue.payeeCategory,
      amount: Number(formValue.amount).toFixed(2),
    };

    this.transactions.update((list) =>
      list.map((item) => (item.id === current.id ? updated : item)),
    );

    this.toasterMessageService.success('Transaction updated');
    this.cancelEditModal();
  }

  onDeleteTransaction(tx: Transaction): void {
    this.deleteTransaction.set(tx);
    this.showDeleteModal.set(true);
  }

  cancelDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteTransaction.set(null);
  }

  confirmDeleteModal(): void {
    const current = this.deleteTransaction();
    if (!current || this.saving()) {
      return;
    }

    this.saving.set(true);

    this.apiService
      .delete(`${API_CONFIG.TRANSACTION.DELETE}/${current.id}`)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.transactions.update((list) => list.filter((item) => item.id !== current.id));
          this.total.update((t) => Math.max(0, t - 1));
          this.toasterMessageService.success(this.TX_C.TOASTER_MESSAGE.DELETE.SUCCESS);
          this.cancelDeleteModal();
        },
        error: () => {
          this.toasterMessageService.error(this.TX_C.TOASTER_MESSAGE.DELETE.FAILED);
        },
      });
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
