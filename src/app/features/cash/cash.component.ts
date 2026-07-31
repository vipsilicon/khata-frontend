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
import { CASH_CONST } from '../../core/constants/cash.constants';

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

export interface CashTransaction {
  id: number;
  referenceId: string;
  transactionType: string;
  amount: string;
  transactionDateTime: string;
  createdAt: string;
  updatedAt: string;
}

type SortKey = keyof CashTransaction;

@Component({
  selector: 'app-cash.component',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ConfirmModalComponent,
    DataTableComponent,
    FormInputComponent,
    FormSelectComponent,
  ],
  templateUrl: './cash.component.html',
  styleUrl: './cash.component.css',
})
export class CashComponent implements OnInit {
  private apiService = inject(ApiServices);
  private toasterMessageService = inject(ToasterMessageUtils);
  private fb = inject(FormBuilder);

  readonly CASH_C = CASH_CONST;
  readonly limit = 10;

  readonly transactionTypeOptions: FormSelectOption[] = [
    { value: 'CREDIT', label: 'CREDIT' },
    { value: 'DEBIT', label: 'DEBIT' },
  ];

  readonly columns: DataTableColumn<CashTransaction>[] = [
    { key: 'transactionDateTime', label: 'Date & Time', type: 'date', sortable: true },
    {
      key: 'transactionType',
      label: 'Type',
      type: 'badge',
      sortable: true,
      badgeClass: (value) => creditDebitBadgeClass(String(value ?? '')),
    },
    { key: 'amount', label: 'Amount', type: 'currency', sortable: true },
    { key: 'actions', label: 'Action', type: 'actions', align: 'center' },
  ];

  cashTransactions = signal<CashTransaction[]>([]);
  loading = signal(false);
  loadingMore = signal(false);
  saving = signal(false);
  page = signal(1);
  lastPage = signal(1);
  total = signal(0);
  sortKey = signal<SortKey>('transactionDateTime');
  sortDir = signal<SortDir>('desc');
  balance = signal(0);

  showEditModal = signal(false);
  showDeleteModal = signal(false);
  editTransaction = signal<CashTransaction | null>(null);
  deleteTransaction = signal<CashTransaction | null>(null);

  editForm = this.fb.nonNullable.group({
    transactionDateTime: ['', Validators.required],
    transactionType: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(0)]],
  });

  sortedCashTransactions = computed(() =>
    sortRows(this.cashTransactions(), this.sortKey(), this.sortDir()),
  );

  hasMore = computed(() => this.page() < this.lastPage());

  ngOnInit(): void {
    this.loadCashTransactions(true);
    this.loadCashTotal();
  }

  loadCashTotal(): void {
    this.apiService.get(`${API_CONFIG.CASH_TRANSACTION.TOTAL}`).subscribe({
      next: (response: any) => {
        this.balance.set(Number(response?.body?.amount ?? 0));
      },
      error: () => {},
    });
  }

  loadCashTransactions(reset = false): void {
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
      .get(`${API_CONFIG.CASH_TRANSACTION.LIST}`, {
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
          const data: CashTransaction[] = (body.data ?? []).map((item: any) => ({
            id: item.id,
            referenceId: item.referenceId,
            transactionType: item.transactionType,
            amount: item.amount,
            transactionDateTime: item.transactionDateTime,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));

          this.cashTransactions.update((prev) => (reset ? data : [...prev, ...data]));
          this.total.set(body.total ?? data.length);
          this.lastPage.set(body.lastPage ?? 1);
        },
        error: () => {
          this.toasterMessageService.error(this.CASH_C.TOASTER_MESSAGE.LOAD.FAILED);
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
    this.loadCashTransactions(false);
  }

  toggleSort(key: string): void {
    const next = nextSortState(this.sortKey(), this.sortDir(), key);
    this.sortKey.set(next.key as SortKey);
    this.sortDir.set(next.dir);
  }

  onEditCashTransaction(tx: CashTransaction): void {
    this.editTransaction.set(tx);
    this.editForm.reset({
      transactionDateTime: this.toDateTimeLocal(tx.transactionDateTime),
      transactionType: tx.transactionType,
      amount: Number(tx.amount) || 0,
    });
    this.showEditModal.set(true);
  }

  cancelEditModal(): void {
    this.showEditModal.set(false);
    this.editTransaction.set(null);
    this.editForm.reset({
      transactionDateTime: '',
      transactionType: '',
      amount: 0,
    });
  }

  confirmEditModal(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.toasterMessageService.warning(this.CASH_C.TOASTER_MESSAGE.REQUIRED_FIELD);
      return;
    }

    const current = this.editTransaction();
    if (!current || this.saving()) {
      return;
    }

    const formValue = this.editForm.getRawValue();
    const body = {
      id: current.id,
      transactionDateTime: this.fromDateTimeLocal(formValue.transactionDateTime),
      transactionType: formValue.transactionType,
      amount: Number(formValue.amount).toFixed(2),
    };

    this.saving.set(true);

    this.apiService
      .patch(`${API_CONFIG.CASH_TRANSACTION.UPDATE}/${current.id}`, body)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response: any) => {
          const updatedBody = response?.body ?? response ?? {};
          const updated: CashTransaction = {
            ...current,
            transactionDateTime: updatedBody.transactionDateTime ?? body.transactionDateTime,
            transactionType: updatedBody.transactionType ?? body.transactionType,
            amount: updatedBody.amount ?? body.amount,
          };

          this.cashTransactions.update((list) =>
            list.map((item) => (item.id === current.id ? updated : item)),
          );
          this.loadCashTotal();
          this.toasterMessageService.success(this.CASH_C.TOASTER_MESSAGE.UPDATE.SUCCESS);
          this.cancelEditModal();
        },
        error: () => {
          this.toasterMessageService.error(this.CASH_C.TOASTER_MESSAGE.UPDATE.FAILED);
        },
      });
  }

  onDeleteCashTransaction(tx: CashTransaction): void {
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
      .delete(`${API_CONFIG.CASH_TRANSACTION.DELETE}/${current.id}`)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.cashTransactions.update((list) => list.filter((item) => item.id !== current.id));
          this.total.update((t) => Math.max(0, t - 1));
          this.loadCashTotal();
          this.toasterMessageService.success(this.CASH_C.TOASTER_MESSAGE.DELETE.SUCCESS);
          this.cancelDeleteModal();
        },
        error: () => {
          this.toasterMessageService.error(this.CASH_C.TOASTER_MESSAGE.DELETE.FAILED);
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
